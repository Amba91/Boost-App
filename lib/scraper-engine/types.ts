export type ScraperPlatform =
  | "aliexpress"
  | "amazon"
  | "loox"
  | "judge_me"
  | "ryviu"
  | "unknown"

export type ScrapedReview = {
  customer_first_name: string
  customer_last_name: string
  rating: number
  review: string
  image_url?: string
  video_url?: string
  verified?: boolean
  verified_parent?: boolean
  verified_purchase?: boolean
}