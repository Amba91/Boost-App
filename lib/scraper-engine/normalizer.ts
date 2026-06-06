import type { ScrapedReview } from "./types"

export function normalizeRating(value: unknown) {
  const rating = Number(value || 5)

  if (Number.isNaN(rating)) return 5
  if (rating < 1) return 1
  if (rating > 5) return 5

  return Math.round(rating)
}

export function normalizeReview(input: Partial<ScrapedReview>): ScrapedReview {
  return {
    customer_first_name: input.customer_first_name || "Client",
    customer_last_name: input.customer_last_name || "",
    rating: normalizeRating(input.rating),
    review: input.review || "",
    image_url: input.image_url || "",
    video_url: input.video_url || "",
    verified: input.verified ?? true,
    verified_parent: input.verified_parent ?? true,
    verified_purchase: input.verified_purchase ?? true,
  }
}