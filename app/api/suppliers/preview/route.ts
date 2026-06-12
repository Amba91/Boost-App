import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"

type SupplierProduct = {
  source: "aliexpress" | "other"
  source_url: string
  external_id: string
  title: string
  description: string
  image_urls: string[]
  price: string
  currency: string
  supplier_name: string
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

function getSource(url: string): SupplierProduct["source"] {
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

async function ensureSupplierProductsTable() {
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
}

async function fetchProductHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Lecture fournisseur impossible : ${response.status}`)
  }

  return response.text()
}

function getMeta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "i"),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1])
  }

  return ""
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}

function getTitleFromHtml(html: string) {
  const ogTitle = getMeta(html, "og:title") || getMeta(html, "twitter:title")
  if (ogTitle) return ogTitle

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return titleMatch?.[1] ? decodeHtml(titleMatch[1]) : ""
}

function extractImages(html: string) {
  const images = new Set<string>()
  const metaImage = getMeta(html, "og:image") || getMeta(html, "twitter:image")
  if (metaImage) images.add(metaImage)

  const imageMatches = html.match(/https?:\/\/[^"'\\\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s]*)?/gi) || []
  for (const image of imageMatches.slice(0, 40)) {
    const clean = image.replace(/\\u002F/g, "/")
    if (clean.includes("alicdn") || clean.includes("aliexpress")) images.add(clean)
  }

  return Array.from(images).slice(0, 8)
}

function extractPrice(html: string) {
  const metaPrice = getMeta(html, "product:price:amount") || getMeta(html, "og:price:amount")
  if (metaPrice) return cleanText(metaPrice, 40)

  const priceMatch =
    html.match(/"salePrice"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i) ||
    html.match(/"formattedPrice"\s*:\s*"([^"]+)"/i) ||
    html.match(/"price"\s*:\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i)

  return priceMatch?.[1] ? cleanText(priceMatch[1], 40) : ""
}

async function scrapeSupplierProduct(url: string): Promise<SupplierProduct> {
  const html = await fetchProductHtml(url)
  const source = getSource(url)
  const title = cleanText(getTitleFromHtml(html), 240)
  const description = cleanText(
    getMeta(html, "og:description") || getMeta(html, "description"),
    800
  )
  const imageUrls = extractImages(html)
  const price = extractPrice(html)

  return {
    source,
    source_url: url,
    external_id: cleanText(getExternalId(url), 180),
    title: title || "Produit fournisseur à vérifier",
    description,
    image_urls: imageUrls,
    price,
    currency: getMeta(html, "product:price:currency") || "EUR",
    supplier_name: source === "aliexpress" ? "AliExpress" : "Fournisseur",
  }
}

export async function POST(request: Request) {
  try {
    await ensureSupplierProductsTable()
    const body = await request.json()
    const url = normalizeUrl(body.url)

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Lien fournisseur invalide." },
        { status: 400 }
      )
    }

    const product = await scrapeSupplierProduct(url)

    const result = await sql`
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
        ${product.source},
        ${product.source_url},
        ${product.external_id},
        ${product.title},
        ${product.description},
        ${JSON.stringify(product.image_urls)}::jsonb,
        ${product.price},
        ${product.currency},
        ${product.supplier_name},
        'previewed',
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
        status = 'previewed',
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      product: result.rows[0],
      next_step:
        "Prévisualisation enregistrée. La création Shopify sera branchée à l’étape suivante.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    await ensureSupplierProductsTable()
    const result = await sql`
      SELECT *
      FROM supplier_products
      WHERE shop = ${SHOP}
      ORDER BY updated_at DESC
      LIMIT 30
    `

    return NextResponse.json({
      success: true,
      products: result.rows,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, products: [], error: String(error) },
      { status: 500 }
    )
  }
}
