type ApifyDatasetItem = Record<string, any>

export type SupplierProductVariant = {
  id: string
  label: string
  color: string
  size: string
  shape: string
  sku: string
  price: string
  image_url: string
}

export type SupplierProductDetails = {
  title: string
  description: string
  image_urls: string[]
  price: string
  currency: string
  supplier_name: string
  variants: SupplierProductVariant[]
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

function candidateImageUrls(value: unknown) {
  if (typeof value !== "string") return [normalizeImageUrl(value)].filter(Boolean)

  return value
    .split(/\s*\|\|\s*|\s+/)
    .map((part) => normalizeImageUrl(part))
    .filter(Boolean)
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

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = cleanText(value, 300)
    if (text) return text
  }
  return ""
}

function getApifyToken() {
  return process.env.APIFY_TOKEN || ""
}

function getActorId() {
  return (
    process.env.APIFY_ALIEXPRESS_PRODUCT_ACTOR_ID ||
    "nifty.codes~aliexpress-product-ariants-scraper"
  ).replace("/", "~")
}

function getDefaultActorIds() {
  const configuredActor = process.env.APIFY_ALIEXPRESS_PRODUCT_ACTOR_ID
  if (configuredActor) return [configuredActor.replace("/", "~")]

  return [
    "nifty.codes~aliexpress-product-ariants-scraper",
    "khadinakbar~aliexpress-all-in-one-scraper",
  ]
}

function canonicalAliExpressUrl(productUrl: string) {
  try {
    const url = new URL(productUrl)
    const itemMatch = url.pathname.match(/\/item\/(\d+)\.html/i)

    if (itemMatch?.[1]) {
      return `https://www.aliexpress.com/item/${itemMatch[1]}.html`
    }

    if (url.hostname.endsWith("aliexpress.com")) {
      url.hostname = "www.aliexpress.com"
      url.search = ""
      return url.toString()
    }
  } catch {
    // The actor will validate the original URL if parsing fails.
  }

  return productUrl
}

function getActorInput(productUrl: string, actorId = getActorId()) {
  const template = process.env.APIFY_ALIEXPRESS_PRODUCT_INPUT_JSON
  const canonicalUrl = canonicalAliExpressUrl(productUrl)
  const urls = canonicalUrl === productUrl ? [canonicalUrl] : [productUrl, canonicalUrl]

  if (template) {
    try {
      return JSON.parse(template.replaceAll("{url}", productUrl).replaceAll("{canonicalUrl}", canonicalUrl))
    } catch {
      // Fallback below keeps Boost usable if the template is malformed.
    }
  }

  if (actorId.includes("aliexpress-all-in-one-scraper")) {
    return {
      startUrls: urls.map((url) => ({ url })),
      maxResults: 1,
      detailedItems: true,
      includeReviews: false,
      maxReviews: 1,
      site: "aliexpress.com",
      shipCountry: "FR",
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    }
  }

  return {
    urls,
    maxItems: 100,
  }
}

