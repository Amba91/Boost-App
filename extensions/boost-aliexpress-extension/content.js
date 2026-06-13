function text(value, max = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max)
}

function normalizeImageUrl(value) {
  const raw = String(value || "").replace(/\\u002F/g, "/").replace(/\\/g, "").trim()
  if (!raw) return ""
  if (raw.startsWith("//")) return `https:${raw}`
  if (raw.startsWith("http")) return raw
  return ""
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function firstSelector(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    const value = text(element?.textContent || element?.getAttribute?.("content"), 280)
    if (value) return value
  }
  return ""
}

function getProductId() {
  const match = location.href.match(/\/item\/(\d+)\.html/i)
  return match?.[1] || ""
}

function collectImages() {
  const images = []
  const selectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    '[class*="gallery"] img',
    '[class*="image"] img',
    '[class*="slider"] img',
    'img[src*="alicdn"]',
  ]

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((element) => {
      const src =
        element.getAttribute("content") ||
        element.getAttribute("src") ||
        element.getAttribute("data-src") ||
        element.getAttribute("data-lazy-src")
      const normalized = normalizeImageUrl(src)
      if (normalized && /alicdn|aliexpress/i.test(normalized)) images.push(normalized)
    })
  }

  return unique(images).slice(0, 40)
}

function nearestUsefulText(element) {
  const values = [
    element.getAttribute("title"),
    element.getAttribute("aria-label"),
    element.getAttribute("alt"),
    element.textContent,
    element.parentElement?.textContent,
    element.closest("li")?.textContent,
    element.closest("button")?.textContent,
    element.closest('[role="button"]')?.textContent,
  ]

  return text(values.find((value) => text(value, 120)) || "", 120)
}

function inferVariantGroup(element) {
  const block =
    element.closest('[class*="sku"]') ||
    element.closest('[class*="Sku"]') ||
    element.closest('[class*="spec"]') ||
    element.closest('[class*="option"]') ||
    element.parentElement
  const heading =
    block?.querySelector?.("span, strong, div")?.textContent ||
    block?.previousElementSibling?.textContent ||
    ""
  const clean = text(heading, 80)

  if (/couleur|color/i.test(clean)) return "color"
  if (/taille|size/i.test(clean)) return "size"
  if (/forme|pack|style|mod[eè]le|ships|exp[ée]di/i.test(clean)) return "shape"
  return "shape"
}

function collectVariantsFromDom() {
  const candidates = []
  const selectors = [
    '[class*="sku"] img',
    '[class*="Sku"] img',
    '[class*="sku"] button',
    '[class*="Sku"] button',
    '[class*="sku"] [role="button"]',
    '[class*="Sku"] [role="button"]',
    '[class*="sku"] [title]',
    '[class*="Sku"] [title]',
  ]

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((element) => {
      const label = nearestUsefulText(element)
      const image = normalizeImageUrl(
        element.getAttribute("src") ||
          element.getAttribute("data-src") ||
          element.querySelector?.("img")?.getAttribute("src")
      )

      if (!label && !image) return
      if (/selected|couleur|color|taille|size|quantit/i.test(label) && !image) return

      const group = inferVariantGroup(element)
      const id = `${group}-${label}-${image}`.slice(0, 240)
      candidates.push({
        id,
        label: label || "Variante AliExpress",
        color: group === "color" ? label : "",
        size: group === "size" ? label : "",
        shape: group === "shape" ? label : "",
        sku: "",
        price: "",
        image_url: image,
        source: "dom",
      })
    })
  }

  const seen = new Set()
  return candidates
    .filter((variant) => {
      const key = `${variant.label}|${variant.image_url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 160)
}

function collectVariantsFromScripts() {
  const html = document.documentElement.innerHTML
  const variants = []
  const valueRegex =
    /"skuPropertyValueName"\s*:\s*"([^"]+)"[\s\S]{0,700}?"(?:skuPropertyImagePath|propertyValueImageUrl|imageUrl)"\s*:\s*"([^"]+)"/gi
  let match

  while ((match = valueRegex.exec(html)) !== null && variants.length < 160) {
    const label = text(match[1], 120)
    const image = normalizeImageUrl(match[2])
    variants.push({
      id: `script-${label}-${image}`.slice(0, 240),
      label,
      color: label,
      size: "",
      shape: "",
      sku: "",
      price: "",
      image_url: image,
      source: "script",
    })
  }

  return variants
}

function collectVariants() {
  const variants = [...collectVariantsFromScripts(), ...collectVariantsFromDom()]
  const seen = new Set()

  return variants.filter((variant) => {
    const key = `${variant.label}|${variant.image_url}`
    if (!variant.label && !variant.image_url) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function collectProduct() {
  const title =
    firstSelector([
      "h1",
      '[data-pl="product-title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      "title",
    ]) || "Produit AliExpress"
  const description =
    firstSelector(['meta[property="og:description"]', 'meta[name="description"]']) || ""
  const price = firstSelector([
    '[class*="price"]',
    '[data-pl*="price"]',
    '[class*="Price"]',
  ])

  return {
    source: "aliexpress_extension",
    source_url: location.href,
    external_id: getProductId(),
    title,
    description,
    image_urls: collectImages(),
    price,
    currency: "EUR",
    supplier_name: "AliExpress",
    variants: collectVariants(),
    captured_at: new Date().toISOString(),
    user_agent: navigator.userAgent,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "BOOST_EXTRACT_ALIEXPRESS_PRODUCT") return false

  try {
    const payload = collectProduct()
    sendResponse({ success: true, payload })
  } catch (error) {
    sendResponse({ success: false, error: error.message || String(error) })
  }

  return true
})
