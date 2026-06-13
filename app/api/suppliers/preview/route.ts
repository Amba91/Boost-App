import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { scrapeAliExpressProductWithApify } from "../../../../lib/scraper-engine/apify-aliexpress-product"
import { scrapeAliExpressProductWithOxylabs } from "../../../../lib/scraper-engine/oxylabs-aliexpress-product"

export const maxDuration = 300

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
  variants: SupplierVariant[]
  connector_note?: string
}

type SupplierVariant = {
  id: string
  label: string
  color: string
  size: string
  shape: string
  sku: string
  price: string
  image_url: string
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

function normalizeImageUrl(value: unknown) {
  const raw = decodeHtml(String(value || ""))
    .replace(/\\u002F/g, "/")
    .replace(/\\/g, "")
    .trim()

  if (!raw) return ""
  if (raw.startsWith("//")) return `https:${raw}`
  if (raw.startsWith("http")) return raw
  return ""
}

function extractJsonBlocks(html: string) {
  const blocks: string[] = []
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const dataRegex =
    /window\.(?:runParams|__INIT_DATA__|__AER_DATA__|__INITIAL_STATE__)\s*=\s*({[\s\S]*?});/gi
  let match

  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1]) blocks.push(match[1].trim())
  }

  while ((match = dataRegex.exec(html)) !== null) {
    if (match[1]) blocks.push(match[1].trim())
  }

  return blocks
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = cleanText(value, 180)
    if (text) return text
  }
  return ""
}

function imageFromNode(node: Record<string, any>) {
  return normalizeImageUrl(
    node.skuPropertyImagePath ||
      node.propertyValueImage ||
      node.propertyValueImageUrl ||
      node.imageUrl ||
      node.imgUrl ||
      node.url ||
      node.src
  )
}

function labelFromNode(node: Record<string, any>) {
  return firstString(
    node.propertyValueDisplayName,
    node.skuPropertyValueName,
    node.propertyValueName,
    node.displayName,
    node.name,
    node.value,
    node.text
  )
}

function extractSupplierVariantsFromObject(root: unknown) {
  const variants = new Map<string, SupplierVariant>()

  function addVariant(node: Record<string, any>, parentName = "") {
    const label = labelFromNode(node)
    const imageUrl = imageFromNode(node)
    const sku = firstString(node.skuId, node.skuAttr, node.skuCode, node.id)
    const price = firstString(
      node.salePrice?.formattedPrice,
      node.salePrice,
      node.price,
      node.priceText,
      node.formattedPrice
    )

    if (!label && !imageUrl) return
    if (
      !imageUrl &&
      !parentName.toLowerCase().includes("color") &&
      !parentName.toLowerCase().includes("couleur") &&
      label.length < 2
    ) {
      return
    }

    const id = sku || `${parentName}-${label}-${imageUrl}` || String(variants.size + 1)
    variants.set(id, {
      id,
      label: label || parentName || "Variante fournisseur",
      color:
        parentName.toLowerCase().includes("color") ||
        parentName.toLowerCase().includes("couleur")
          ? label
          : "",
      size:
        parentName.toLowerCase().includes("size") ||
        parentName.toLowerCase().includes("taille")
          ? label
          : "",
      shape:
        !parentName.toLowerCase().includes("color") &&
        !parentName.toLowerCase().includes("couleur") &&
        !parentName.toLowerCase().includes("size") &&
        !parentName.toLowerCase().includes("taille")
          ? label
          : "",
      sku,
      price,
      image_url: imageUrl,
    })
  }

  function walk(node: any, parentName = "") {
    if (!node) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parentName)
      return
    }
    if (typeof node !== "object") return

    const propertyName = firstString(
      node.skuPropertyName,
      node.propertyName,
      node.name,
      parentName
    )

    if (Array.isArray(node.skuPropertyValues)) {
      for (const value of node.skuPropertyValues) {
        if (value && typeof value === "object") addVariant(value, propertyName)
      }
    }

    if (Array.isArray(node.propertyValueList)) {
      for (const value of node.propertyValueList) {
        if (value && typeof value === "object") addVariant(value, propertyName)
      }
    }

    if (
      node.skuPropertyValueName ||
      node.propertyValueDisplayName ||
      node.propertyValueName ||
      node.skuPropertyImagePath ||
      node.propertyValueImageUrl
    ) {
      addVariant(node, parentName)
    }

    for (const key of Object.keys(node)) {
      walk(node[key], propertyName || parentName)
    }
  }

  walk(root)

  return Array.from(variants.values()).slice(0, 80)
}

