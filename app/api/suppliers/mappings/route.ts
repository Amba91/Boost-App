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

function supplierMessage(customMessage: unknown) {
  return cleanMessage(
    customMessage ||
      "ALIEXPRESS STANDARD SHIPPING\n\n***VERY IMPORTANT***\nPLEASE DO NOT JOIN ANY INVOICE, PRICE TAG & PROMOTIONS IN THE PACKET!\nTHIS IS A DROPSHIP FOR A CUSTOMER.\nTHANK YOU VERY MUCH.\n\nPS : PLEASE PUT « Kiidiiz » AS SENDER\n\nTHANKS MY FRIENDS.",
    1200
  )
}

async function ensureSupplierTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS product_variants (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      product_db_id INTEGER,
      shopify_product_id TEXT NOT NULL,
      shopify_variant_id TEXT NOT NULL UNIQUE,
      product_title TEXT NOT NULL,
      product_handle TEXT NOT NULL,
      variant_title TEXT NOT NULL,
      sku TEXT NOT NULL DEFAULT '',
      selected_options JSONB NOT NULL DEFAULT '[]',
      image_url TEXT NOT NULL DEFAULT '',
      price TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

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

export async function GET() {
  try {
    await ensureSupplierTables()

    const products = await sql`
      SELECT id, shopify_product_id, title, handle, image_url, price, status
      FROM products
      WHERE shop = ${SHOP}
      ORDER BY title ASC
      LIMIT 200
    `

    const supplierProducts = await sql`
      SELECT *
      FROM supplier_products
      WHERE shop = ${SHOP}
      ORDER BY updated_at DESC
      LIMIT 80
    `

    const mappings = await sql`
      SELECT *
      FROM supplier_mappings
      WHERE shop = ${SHOP}
      ORDER BY priority ASC, updated_at DESC
      LIMIT 120
    `

    const variants = await sql`
      SELECT *
      FROM product_variants
      WHERE shop = ${SHOP}
      ORDER BY product_title ASC, variant_title ASC
      LIMIT 2000
    `

    const variantMappings = await sql`
      SELECT *
      FROM supplier_variant_mappings
      WHERE shop = ${SHOP}
      ORDER BY updated_at DESC
      LIMIT 2000
    `

    return NextResponse.json({
      success: true,
      products: products.rows,
      variants: variants.rows,
      supplier_products: supplierProducts.rows,
      mappings: mappings.rows,
      variant_mappings: variantMappings.rows,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        products: [],
        variants: [],
        supplier_products: [],
        mappings: [],
        variant_mappings: [],
        error: String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await ensureSupplierTables()
    const body = await request.json()

    const productId = Number(body.product_id || 0)
    const supplierUrl = normalizeUrl(body.supplier_url)
    const mappingType = cleanText(body.mapping_type, 40) || "standard"
    const variantLabel = cleanText(body.variant_label, 120)
    const supplierName = cleanText(body.supplier_name, 120) || "AliExpress"
    const countryScope = cleanText(body.country_scope, 120) || "France / Europe"
    const notes = cleanText(body.notes, 600)
    const variantMappings = Array.isArray(body.variant_mappings)
      ? body.variant_mappings
      : []

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

    const source = getSource(supplierUrl)
    const supplierProduct = await sql`
      INSERT INTO supplier_products (
        shop,
        source,
        source_url,
        external_id,
        title,
        description,
        image_urls,
        supplier_name,
        status,
        updated_at
      )
      VALUES (
        ${SHOP},
        ${source},
        ${supplierUrl},
        ${cleanText(getExternalId(supplierUrl), 180)},
        ${cleanText(body.supplier_title, 240) || "Produit fournisseur mappé"},
        ${notes},
        '[]'::jsonb,
        ${supplierName},
        'mapped',
        NOW()
      )
      ON CONFLICT (shop, source, source_url)
      DO UPDATE SET
        supplier_name = EXCLUDED.supplier_name,
        status = 'mapped',
        updated_at = NOW()
      RETURNING id
    `

    const message = supplierMessage(body.supplier_message)

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
        ${mappingType},
        ${variantLabel},
        ${countryScope},
        ${message},
        ${notes},
        'active',
        ${Number(body.priority || 1)},
        NOW()
      )
      RETURNING *
    `

    for (const variantMapping of variantMappings) {
      const shopifyVariantId = cleanText(variantMapping.shopify_variant_id, 220)
      if (!shopifyVariantId) continue

      const shopifyVariant = await sql`
        SELECT shopify_variant_id, variant_title
        FROM product_variants
        WHERE shop = ${SHOP}
          AND product_db_id = ${product.id}
          AND shopify_variant_id = ${shopifyVariantId}
        LIMIT 1
      `

      const variant = shopifyVariant.rows[0]
      if (!variant) continue

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
          ${cleanText(variantMapping.supplier_variant_label, 180)},
          ${cleanText(variantMapping.supplier_color, 120)},
          ${cleanText(variantMapping.supplier_size, 120)},
          ${cleanText(variantMapping.supplier_shape, 120)},
          ${cleanText(variantMapping.supplier_sku, 160)},
          ${cleanText(variantMapping.supplier_price, 80)},
          ${cleanText(variantMapping.supplier_image_url, 500)},
          ${cleanText(variantMapping.supplier_note, 300)},
          'active',
          NOW()
        )
      `
    }

    return NextResponse.json({
      success: true,
      mapping: mapping.rows[0],
      message,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
