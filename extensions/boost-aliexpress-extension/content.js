function text(value, max = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max)
}

function stripImageSuffix(value) {
  return text(value, 240)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[_-]?(?:\d+x\d+q\d+|\.jpe?g|\.png|\.webp|\.avif).*$/i, "")
    .replace(/\b(?:jpg|jpeg|png|webp|avif)\b/gi, "")
    .replace(/[_-]{2,}/g, "-")
    .replace(/^shape[-_\s]*/i, "")
    .replace(/[-_\s]+$/g, "")
    .trim()
}

function cleanVariantLabel(value) {
  const clean = stripImageSuffix(value)
  if (!clean || /^(selected|couleur|color|taille|size|quantit|quantity)$/i.test(clean)) return ""
  return clean
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

function collectVideos() {
  const videos = []
  document.querySelectorAll("video, source, a[href]").forEach((element) => {
    const src =
      element.getAttribute("src") ||
      element.getAttribute("data-src") ||
      element.getAttribute("href")
    const normalized = normalizeImageUrl(src)
    if (normalized && /\.(mp4|webm|mov)(?:\?|$)/i.test(normalized)) {
      videos.push(normalized)
    }
  })

  const html = document.documentElement.innerHTML
  const matches = html.match(/https?:\\?\/\\?\/[^"'<>\\]+?\.(?:mp4|webm|mov)(?:\?[^"'<>\\]*)?/gi) || []
  matches.forEach((value) => {
    const normalized = normalizeImageUrl(value)
    if (normalized) videos.push(normalized)
  })

  return unique(videos).slice(0, 20)
}

function collectDescription() {
  const meta =
    firstSelector(['meta[property="og:description"]', 'meta[name="description"]']) || ""
  const details = text(
    document.querySelector('[class*="description"], [class*="Description"], [id*="description"], [id*="product-description"]')
      ?.textContent,
    1800
  )

  return details || meta
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

  return cleanVariantLabel(values.find((value) => text(value, 120)) || "")
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
      const cleanLabel = cleanVariantLabel(label) || "Variante AliExpress"
      const id = `${group}-${cleanLabel}-${image}`.slice(0, 240)
      candidates.push({
        id,
        label: cleanLabel,
        color: group === "color" ? cleanLabel : "",
        size: group === "size" ? cleanLabel : "",
        shape: group === "shape" ? cleanLabel : "",
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
    const label = cleanVariantLabel(match[1])
    const image = normalizeImageUrl(match[2])
    if (!label && !image) continue
    variants.push({
      id: `script-${label}-${image}`.slice(0, 240),
      label: label || "Variante AliExpress",
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
    if (/^variante aliexpress$/i.test(variant.label) && !variant.image_url) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function ratingFromText(value) {
  const match = String(value || "").match(/([1-5](?:[.,]\d)?)/)
  return match ? Number(match[1].replace(",", ".")) : 5
}

function collectReviewImages(element) {
  const images = []
  element.querySelectorAll('img[src*="alicdn"], img[src*="aliexpress"]').forEach((image) => {
    const src = normalizeImageUrl(image.getAttribute("src") || image.getAttribute("data-src"))
    if (src) images.push(src)
  })
  return unique(images).slice(0, 4)
}

function isLikelyReviewText(value) {
  const clean = text(value, 800)
  if (clean.length < 12) return false
  if (/^(reviews?|avis|articles similaires|details?|présentation|vous aimerez aussi)$/i.test(clean)) return false
  if (/due to our system upgrades/i.test(clean)) return false
  return /[.!?]|tr[eè]s|good|great|perfect|merci|qualit|livraison|produit|enfant|commande/i.test(clean)
}

function collectReviews() {
  const reviews = []
  const cards = Array.from(
    document.querySelectorAll(
      '[class*="review"], [class*="Review"], [data-pl*="review"], [class*="feedback"], [class*="Feedback"]'
    )
  )

  for (const card of cards) {
    const rawText = text(card.textContent, 1200)
    if (!isLikelyReviewText(rawText)) continue

    const author =
      text(
        card.querySelector('[class*="name"], [class*="Name"], [class*="user"], [class*="User"]')
          ?.textContent,
        120
      ) || "Client AliExpress"
    const ratingText =
      card.getAttribute("aria-label") ||
      card.querySelector('[aria-label*="star"], [aria-label*="étoile"], [class*="star"], [class*="Star"]')
        ?.getAttribute("aria-label") ||
      rawText
    const images = collectReviewImages(card)
    const reviewText = rawText
      .replace(author, "")
      .replace(/\b[1-5](?:[.,]\d)?\s*(?:stars?|étoiles?)\b/gi, "")
      .trim()

    reviews.push({
      author,
      rating: ratingFromText(ratingText),
      review: text(reviewText, 900),
      image_url: images[0] || "",
      verified: true,
      verified_purchase: true,
      visible: true,
      date: new Date().toISOString(),
    })
  }

  const seen = new Set()
  return reviews
    .filter((review) => {
      const key = `${review.author}|${review.review}`
      if (!review.review || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 50)
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
  const description = collectDescription()
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
    video_urls: collectVideos(),
    price,
    currency: "EUR",
    supplier_name: "AliExpress",
    variants: collectVariants(),
    captured_at: new Date().toISOString(),
    user_agent: navigator.userAgent,
  }
}

function collectProductTitle() {
  return (
    firstSelector([
      "h1",
      '[data-pl="product-title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      "title",
    ]) || "Produit AliExpress"
  )
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    if (message?.type === "BOOST_EXTRACT_ALIEXPRESS_PRODUCT") {
      const payload = collectProduct()
      sendResponse({ success: true, payload })
      return true
    }

    if (message?.type === "BOOST_EXTRACT_ALIEXPRESS_REVIEWS") {
      sendResponse({
        success: true,
        productTitle: collectProductTitle(),
        reviews: collectReviews(),
      })
      return true
    }

    return false
  } catch (error) {
    sendResponse({ success: false, error: error.message || String(error) })
    return true
  }
})
