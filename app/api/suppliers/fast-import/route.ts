import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength)
}

function cleanMessage(value: unknown, maxLength: number) {
  return String(value || "")
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .slice(0, maxLength)
}

function normalizeUrl(value: unknown) {
  const raw = cleanText(value, 1200)
  if (!raw) return ""

  try {
    const url = new URL(raw)
    if (!["http:", "https:"].includes(url.protocol)) return ""
    return url.toString()
  } catch {
    return ""
  }
}

function getSource(url: string) {
  return url.includes("aliexpress.") ? "aliexpress" : "other"
}

function getExternalId(url: string) {
  const itemMatch = url.match(/\/item\/(\d+)\.html/i)
  if (itemMatch?.[1]) return itemMatch[1]

  try {
    const parsed = new URL(url)
    return parsed.searchParams.get("productId") || parsed.pathname.slice(0, 180)
  } catch {
    return ""
  }
}

function parseOptions(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function optionValue(options: any[], names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase())
  return (
    options.find((option) =>
      normalizedNames.some((name) =>
        String(option?.name || "").toLowerCase().includes(name)
      )
    )?.value || ""
  )
}

function variantLabel(variant: any) {
  const options = parseOptions(variant.selected_options)
  const label = options
    .map((option) => `${option.name}: ${option.value}`)
    .join(" · ")

  return label || variant.variant_title || "Variante fournisseur"
}

async function ensureFastImportTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS supplier_products (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_urls JSONB NOT NULL DEFAULT '[]',
      price TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'EUR',
      supplier_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      shopify_product_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS supplier_products_shop_source_unique
    ON supplier_products (shop, source, source_url)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS supplier_mappings (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      product_db_id INTEGER,
      shopify_product_id TEXT,
      product_handle TEXT NOT NULL,
      product_title TEXT NOT NULL,
      supplier_product_id INTEGER,
      supplier_name TEXT NOT NULL DEFAULT 'AliExpress',
      supplier_url TEXT NOT NULL,
      mapping_type TEXT NOT NULL DEFAULT 'standard',
      variant_label TEXT NOT NULL DEFAULT '',
      country_scope TEXT NOT NULL DEFAULT 'France / Europe',
      supplier_message TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      priority INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS supplier_variant_mappings (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      supplier_mapping_id INTEGER,
      product_db_id INTEGER,
      shopify_product_id TEXT NOT NULL,
      shopify_variant_id TEXT NOT NULL,
      shopify_variant_title TEXT NOT NULL DEFAULT '',
      supplier_variant_label TEXT NOT NULL DEFAULT '',
      supplier_color TEXT NOT NULL DEFAULT '',
      supplier_size TEXT NOT NULL DEFAULT '',
      supplier_shape TEXT NOT NULL DEFAULT '',
      supplier_sku TEXT NOT NULL DEFAULT '',
      supplier_price TEXT NOT NULL DEFAULT '',
      supplier_image_url TEXT NOT NULL DEFAULT '',
      supplier_note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function POST(request: Request) {
  try {
    await ensureFastImportTables()
    const body = await request.json()
    const productId = Number(body.product_id || 0)
    const supplierUrl = normalizeUrl(body.supplier_url)
    const supplierName = cleanText(body.supplier_name, 120) || "AliExpress"
    const supplierTitle = cleanText(body.supplier_title, 240)
    const supplierMessage = cleanMessage(body.supplier_message, 1800)

    if (!productId || !supplierUrl) {
      return NextResponse.json(
        { success: false, error: "Choisis un produit Shopify et colle un lien fournisseur." },
        { status: 400 }
      )
    }

    const productResult = await sql`
      SELECT id, shopify_product_id, title, handle
      FROM products
      WHERE id = ${productId} AND shop = ${SHOP}
      LIMIT 1
    `
    const product = productResult.rows[0]
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produit Shopify introuvable. Synchronise d'abord les produits." },
        { status: 404 }
      )
    }

    const variantsResult = await sql`
      SELECT *
      FROM product_variants
      WHERE shop = ${SHOP} AND product_db_id = ${product.id}
      ORDER BY variant_title ASC
      LIMIT 200
    `
    const variants = variantsResult.rows

    const source = getSource(supplierUrl)
    const supplierProduct = await sql`
      INSERT INTO supplier_products (
        shop,
        source,
        source_url,
        external_id,
        title,
        supplier_name,
        status,
        shopify_product_id,
        updated_at
      )
      VALUES (
        ${SHOP},
        ${source},
        ${supplierUrl},
        ${cleanText(getExternalId(supplierUrl), 180)},
        ${supplierTitle || product.title},
        ${supplierName},
        'mapped',
        ${product.shopify_product_id},
        NOW()
      )
      ON CONFLICT (shop, source, source_url)
      DO UPDATE SET
        title = EXCLUDED.title,
        supplier_name = EXCLUDED.supplier_name,
        status = 'mapped',
        shopify_product_id = EXCLUDED.shopify_product_id,
        updated_at = NOW()
      RETURNING id
    `

    const mapping = await sql`
      INSERT INTO supplier_mappings (
        shop,
        product_db_id,
        shopify_product_id,
        product_handle,
        product_title,
        supplier_product_id,
        supplier_name,
        supplier_url,
        mapping_type,
        variant_label,
        country_scope,
        supplier_message,
        notes,
        status,
        priority,
        updated_at
      )
      VALUES (
        ${SHOP},
        ${product.id},
        ${product.shopify_product_id},
        ${product.handle},
        ${product.title},
        ${supplierProduct.rows[0].id},
        ${supplierName},
        ${supplierUrl},
        'standard',
        'Mapping express',
        'France / Europe',
        ${supplierMessage},
        'Créé avec Import express : variantes Shopify pré-remplies pour accélérer le mapping.',
        'active',
        1,
        NOW()
      )
      RETURNING *
    `

    for (const variant of variants) {
      const options = parseOptions(variant.selected_options)
      const color = cleanText(optionValue(options, ["couleur", "color"]), 120)
      const size = cleanText(optionValue(options, ["taille", "size"]), 120)
      const shape = cleanText(optionValue(options, ["modèle", "modele", "model", "variant", "pack", "forme"]), 120)
      const label = cleanText(variantLabel(variant), 180)

      await sql`
        INSERT INTO supplier_variant_mappings (
          shop,
          supplier_mapping_id,
          product_db_id,
          shopify_product_id,
          shopify_variant_id,
          shopify_variant_title,
          supplier_variant_label,
          supplier_color,
          supplier_size,
          supplier_shape,
          supplier_sku,
          supplier_price,
          supplier_image_url,
          supplier_note,
          status,
          updated_at
        )
        VALUES (
          ${SHOP},
          ${mapping.rows[0].id},
          ${product.id},
          ${product.shopify_product_id},
          ${variant.shopify_variant_id},
          ${variant.variant_title},
          ${label},
          ${color},
          ${size},
          ${shape},
          ${variant.sku || ""},
          ${variant.price || ""},
          ${variant.image_url || ""},
          'Pré-rempli depuis Shopify. À vérifier avec la fiche fournisseur.',
          'active',
          NOW()
        )
      `
    }

    return NextResponse.json({
      success: true,
      mapping: mapping.rows[0],
      variants_created: variants.length,
      message:
        "Import express terminé. Les variantes sont pré-remplies depuis Shopify : vérifie seulement les correspondances fournisseur.",
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
