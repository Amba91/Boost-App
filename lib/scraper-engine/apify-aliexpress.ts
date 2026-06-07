import type { ScrapedReview } from "./types"
import { normalizeReview } from "./normalizer"

type ApifyDatasetItem = Record<string, any>

const APIFY_ACTOR_ID = "easyapi/aliexpress-reviews-scraper"

function getApifyToken() {
  const token = process.env.APIFY_TOKEN

  if (!token) {
    throw new Error("APIFY_TOKEN manquant dans Vercel.")
  }

  return token
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

    const text =
      node.review ||
      node.reviewText ||
      node.reviewBody ||
      node.content ||
      node.comment ||
      node.feedback ||
      node.text

    const rating =
      node.rating ||
      node.stars ||
      node.starRating ||
      node.reviewRating?.ratingValue ||
      node.score

    const author =
      node.author ||
      node.authorName ||
      node.buyerName ||
      node.userName ||
      node.name ||
      node.customerName ||
      "Client"

    const image =
      node.image_url ||
      node.imageUrl ||
      node.image ||
      node.avatar ||
      node.buyerAvatar ||
      ""

    if (text && String(text).length > 5) {
      const [firstName, ...lastParts] = String(author).split(" ")

      reviews.push(
        normalizeReview({
          customer_first_name: firstName || "Client",
          customer_last_name: lastParts.join(" "),
          rating: Number(rating || 5),
          review: String(text),
          image_url: String(image || ""),
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

function uniqueReviews(reviews: ScrapedReview[]) {
  return reviews.filter(
    (review, index, array) =>
      review.review &&
      review.review.length > 5 &&
      array.findIndex((item) => item.review === review.review) === index
  )
}

async function runApifyActor(productUrl: string, count: number) {
  const token = getApifyToken()

  const response = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startUrls: [{ url: productUrl }],
        maxItems: count,
        maxReviews: count,
        reviewsLimit: count,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Impossible de lancer l’acteur Apify."
    )
  }

  return data?.data
}

async function waitForRun(runId: string) {
  const token = getApifyToken()

  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      {
        cache: "no-store",
      }
    )

    const data = await response.json()
    const status = data?.data?.status

    if (status === "SUCCEEDED") {
      return data?.data
    }

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`Apify a échoué : ${status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  throw new Error("Apify a mis trop de temps à répondre.")
}

async function readDatasetItems(datasetId: string) {
  const token = getApifyToken()

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&token=${token}`,
    {
      cache: "no-store",
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error("Impossible de lire les résultats Apify.")
  }

  return Array.isArray(data) ? data : []
}

export async function scrapeAliExpressReviewsWithApify(
  productUrl: string,
  count: number
): Promise<ScrapedReview[]> {
  const run = await runApifyActor(productUrl, count)
  const completedRun = await waitForRun(run.id)

  const datasetId =
    completedRun.defaultDatasetId ||
    completedRun.defaultDataset?.id ||
    run.defaultDatasetId

  if (!datasetId) {
    throw new Error("Dataset Apify introuvable.")
  }

  const items: ApifyDatasetItem[] = await readDatasetItems(datasetId)
  const reviews: ScrapedReview[] = []

  for (const item of items) {
    reviews.push(...findReviewsInObject(item))
  }

  return uniqueReviews(reviews).slice(0, count)
}