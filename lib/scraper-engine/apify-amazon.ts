import type { ScrapedReview } from "./types"
import { normalizeReview } from "./normalizer"

type ApifyDatasetItem = Record<string, any>

const APIFY_ACTOR_ID = "web_wanderer~amazon-reviews-extractor"

function getApifyToken() {
  const token = process.env.APIFY_TOKEN

  if (!token) {
    throw new Error("APIFY_TOKEN manquant dans Vercel.")
  }

  return token
}

function getAmazonRegion(productUrl: string) {
  try {
    const hostname = new URL(productUrl).hostname.replace(/^www\./, "")

    if (hostname.startsWith("amazon.")) return hostname
  } catch {
    // L'acteur validera aussi le lien reçu.
  }

  return "amazon.com"
}

function splitName(fullName: unknown) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] || "Client",
    lastName: parts.slice(1).join(" ") || "Amazon",
  }
}

function getFirstMediaUrl(value: unknown) {
  const first = Array.isArray(value) ? value[0] : value

  if (typeof first === "string") return first
  if (first && typeof first === "object") {
    return String(
      first.url ||
        first.videoUrl ||
        first.video_url ||
        first.src ||
        first.large ||
        first.full ||
        ""
    )
  }

  return ""
}

function itemToReview(item: ApifyDatasetItem): ScrapedReview | null {
  const text = String(item.reviewText || "").trim()

  if (!text || text.length < 5) return null

  const name = splitName(item.profileName)

  return normalizeReview({
    customer_first_name: name.firstName,
    customer_last_name: name.lastName,
    rating: Number(item.rating || 5),
    review: text,
    image_url: getFirstMediaUrl(item.images),
    video_url: getFirstMediaUrl(item.videos),
    verified: Boolean(item.verifiedPurchase),
    verified_parent: true,
    verified_purchase: Boolean(item.verifiedPurchase),
  })
}

function uniqueReviews(reviews: ScrapedReview[]) {
  return reviews.filter(
    (review, index, array) =>
      review.review.length > 5 &&
      array.findIndex((item) => item.review === review.review) === index
  )
}

async function runAmazonActor(productUrl: string, count: number) {
  const token = getApifyToken()
  const pages = Math.min(Math.max(Math.ceil(count / 10), 1), 10)

  const response = await fetch(
    `https://api.apify.com/v2/actors/${APIFY_ACTOR_ID}/runs?token=${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [productUrl],
        limit: pages,
        region: getAmazonRegion(productUrl),
        language: "all",
        include_variants: true,
        personal_data: true,
        scrape_image_reviews: true,
        scrape_video_reviews: true,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Impossible de lancer l’extracteur Amazon."
    )
  }

  return data?.data
}

async function waitForRun(runId: string) {
  const token = getApifyToken()

  for (let attempt = 0; attempt < 18; attempt++) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      { cache: "no-store" }
    )

    const data = await response.json()
    const status = data?.data?.status

    if (status === "SUCCEEDED") return data?.data

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`L’extracteur Amazon a échoué : ${status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  throw new Error(
    "L’extraction Amazon prend trop de temps. Tu peux relancer cet import depuis l’historique."
  )
}

async function readDatasetItems(datasetId: string, count: number) {
  const token = getApifyToken()

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&limit=${count}&token=${token}`,
    { cache: "no-store" }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error("Impossible de lire les avis Amazon récupérés.")
  }

  return Array.isArray(data) ? data : []
}

export async function scrapeAmazonReviewsWithApify(
  productUrl: string,
  count: number
): Promise<ScrapedReview[]> {
  const run = await runAmazonActor(productUrl, count)

  if (!run?.id) {
    throw new Error("L’extracteur Amazon n’a pas démarré correctement.")
  }

  const completedRun = await waitForRun(run.id)
  const datasetId = completedRun.defaultDatasetId || run.defaultDatasetId

  if (!datasetId) {
    throw new Error("Résultats Amazon introuvables.")
  }

  const items: ApifyDatasetItem[] = await readDatasetItems(datasetId, count)
  const reviews = items
    .map(itemToReview)
    .filter((review): review is ScrapedReview => review !== null)

  return uniqueReviews(reviews).slice(0, count)
}
