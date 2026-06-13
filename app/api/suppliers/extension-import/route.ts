import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"

type ExtensionVariant = {
  id?: string
  label?: string
  color?: string
  size?: string
  shape?: string
  sku?: string
  price?: string
  image_url?: string
  source?: string
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength)
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

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((image) => normalizeUrl(image))
        .filter((image) => image && /alicdn|aliexpress/i.test(image))
    )
  ).slice(0, 60)
}

function getSource(url: string) {
  return url.includes("aliexpress.") ? "aliexpress" : "other"
}

function getExternalId(url: string, fallback: unknown) {
  const itemMatch = url.match(/\/item\/(\d+)\.html/i)
  if (itemMatch?.[1]) return itemMatch[1]
  return cleanText(fallback, 180)
}

function normalizeVariant(value: unknown, index: number) {
  const variant = (value || {}) as ExtensionVariant
  const label = cleanText(variant.label, 180)
  const imageUrl = normalizeUrl(variant.image_url)

  if (!label && !imageUrl) return null

  return {
    external_id: cleanText(variant.id, 240) || `extension-${index + 1}`,
    label: label || `Variante ${index + 1}`,
    color: cleanText(variant.color, 120),
    size: cleanText(variant.size, 120),
    shape: cleanText(variant.shape, 120),
    sku: cleanText(variant.sku, 180),
    price: cleanText(variant.price, 80),
    image_url: imageUrl,
    source: cleanText(variant.source, 40) || "extension",
  }
}

async function ensureExtensionTables() {
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
    CREATE TABLE IF NOT EXISTS supplier_product_variants (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      supplier_product_id INTEGER NOT NULL,
      external_variant_id TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      shape TEXT NOT NULL DEFAULT '',
      sku TEXT NOT NULL DEFAULT '',
      price TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'extension',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS supplier_product_variants_product_idx
    ON supplier_product_variants (shop, supplier_product_id)
  `
}

export async function POST(request: Request) {
  try {
    await ensureExtensionTables()
    const body = await request.json()
    const sourceUrl = normalizeUrl(body.source_url)

    if (!sourceUrl || !sourceUrl.includes("aliexpress.")) {
      return NextResponse.json(
        { success: false, error: "Ouvre une vraie fiche produit AliExpress avant d'envoyer vers Boost." },
        { status: 400 }
      )
    }

    const imageUrls = normalizeImageUrls(body.image_urls)
    const variants = Array.isArray(body.variants)
      ? body.variants.map(normalizeVariant).filter(Boolean)
      : []

    const product = await sql`
      INSERT INTO supplier_products (
        shop,
        source,
        source_url,
        external_id,
        title,
        description,
        image_urls,
        price,
        currency,
        supplier_name,
        status,
        updated_at
      )
      VALUES (
        ${SHOP},
        ${getSource(sourceUrl)},
        ${sourceUrl},
        ${getExternalId(sourceUrl, body.external_id)},
        ${cleanText(body.title, 260) || "Produit AliExpress importé par extension"},
        ${cleanText(body.description, 1200)},
        ${JSON.stringify(imageUrls)}::jsonb,
        ${cleanText(body.price, 80)},
        ${cleanText(body.currency, 12) || "EUR"},
        ${cleanText(body.supplier_name, 120) || "AliExpress"},
        'extension_imported',
        NOW()
      )
      ON CONFLICT (shop, source, source_url)
      DO UPDATE SET
        external_id = EXCLUDED.external_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        image_urls = EXCLUDED.image_urls,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        supplier_name = EXCLUDED.supplier_name,
        status = 'extension_imported',
        updated_at = NOW()
      RETURNING *
    `

    const supplierProductId = product.rows[0].id

    await sql`
      DELETE FROM supplier_product_variants
      WHERE shop = ${SHOP} AND supplier_product_id = ${supplierProductId}
    `

    for (const variant of variants) {
      await sql`
        INSERT INTO supplier_product_variants (
          shop,
          supplier_product_id,
          external_variant_id,
          label,
          color,
          size,
          shape,
          sku,
          price,
          image_url,
          source,
          updated_at
        )
        VALUES (
          ${SHOP},
          ${supplierProductId},
          ${variant.external_id},
          ${variant.label},
          ${variant.color},
          ${variant.size},
          ${variant.shape},
          ${variant.sku},
          ${variant.price},
          ${variant.image_url},
          ${variant.source},
          NOW()
        )
      `
    }

    return NextResponse.json({
      success: true,
      product: product.rows[0],
      variants_count: variants.length,
      images_count: imageUrls.length,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureExtensionTables()
    const body = await request.json().catch(() => ({}))
    const sourceUrl = normalizeUrl(body.source_url)

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, error: "Lien fournisseur manquant." },
        { status: 400 }
      )
    }

    const product = await sql`
      SELECT id
      FROM supplier_products
      WHERE shop = ${SHOP} AND source_url = ${sourceUrl}
      LIMIT 1
    `

    const supplierProductId = product.rows[0]?.id

    if (supplierProductId) {
      await sql`
        DELETE FROM supplier_product_variants
        WHERE shop = ${SHOP} AND supplier_product_id = ${supplierProductId}
      `

      await sql`
        DELETE FROM supplier_products
        WHERE shop = ${SHOP} AND id = ${supplierProductId}
      `
    }

    return NextResponse.json({ success: true, deleted: Boolean(supplierProductId) })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
