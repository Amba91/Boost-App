export type OxylabsSupplierVariant = {
  id: string
  label: string
  color: string
  size: string
  shape: string
  sku: string
  price: string
  image_url: string
}

export type OxylabsSupplierProduct = {
  title: string
  description: string
  image_urls: string[]
  price: string
  currency: string
  supplier_name: string
  variants: OxylabsSupplierVariant[]
  debug_note?: string
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength)
}

function normalizeImageUrl(value: unknown) {
  const raw = String(value || "")
    .replace(/\\u002F/g, "/")
    .replace(/\\/g, "")
    .trim()

  if (!raw) return ""
  if (raw.startsWith("//")) return `https:${raw}`
  if (raw.startsWith("http")) return raw
  return ""
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = cleanText(value, 300)
    if (text) return text
  }
  return ""
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function looseValue(node: Record<string, any>, ...keys: string[]) {
  const wanted = new Set(keys.map(normalizeKey))

  for (const [key, value] of Object.entries(node)) {
    if (wanted.has(normalizeKey(key))) return value
  }

  return undefined
}

function looseText(node: Record<string, any>, ...keys: string[]) {
  return firstString(...keys.map((key) => looseValue(node, key)))
}

function candidateImageUrls(value: unknown) {
  if (Array.isArray(value)) return value.map(normalizeImageUrl).filter(Boolean)
  if (typeof value !== "string") return [normalizeImageUrl(value)].filter(Boolean)

  return value
    .split(/\s*\|\|\s*|\s+/)
    .map((part) => normalizeImageUrl(part))
    .filter(Boolean)
}

function canonicalAliExpressUrl(productUrl: string) {
  try {
    const url = new URL(productUrl)
    const itemMatch = url.pathname.match(/\/item\/(\d+)\.html/i)

    if (itemMatch?.[1]) return `https://www.aliexpress.com/item/${itemMatch[1]}.html`
  } catch {
    // Oxylabs will validate the original URL if parsing fails.
  }

  return productUrl
}

function getOxylabsCredentials() {
  return {
    username: process.env.OXYLABS_USERNAME || process.env.OXYLABS_USER || "",
    password: process.env.OXYLABS_PASSWORD || "",
  }
}

function extractBalancedObject(source: string, startIndex: number) {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === "{") depth += 1
    if (char === "}") depth -= 1

    if (depth === 0) return source.slice(startIndex, index + 1)
  }

  return ""
}

function extractJsonNearKeyword(source: string, keyword: string) {
  const blocks: string[] = []
  let index = source.indexOf(keyword)

  while (index >= 0 && blocks.length < 12) {
    const start = source.lastIndexOf("{", index)
    if (start >= 0) {
      const block = extractBalancedObject(source, start)
      if (block) blocks.push(block)
    }
    index = source.indexOf(keyword, index + keyword.length)
  }

  return blocks
}

function extractJsonBlocks(html: string) {
  const blocks: string[] = []
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const stateRegex =
    /(?:window\.)?(?:runParams|__INIT_DATA__|__AER_DATA__|__INITIAL_STATE__|_dida_config_)\s*=\s*({[\s\S]*?});/gi
  let match

  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1]) blocks.push(match[1].trim())
  }

  while ((match = stateRegex.exec(html)) !== null) {
    if (match[1]) blocks.push(match[1].trim())
  }

  for (const script of html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || []) {
    if (!/sku|variant|product/i.test(script)) continue
    const body = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "")
    blocks.push(
      ...extractJsonNearKeyword(body, "skuPropertyList"),
      ...extractJsonNearKeyword(body, "skuModule"),
      ...extractJsonNearKeyword(body, "skuPriceList"),
      ...extractJsonNearKeyword(body, "productSKUPropertyList"),
      ...extractJsonNearKeyword(body, "inventoryComponent")
    )
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

function imageFromNode(node: Record<string, any>) {
  return candidateImageUrls(
    looseValue(
      node,
      "image",
      "imageUrl",
      "image_url",
      "imgUrl",
      "thumbnail",
      "variantImage",
      "mainImage",
      "propertyValueImage",
      "propertyValueImageUrl",
      "skuPropertyImagePath",
      "url",
      "src"
    )
  )[0] || ""
}