function extractSupplierVariants(html: string) {
  const variants: SupplierVariant[] = []

  for (const block of extractJsonBlocks(html)) {
    const parsed = safeJsonParse(block)
    if (!parsed) continue
    variants.push(...extractSupplierVariantsFromObject(parsed))
  }

  if (variants.length > 0) {
    const seen = new Set<string>()
    return variants.filter((variant) => {
      const key = `${variant.label}-${variant.image_url}-${variant.sku}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const propertyRegex =
    /"propertyValueDisplayName"\s*:\s*"([^"]+)"[\s\S]{0,500}?"skuPropertyImagePath"\s*:\s*"([^"]+)"/gi
  let match
  while ((match = propertyRegex.exec(html)) !== null) {
    const label = decodeHtml(match[1])
    const imageUrl = normalizeImageUrl(match[2])
    variants.push({
      id: `${label}-${imageUrl}`,
      label,
      color: label,
      size: "",
      shape: "",
      sku: "",
      price: "",
      image_url: imageUrl,
    })
  }

  return variants.slice(0, 80)
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
  const source = getSource(url)
  let connectorNote = ""

  if (source === "aliexpress") {
    try {
      const oxylabsProduct = await scrapeAliExpressProductWithOxylabs(url)

      if (
        oxylabsProduct &&
        (oxylabsProduct.title ||
          oxylabsProduct.image_urls.length > 0 ||
          oxylabsProduct.variants.length > 0)
      ) {
        return {
          source,
          source_url: url,
          external_id: cleanText(getExternalId(url), 180),
          title: oxylabsProduct.title || "Produit AliExpress à vérifier",
          description: oxylabsProduct.description,
          image_urls: oxylabsProduct.image_urls,
          price: oxylabsProduct.price,
          currency: oxylabsProduct.currency,
          supplier_name: oxylabsProduct.supplier_name,
          variants: oxylabsProduct.variants,
          connector_note:
            oxylabsProduct.debug_note ||
            `Oxylabs OK : ${oxylabsProduct.variants.length} variante(s) reçue(s).`,
        }
      }
      connectorNote = "Oxylabs a répondu, mais sans produit exploitable."
    } catch (error) {
      connectorNote = `Oxylabs non configuré ou non exploitable : ${String(error).slice(0, 220)}`
      // Apify prend le relais si Oxylabs n'est pas connecté ou ne renvoie pas les variantes.
    }

    try {
      const apifyProduct = await scrapeAliExpressProductWithApify(url)

      if (
        apifyProduct &&
        (apifyProduct.title ||
          apifyProduct.image_urls.length > 0 ||
          apifyProduct.variants.length > 0)
      ) {
        return {
          source,
          source_url: url,
          external_id: cleanText(getExternalId(url), 180),
          title: apifyProduct.title || "Produit AliExpress à vérifier",
          description: apifyProduct.description,
          image_urls: apifyProduct.image_urls,
          price: apifyProduct.price,
          currency: apifyProduct.currency,
          supplier_name: apifyProduct.supplier_name,
          variants: apifyProduct.variants,
          connector_note:
            apifyProduct.debug_note ||
            `Apify OK : ${apifyProduct.variants.length} variante(s) reçue(s).`,
        }
      }
      connectorNote = `${connectorNote} | Apify a répondu, mais sans produit exploitable.`
    } catch (error) {
      connectorNote = `${connectorNote} | Apify non exploitable : ${String(error).slice(0, 240)}`
      // L'ancien parseur HTML prend le relais si l'acteur choisi échoue.
    }
  }

  let html = ""

  try {
    html = await fetchProductHtml(url)
  } catch {
    return {
      source,
      source_url: url,
      external_id: cleanText(getExternalId(url), 180),
      title: source === "aliexpress" ? "Produit AliExpress à compléter" : "Produit fournisseur à compléter",
      description:
        "Le fournisseur bloque la lecture automatique. Le lien est enregistré pour permettre le mapping manuel.",
      image_urls: [],
      price: "",
      currency: "EUR",
      supplier_name: source === "aliexpress" ? "AliExpress" : "Fournisseur",
      variants: [],
      connector_note: connectorNote || "Lecture HTML bloquée par le fournisseur.",
    }
  }

  const title = cleanText(getTitleFromHtml(html), 240)
  const description = cleanText(
    getMeta(html, "og:description") || getMeta(html, "description"),
    800
  )
  const imageUrls = extractImages(html)
  const price = extractPrice(html)
  const variants = extractSupplierVariants(html)

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
    variants,
    connector_note:
      connectorNote ||
      (variants.length > 0
        ? `HTML OK : ${variants.length} variante(s) détectée(s).`
        : "Aucune variante détectée par Apify ni par la lecture HTML."),
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
      variants: product.variants,
      connector_note: product.connector_note || "",
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
