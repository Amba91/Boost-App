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

function getApifyToken() {
  return process.env.APIFY_TOKEN || ""
}

function getActorId() {
  return process.env.APIFY_ALIEXPRESS_PRODUCT_ACTOR_ID || ""
}

function getActorInput(productUrl: string) {
  const template = process.env.APIFY_ALIEXPRESS_PRODUCT_INPUT_JSON

  if (template) {
    try {
      return JSON.parse(template.replaceAll("{url}", productUrl))
    } catch {
      // Fallback below keeps Boost usable if the template is malformed.
    }
  }

  return {
    startUrls: [{ url: productUrl }],
    maxItems: 1,
    proxyConfiguration: { useApifyProxy: true },
  }
}

async function runActor(productUrl: string) {
  const token = getApifyToken()
  const actorId = getActorId()

  if (!token || !actorId) return null

  const response = await fetch(
    `https://api.apify.com/v2/actors/${actorId}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getActorInput(productUrl)),
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

  for (let attempt = 0; attempt < 36; attempt++) {
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
      const image = normalizeImageUrl(node)
      if (
        image &&
        /\.(jpg|jpeg|png|webp)(\?|$)/i.test(image) &&
        (image.includes("alicdn") || image.includes("aliexpress"))
      ) {
        images.add(image)
      }
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (typeof node !== "object") return

    const directImage = normalizeImageUrl(
      node.image ||
        node.imageUrl ||
        node.image_url ||
        node.imgUrl ||
        node.thumbnail ||
        node.url ||
        node.src
    )
    if (directImage) images.add(directImage)

    for (const value of Object.values(node)) walk(value)
  }

  walk(root)
  return Array.from(images)
}

function labelFromNode(node: Record<string, any>) {
  return firstString(
    node.label,
    node.name,
    node.title,
    node.value,
    node.displayName,
    node.propertyValueDisplayName,
    node.propertyValueName,
    node.skuPropertyValueName,
    node.optionName,
    node.variantName
  )
}

function imageFromNode(node: Record<string, any>) {
  return normalizeImageUrl(
    node.image ||
      node.imageUrl ||
      node.image_url ||
      node.imgUrl ||
      node.thumbnail ||
      node.propertyValueImage ||
      node.propertyValueImageUrl ||
      node.skuPropertyImagePath ||
      node.url ||
      node.src
  )
}

function priceFromNode(node: Record<string, any>) {
  return firstString(
    node.price,
    node.salePrice,
    node.priceText,
    node.formattedPrice,
    node.salePrice?.formattedPrice,
    node.price?.formattedPrice
  )
}

function skuFromNode(node: Record<string, any>) {
  return firstString(node.sku, node.skuId, node.skuCode, node.skuAttr, node.id)
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
      node.skuPropertyName,
      node.propertyName,
      node.optionName,
      node.name,
      parentName
    )

    if (Array.isArray(node.variants)) {
      for (const variant of node.variants) {
        if (variant && typeof variant === "object") addVariant(variant, propertyName)
      }
    }

    if (Array.isArray(node.skus)) {
      for (const sku of node.skus) {
        if (sku && typeof sku === "object") addVariant(sku, propertyName)
      }
    }

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
      node.propertyValueImageUrl ||
      node.variantName
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
  const item = items.find((entry) => entry && typeof entry === "object") || null
  if (!item) return null

  const variants = extractVariants(item)
  const imageUrls = collectImages(item)

  return {
    title: firstString(item.title, item.name, item.productTitle),
    description: firstString(item.description, item.productDescription),
    image_urls: imageUrls.slice(0, 12),
    price: firstString(item.price, item.salePrice, item.priceText, item.finalPrice),
    currency: firstString(item.currency, item.priceCurrency) || "EUR",
    supplier_name: "AliExpress",
    variants,
  }
}

export async function scrapeAliExpressProductWithApify(productUrl: string) {
  const run = await runActor(productUrl)

  if (!run?.id) return null

  const completedRun = await waitForRun(run.id)
  const datasetId =
    completedRun.defaultDatasetId ||
    completedRun.defaultDataset?.id ||
    run.defaultDatasetId

  if (!datasetId) return null

  const items = await readDatasetItems(datasetId)
  return normalizeProduct(items)
}
