import type { ScrapedReview } from "./types"
import { normalizeReview } from "./normalizer"

function extractProductId(url: string) {
  const match = url.match(/\/item\/(\d+)\.html/i)
  return match?.[1] || ""
}

function uniqueReviews(reviews: ScrapedReview[]) {
  return reviews.filter(
    (review, index, array) =>
      review.review &&
      review.review.length > 10 &&
      array.findIndex((item) => item.review === review.review) === index
  )
}

function extractJsonBlocks(html: string) {
  const blocks: string[] = []

  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match

  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1]) blocks.push(match[1].trim())
  }

  const dataRegex =
    /window\.(?:runParams|__INIT_DATA__|__AER_DATA__|__INITIAL_STATE__)\s*=\s*({[\s\S]*?});/gi

  while ((match = dataRegex.exec(html)) !== null) {
    if (match[1]) blocks.push(match[1].trim())
  }

  return blocks
}

function findReviewsInObject(value: any): ScrapedReview[] {
  const reviews: ScrapedReview[] = []

  function walk(node: any) {
    if (!node) return

    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }

    if (typeof node !== "object") return

    const possibleReviewText =
      node.reviewBody ||
      node.review ||
      node.content ||
      node.comment ||
      node.feedback ||
      node.buyerFeedback ||
      node.evaluationContent ||
      node.feedbackContent ||
      node.commentContent ||
      node.translateContent

    const possibleRating =
      node.reviewRating?.ratingValue ||
      node.ratingValue ||
      node.rating ||
      node.starRating ||
      node.evaluation ||
      node.score

    const possibleAuthor =
      node.author?.name ||
      node.authorName ||
      node.buyerName ||
      node.userName ||
      node.name ||
      node.displayName ||
      "Client"

    const possibleImage =
      node.image ||
      node.imageUrl ||
      node.image_url ||
      node.thumbnail ||
      node.photo ||
      node.photoUrl ||
      ""

    if (possibleReviewText && String(possibleReviewText).length > 10) {
      const [firstName, ...lastParts] = String(possibleAuthor).split(" ")

      reviews.push(
        normalizeReview({
          customer_first_name: firstName || "Client",
          customer_last_name: lastParts.join(" "),
          rating: Number(possibleRating || 5),
          review: String(possibleReviewText),
          image_url: String(possibleImage || ""),
          verified: true,
          verified_parent: true,
          verified_purchase: true,
        })
      )
    }

    for (const key of Object.keys(node)) {
      walk(node[key])
    }
  }

  walk(value)

  return reviews
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,text/plain,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://www.aliexpress.com/",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Requête AliExpress échouée : ${response.status}`)
  }

  return response.text()
}

function tryParseJsonLike(text: string): any[] {
  const parsed: any[] = []

  try {
    parsed.push(JSON.parse(text))
  } catch {
    // texte non JSON
  }

  const jsonLikeMatches = text.match(/\{[\s\S]*\}/g) || []

  for (const match of jsonLikeMatches.slice(0, 5)) {
    try {
      parsed.push(JSON.parse(match))
    } catch {
      // ignore
    }
  }

  return parsed
}

async function scrapeFromProductPage(url: string) {
  const html = await fetchText(url)
  const reviews: ScrapedReview[] = []

  const blocks = extractJsonBlocks(html)

  for (const block of blocks) {
    for (const parsed of tryParseJsonLike(block)) {
      reviews.push(...findReviewsInObject(parsed))
    }
  }

  return reviews
}

async function scrapeFromPossibleEndpoints(productId: string) {
  if (!productId) return []

  const endpointUrls = [
    `https://feedback.aliexpress.com/display/productEvaluation.htm?productId=${productId}&ownerMemberId=&companyId=&memberType=seller&startValidDate=&i18n=true`,
    `https://feedback.aliexpress.com/display/productEvaluation.htm?productId=${productId}&page=1&pageSize=20`,
    `https://www.aliexpress.com/pdp/review/getPdpReviewList.json?productId=${productId}&page=1&pageSize=20`,
    `https://www.aliexpress.com/aer-jsonapi/review/v1/reviews?productId=${productId}&page=1&pageSize=20`,
  ]

  const reviews: ScrapedReview[] = []

  for (const endpoint of endpointUrls) {
    try {
      const text = await fetchText(endpoint)

      for (const parsed of tryParseJsonLike(text)) {
        reviews.push(...findReviewsInObject(parsed))
      }
    } catch {
      // Endpoint indisponible ou bloqué
    }
  }

  return reviews
}

export async function scrapeAliExpressReviews(
  url: string,
  count: number
): Promise<ScrapedReview[]> {
  const productId = extractProductId(url)
  const reviews: ScrapedReview[] = []

  try {
    reviews.push(...(await scrapeFromProductPage(url)))
  } catch {
    // Page produit non exploitable
  }

  if (reviews.length < count) {
    reviews.push(...(await scrapeFromPossibleEndpoints(productId)))
  }

  return uniqueReviews(reviews).slice(0, count)
}