async function runActor(productUrl: string, actorId: string) {
  const token = getApifyToken()

  if (!token) {
    throw new Error("APIFY_TOKEN manquant dans Vercel.")
  }

  if (!actorId) {
    throw new Error("Acteur Apify AliExpress produit manquant.")
  }

  const response = await fetch(
    `https://api.apify.com/v2/actors/${actorId}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getActorInput(productUrl, actorId)),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Impossible de lancer le connecteur produit AliExpress."
    )
  }

  return data?.data
}

async function waitForRun(runId: string) {
  const token = getApifyToken()

  for (let attempt = 0; attempt < 96; attempt++) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      { cache: "no-store" }
    )

    const data = await response.json()
    const status = data?.data?.status

    if (status === "SUCCEEDED") return data?.data

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`Le connecteur produit AliExpress a échoué : ${status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  throw new Error("Le connecteur produit AliExpress prend trop de temps.")
}

async function readDatasetItems(datasetId: string) {
  const token = getApifyToken()
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&limit=20&token=${token}`,
    { cache: "no-store" }
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error("Impossible de lire les produits AliExpress récupérés.")
  }

  return Array.isArray(data) ? data : []
}

function collectImages(root: unknown) {
  const images = new Set<string>()

  function walk(node: any) {
    if (!node || images.size >= 24) return
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

    const directImage = looseValue(
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
    for (const image of candidateImageUrls(directImage)) images.add(image)

    for (const value of Object.values(node)) walk(value)
  }

  walk(root)
  return Array.from(images)
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

function parseSkuProperties(value: unknown) {
  if (!value) return {}

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value !== "string") return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function variantFromDatasetItem(item: ApifyDatasetItem, index: number): SupplierProductVariant | null {
  const looksLikeVariantRow =
    looseValue(item, "variantSkuId", "variant_sku_id", "SKU ID") ||
    looseValue(item, "variantDisplayName", "variant_display_name", "Variant Display Name") ||
    looseValue(item, "variantAttribute", "variant_attribute", "Variant Attribute") ||
    looseValue(item, "skuProperties", "sku_properties", "SKU Properties")

  if (!looksLikeVariantRow) return null

  const skuProperties = parseSkuProperties(
    looseValue(item, "skuProperties", "sku_properties", "SKU Properties", "variantProperties")
  )
  const propertyLabel = Object.entries(skuProperties)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" / ")
  const attribute = looseText(item, "variantAttribute", "variant_attribute", "attribute", "Variant Attribute")
  const displayName = looseText(item, "variantDisplayName", "variant_display_name", "displayName", "Variant Display Name")
  const label = propertyLabel || [attribute, displayName].filter(Boolean).join(": ") || displayName
  const imageUrl = imageFromNode(item)
  const sku = looseText(item, "variantSkuId", "variant_sku_id", "sku", "skuId", "SKU ID")
  const price = priceFromNode(item)

  if (!label && !imageUrl && !sku) return null

  const lowerAttribute = attribute.toLowerCase()
  const lowerLabel = label.toLowerCase()
  const isColor =
    lowerAttribute.includes("color") ||
    lowerAttribute.includes("couleur") ||
    lowerLabel.includes("color") ||
    lowerLabel.includes("couleur")
  const isSize =
    lowerAttribute.includes("size") ||
    lowerAttribute.includes("taille") ||
    lowerLabel.includes("size") ||
    lowerLabel.includes("taille")

  return {
    id: sku || `apify-variant-${index}`,
    label: label || "Variante fournisseur",
    color: isColor ? displayName || label : "",
    size: isSize ? displayName || label : "",
    shape: !isColor && !isSize ? displayName || label : "",
    sku,
    price,
    image_url: imageUrl,
  }
}

function extractVariants(root: unknown) {
  const variants = new Map<string, SupplierProductVariant>()

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

    const nestedVariants = looseValue(node, "variants", "productVariants", "skuVariants")
    if (Array.isArray(nestedVariants)) {
      for (const variant of nestedVariants) {
        if (variant && typeof variant === "object") addVariant(variant, propertyName)
      }
    }

    const skus = looseValue(node, "skus", "skuList", "skuModule")
    if (Array.isArray(skus)) {
      for (const sku of skus) {
        if (sku && typeof sku === "object") addVariant(sku, propertyName)
      }
    }

    const skuPropertyValues = looseValue(node, "skuPropertyValues", "propertyValueList", "values", "options")
    if (Array.isArray(skuPropertyValues)) {
      for (const value of skuPropertyValues) {
        if (value && typeof value === "object") addVariant(value, propertyName)
      }
    }

    const propertyValueList = looseValue(node, "propertyValueList")
    if (Array.isArray(propertyValueList)) {
      for (const value of propertyValueList) {
        if (value && typeof value === "object") addVariant(value, propertyName)
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
    .slice(0, 120)
}

function normalizeProduct(items: ApifyDatasetItem[]): SupplierProductDetails | null {
  const item =
    items.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        (!entry.recordType || String(entry.recordType).toLowerCase() === "product")
    ) ||
    items.find((entry) => entry && typeof entry === "object") ||
    null
  if (!item) return null

  const datasetVariants = items
    .map(variantFromDatasetItem)
    .filter((variant): variant is SupplierProductVariant => variant !== null)

  const variants = datasetVariants.length > 0 ? datasetVariants : extractVariants(item)
  const imageUrls = Array.from(
    new Set([
      ...items.flatMap((entry) => collectImages(entry)),
      ...collectImages(item),
    ])
  )

  return {
    title: looseText(item, "title", "name", "productTitle", "Product Title"),
    description: looseText(item, "description", "productDescription", "Product Description"),
    image_urls: imageUrls.slice(0, 12),
    price: looseText(item, "price", "salePrice", "priceText", "finalPrice", "originalPrice"),
    currency: looseText(item, "currency", "priceCurrency") || "EUR",
    supplier_name: looseText(item, "storeName", "sellerName", "supplierName") || "AliExpress",
    variants,
    debug_note:
      variants.length === 0
        ? `Champs Apify reçus : ${Object.keys(item).slice(0, 18).join(", ")}`
        : "",
  }
}

async function scrapeWithActor(productUrl: string, actorId: string) {
  const run = await runActor(productUrl, actorId)

  if (!run?.id) return null

  const completedRun = await waitForRun(run.id)
  const datasetId =
    completedRun.defaultDatasetId ||
    completedRun.defaultDataset?.id ||
    run.defaultDatasetId

  if (!datasetId) return null

  const items = await readDatasetItems(datasetId)
  const product = normalizeProduct(items)

  return product
    ? {
        ...product,
        debug_note:
          product.debug_note ||
          `Connecteur Apify utilisé : ${actorId.replace("~", "/")} · ${product.variants.length} variante(s)`,
      }
    : null
}

export async function scrapeAliExpressProductWithApify(productUrl: string) {
  const errors: string[] = []
  let bestProduct: SupplierProductDetails | null = null

  for (const actorId of getDefaultActorIds()) {
    try {
      const product = await scrapeWithActor(productUrl, actorId)

      if (
        product &&
        (product.title || product.image_urls.length > 0 || product.variants.length > 0)
      ) {
        if (product.variants.length > 0) return product
        bestProduct ||= product
        errors.push(`${actorId.replace("~", "/")} : produit lu, mais 0 variante`)
        continue
      }

      errors.push(`${actorId.replace("~", "/")} : aucun résultat exploitable`)
    } catch (error) {
      errors.push(`${actorId.replace("~", "/")} : ${String(error).slice(0, 160)}`)
    }
  }

  if (bestProduct) {
    return {
      ...bestProduct,
      debug_note: `${bestProduct.debug_note || "Produit lu sans variante"} | ${errors.join(" | ")}`,
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" | "))
  }

  return null
}