function labelFromNode(node: Record<string, any>) {
  return firstString(
    looseValue(node, "label"),
    looseValue(node, "name"),
    looseValue(node, "title"),
    looseValue(node, "value"),
    looseValue(node, "displayName"),
    looseValue(node, "variantDisplayName"),
    looseValue(node, "variantAttribute"),
    looseValue(node, "propertyValueDisplayName"),
    looseValue(node, "propertyValueName"),
    looseValue(node, "skuPropertyValueName"),
    looseValue(node, "optionName"),
    looseValue(node, "variantName")
  )
}

function priceFromNode(node: Record<string, any>) {
  return firstString(
    looseValue(node, "price"),
    looseValue(node, "salePrice"),
    looseValue(node, "originalPrice"),
    looseValue(node, "priceText"),
    looseValue(node, "formattedPrice"),
    looseValue(node, "salePrice")?.formattedPrice,
    looseValue(node, "price")?.formattedPrice
  )
}

function skuFromNode(node: Record<string, any>) {
  return looseText(node, "sku", "variantSkuId", "skuId", "skuCode", "skuAttr", "id")
}

function collectImages(root: unknown) {
  const images = new Set<string>()

  function walk(node: any) {
    if (!node || images.size >= 30) return
    if (typeof node === "string") {
      for (const image of candidateImageUrls(node)) {
        if (
          /\.(jpg|jpeg|png|webp)(\?|$)/i.test(image) &&
          (image.includes("alicdn") || image.includes("aliexpress"))
        ) {
          images.add(image)
        }
      }
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (typeof node !== "object") return

    for (const image of candidateImageUrls(
      looseValue(node, "image", "imageUrl", "imgUrl", "thumbnail", "mainImage", "url", "src")
    )) {
      images.add(image)
    }

    for (const value of Object.values(node)) walk(value)
  }

  walk(root)
  return Array.from(images)
}

function extractVariants(root: unknown) {
  const variants = new Map<string, OxylabsSupplierVariant>()

  function addVariant(node: Record<string, any>, parentName = "") {
    const label = labelFromNode(node)
    const image = imageFromNode(node)
    const sku = skuFromNode(node)
    const price = priceFromNode(node)

    if (!label && !image && !sku) return

    const parent = parentName.toLowerCase()
    const id = sku || `${parentName}-${label}-${image}` || String(variants.size + 1)

    variants.set(id, {
      id,
      label: label || parentName || "Variante fournisseur",
      color: parent.includes("color") || parent.includes("couleur") ? label : "",
      size: parent.includes("size") || parent.includes("taille") ? label : "",
      shape:
        !parent.includes("color") &&
        !parent.includes("couleur") &&
        !parent.includes("size") &&
        !parent.includes("taille")
          ? label
          : "",
      sku,
      price,
      image_url: image,
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
      looseValue(node, "skuPropertyName"),
      looseValue(node, "propertyName"),
      looseValue(node, "optionName"),
      looseValue(node, "name"),
      parentName
    )

    for (const key of ["variants", "productVariants", "skuVariants", "skus", "skuList"]) {
      const values = looseValue(node, key)
      if (Array.isArray(values)) {
        for (const value of values) {
          if (value && typeof value === "object") addVariant(value, propertyName)
        }
      }
    }

    for (const key of ["skuPropertyValues", "propertyValueList", "values", "options"]) {
      const values = looseValue(node, key)
      if (Array.isArray(values)) {
        for (const value of values) {
          if (value && typeof value === "object") addVariant(value, propertyName)
        }
      }
    }

    if (
      looseValue(node, "skuPropertyValueName") ||
      looseValue(node, "propertyValueDisplayName") ||
      looseValue(node, "propertyValueName") ||
      looseValue(node, "skuPropertyImagePath") ||
      looseValue(node, "propertyValueImageUrl") ||
      looseValue(node, "variantName")
    ) {
      addVariant(node, propertyName)
    }

    for (const value of Object.values(node)) walk(value, propertyName || parentName)
  }

  walk(root)

  return Array.from(variants.values())
    .filter((variant) => variant.label || variant.image_url)
    .slice(0, 160)
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
    if (match?.[1]) return cleanText(match[1], 500)
  }

  return ""
}

function normalizeFromContent(content: unknown): OxylabsSupplierProduct | null {
  const roots: unknown[] = []
  let html = ""

  if (typeof content === "string") {
    html = content
    roots.push(content)
    for (const block of extractJsonBlocks(content)) {
      const parsed = safeJsonParse(block)
      if (parsed) roots.push(parsed)
    }
  } else if (content && typeof content === "object") {
    roots.push(content)
  }

  const variants = roots.flatMap(extractVariants)
  const images = Array.from(new Set(roots.flatMap(collectImages)))
  const firstRoot = roots.find((root) => root && typeof root === "object") as Record<string, any> | undefined
  const title =
    (firstRoot ? looseText(firstRoot, "title", "name", "productTitle") : "") ||
    getMeta(html, "og:title") ||
    getMeta(html, "twitter:title")
  const description =
    (firstRoot ? looseText(firstRoot, "description", "productDescription") : "") ||
    getMeta(html, "og:description") ||
    getMeta(html, "description")
  const price =
    (firstRoot ? looseText(firstRoot, "price", "salePrice", "priceText", "finalPrice") : "") ||
    getMeta(html, "product:price:amount")

  if (!title && images.length === 0 && variants.length === 0) return null

  return {
    title,
    description,
    image_urls: images.slice(0, 12),
    price,
    currency: getMeta(html, "product:price:currency") || "EUR",
    supplier_name: "AliExpress",
    variants,
    debug_note: `Oxylabs OK : ${variants.length} variante(s) détectée(s).`,
  }
}

type OxylabsPayload = Record<string, unknown>

function getOxylabsPayloads(productUrl: string) {
  const canonicalUrl = canonicalAliExpressUrl(productUrl)
  const configuredSource = process.env.OXYLABS_ALIEXPRESS_SOURCE
  const geoLocation = process.env.OXYLABS_GEO_LOCATION || "France"
  const shared = {
    geo_location: geoLocation,
    user_agent_type: "desktop",
    render: "html",
  }

  const payloads: OxylabsPayload[] = []

  if (configuredSource) {
    payloads.push({
      source: configuredSource,
      ...(configuredSource.includes("search") ? { query: canonicalUrl } : { url: canonicalUrl }),
      ...shared,
      parse: !configuredSource.includes("universal"),
    })
  }

  payloads.push(
    {
      source: "aliexpress",
      url: canonicalUrl,
      ...shared,
      parse: true,
    },
    {
      source: "universal",
      url: canonicalUrl,
      ...shared,
      parse: false,
    }
  )

  return payloads
}

function shortError(value: unknown) {
  if (!value) return ""
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function postOxylabsPayload(username: string, password: string, payload: OxylabsPayload) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 18000)

  try {
    const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(shortError(data?.message || data?.error || data) || "requête refusée")
    }

    const content = data?.results?.[0]?.content || data?.results?.[0] || data
    const product = normalizeFromContent(content)

    if (!product) {
      throw new Error("réponse reçue, mais aucun produit/variante lisible")
    }

    return product
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("délai Oxylabs dépassé")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function scrapeAliExpressProductWithOxylabs(productUrl: string) {
  const { username, password } = getOxylabsCredentials()

  if (!username || !password) {
    throw new Error("OXYLABS_USERNAME/OXYLABS_PASSWORD manquants dans Vercel.")
  }

  const errors: string[] = []

  for (const payload of getOxylabsPayloads(productUrl)) {
    try {
      const product = await postOxylabsPayload(username, password, payload)
      return {
        ...product,
        debug_note: `${product.debug_note || "Oxylabs OK"} Source utilisée : ${payload.source}.`,
      }
    } catch (error) {
      errors.push(`${payload.source}: ${shortError(error).slice(0, 180)}`)
    }
  }

  throw new Error(`Oxylabs n'a pas pu lire la fiche produit. ${errors.join(" | ")}`)
}
