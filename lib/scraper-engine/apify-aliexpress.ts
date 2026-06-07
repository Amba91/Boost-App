import type { ScrapedReview } from "./types"
import { normalizeReview } from "./normalizer"

type ApifyDatasetItem = Record<string, any>

const APIFY_ACTOR_ID = "crowdpull~aliexpress-reviews-scraper"

const frenchFirstNames = [
  "Lucas",
  "Emma",
  "Louis",
  "Chloé",
  "Jules",
  "Léa",
  "Hugo",
  "Manon",
  "Nathan",
  "Camille",
  "Arthur",
  "Clara",
  "Gabriel",
  "Inès",
  "Raphaël",
  "Lina",
  "Noah",
  "Alice",
  "Tom",
  "Louise",
  "Adam",
  "Jade",
  "Paul",
  "Sarah",
  "Ethan",
  "Eva",
  "Mathis",
  "Zoé",
  "Léo",
  "Anna",
]

const frenchLastInitials = [
  "M.",
  "D.",
  "R.",
  "B.",
  "L.",
  "P.",
  "G.",
  "C.",
  "T.",
  "V.",
  "F.",
  "S.",
]

function getApifyToken() {
  const token = process.env.APIFY_TOKEN

  if (!token) {
    throw new Error("APIFY_TOKEN manquant dans Vercel.")
  }

  return token
}

function getKiidiizDisplayName(productId: string, reviewId: string) {
  const seed = `${productId}-${reviewId}`

  let hash = 0

  for (let index = 0; index < seed.length; index++) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % 100000
  }

  const firstName = frenchFirstNames[hash % frenchFirstNames.length]
  const lastInitial =
    frenchLastInitials[hash % frenchLastInitials.length]

  return {
    firstName,
    lastName: lastInitial,
  }
}

function itemToReview(item: ApifyDatasetItem): ScrapedReview | null {
  if (item.reviewType === "stats") return null

  const text = String(item.buyerFeedback || "").trim()

  if (!text || text.length < 5) return null

  const productId = String(item.productId || "")
  const reviewId = String(item.reviewId || "")
  const displayName = getKiidiizDisplayName(productId, reviewId)

  return normalizeReview({
    customer_first_name: displayName.firstName,
    customer_last_name: displayName.lastName,
    rating: Number(item.starRating || 5),
    review: text,
    image_url:
      Array.isArray(item.images) && item.images.length > 0
        ? item.images[0]
        : "",
    video_url: "",
    verified: true,
    verified_parent: true,
    verified_purchase: true,
  })
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
    `https://api.apify.com/v2/actors/${APIFY_ACTOR_ID}/runs?token=${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productIds: [productUrl],
        maxReviewsPerProduct: count,
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

  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      { cache: "no-store" }
    )

    const data = await response.json()
    const status = data?.data?.status

    if (status === "SUCCEEDED") return data?.data

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
    { cache: "no-store" }
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

  const reviews = items
    .map(itemToReview)
    .filter((review): review is ScrapedReview => review !== null)

  return uniqueReviews(reviews).slice(0, count)
}