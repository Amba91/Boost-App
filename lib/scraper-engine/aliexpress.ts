import type { ScrapedReview } from "./types"
import { normalizeReview } from "./normalizer"

function extractJsonBlocks(html: string) {
  const blocks: string[] = []

  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match

  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1]) {
      blocks.push(match[1].trim())
    }
  }

  return blocks
}

function findReviewsInObject(value: any): ScrapedReview[] {
  const reviews: ScrapedReview[] = []

  function walk(node: any) {
    if (!node) return

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item)
      }
      return
    }

    if (typeof node !== "object") return

    const possibleReviewText =
      node.reviewBody ||
      node.review ||
      node.content ||
      node.comment ||
      node.feedback

    const possibleRating =
      node.reviewRating?.ratingValue ||
      node.ratingValue ||
      node.rating ||
      node.starRating

    const possibleAuthor =
      node.author?.name ||
      node.authorName ||
      node.buyerName ||
      node.name ||
      "Client"

    if (possibleReviewText && String(possibleReviewText).length > 10) {
      const [firstName, ...lastParts] = String(possibleAuthor).split(" ")

      reviews.push(
        normalizeReview({
          customer_first_name: firstName || "Client",
          customer_last_name: lastParts.join(" "),
          rating: Number(possibleRating || 5),
          review: String(possibleReviewText),
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

export async function scrapeAliExpressReviews(
  url: string,
  count: number
): Promise<ScrapedReview[]> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`AliExpress inaccessible : ${response.status}`)
  }

  const html = await response.text()
  const jsonBlocks = extractJsonBlocks(html)
  const reviews: ScrapedReview[] = []

  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block)
      reviews.push(...findReviewsInObject(parsed))
    } catch {
      // On ignore les blocs JSON invalides
    }
  }

  const uniqueReviews = reviews.filter(
    (review, index, array) =>
      review.review &&
      array.findIndex((item) => item.review === review.review) === index
  )

  return uniqueReviews.slice(0, count)
}