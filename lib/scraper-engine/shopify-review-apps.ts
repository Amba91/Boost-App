import chromium from "@sparticuz/chromium"
import { chromium as playwrightChromium } from "playwright-core"
import type { ScrapedReview, ScraperPlatform } from "./types"
import { normalizeReview } from "./normalizer"

type ReviewAppPlatform = Extract<
  ScraperPlatform,
  "loox" | "judge_me" | "ryviu"
>

type RawReview = Record<string, any>

function splitName(fullName: unknown) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] || "Client",
    lastName: parts.slice(1).join(" "),
  }
}

function firstUrl(value: unknown) {
  const first = Array.isArray(value) ? value[0] : value

  if (typeof first === "string") return first
  if (first && typeof first === "object") {
    return String(
      first.url ||
        first.src ||
        first.image_url ||
        first.video_url ||
        first.videoUrl ||
        first.large ||
        first.full ||
        ""
    )
  }

  return ""
}

function findReviewsInObject(value: unknown): RawReview[] {
  const reviews: RawReview[] = []

  function walk(node: any, path: string) {
    if (!node) return

    if (Array.isArray(node)) {
      for (const item of node) walk(item, path)
      return
    }

    if (typeof node !== "object") return

    const text =
      node.reviewText ||
      node.review_body ||
      node.reviewBody ||
      node.review ||
      node.body ||
      node.content ||
      node.comment

    const rating =
      node.rating ||
      node.score ||
      node.stars ||
      node.reviewRating?.ratingValue

    const reviewContext =
      path.includes("review") ||
      Object.keys(node).some((key) => key.toLowerCase().includes("review"))

    if (text && rating && reviewContext && String(text).trim().length >= 5) {
      reviews.push(node)
    }

    for (const [key, child] of Object.entries(node)) {
      walk(child, `${path}.${key.toLowerCase()}`)
    }
  }

  walk(value, "")

  return reviews
}

function rawToReview(raw: RawReview): ScrapedReview | null {
  const text = String(
    raw.reviewText ||
      raw.review_body ||
      raw.reviewBody ||
      raw.review ||
      raw.body ||
      raw.content ||
      raw.comment ||
      ""
  ).trim()

  if (text.length < 5) return null

  const author =
    (typeof raw.author === "string" ? raw.author : raw.author?.name) ||
    raw.authorName ||
    raw.display_name ||
    raw.displayName ||
    raw.reviewer ||
    raw.reviewer_name ||
    raw.reviewerName ||
    raw.customer_name ||
    raw.customerName ||
    raw.user?.name ||
    raw.user_name ||
    raw.nickname ||
    raw.name ||
    "Client"
  const name = splitName(author)
  const rating =
    raw.rating || raw.score || raw.stars || raw.reviewRating?.ratingValue || 5

  return normalizeReview({
    customer_first_name: name.firstName,
    customer_last_name: name.lastName,
    rating: Number(rating),
    review: text,
    image_url: firstUrl(
      raw.images ||
        raw.photos ||
        raw.media ||
        raw.pictures ||
        raw.picture_urls ||
        raw.photo_urls ||
        raw.image ||
        raw.image_url ||
        raw.photo ||
        raw.photo_url
    ),
    video_url: firstUrl(
      raw.videos || raw.video || raw.video_url || raw.videoUrl
    ),
    verified: raw.verified ?? raw.verified_purchase ?? true,
    verified_parent: true,
    verified_purchase: raw.verified_purchase ?? raw.verified ?? true,
  })
}

function uniqueReviews(reviews: ScrapedReview[]) {
  return reviews.filter(
    (review, index, array) =>
      review.review.length > 5 &&
      array.findIndex((item) => item.review === review.review) === index
  )
}

export function extractReviewsFromReviewAppData(
  value: unknown,
  count: number
) {
  const reviews = findReviewsInObject(value)
    .map(rawToReview)
    .filter((review): review is ScrapedReview => review !== null)

  return uniqueReviews(reviews).slice(0, count)
}

export async function scrapeShopifyReviewApp(
  productUrl: string,
  count: number,
  platform: ReviewAppPlatform
): Promise<ScrapedReview[]> {
  let browser: any = null
  const rawReviews: RawReview[] = []

  try {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      locale: "fr-FR",
    })

    page.on("response", async (response: any) => {
      try {
        const responseUrl = response.url().toLowerCase()
        const relevantResponse =
          responseUrl.includes("review") ||
          responseUrl.includes("loox") ||
          responseUrl.includes("judge.me") ||
          responseUrl.includes("judgeme") ||
          responseUrl.includes("ryviu")

        if (!relevantResponse) return

        const contentType = response.headers()["content-type"] || ""

        if (!contentType.includes("json")) return

        const data = await response.json()
        rawReviews.push(...findReviewsInObject(data))
      } catch {
        // Certaines réponses du widget ne sont pas lisibles, on les ignore.
      }
    })

    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 35000,
    })

    await page.waitForTimeout(4000)
    await page.mouse.wheel(0, 2400)
    await page.waitForTimeout(2500)

    const domReviews = await page.evaluate((selectedPlatform: string) => {
      const selectors: Record<string, string[]> = {
        loox: [".loox-review", "[data-lx-review]", "[data-loox-review]"],
        judge_me: [".jdgm-rev", "[data-review-id]", ".jdgm-review-widget--small"],
        ryviu: [
          ".ryviu-review",
          ".ryviu-review-item",
          ".r--review-item",
          "[data-ryviu-review]",
        ],
      }

      const textSelectors = [
        ".jdgm-rev__body",
        ".loox-review-content",
        ".r--content-review",
        ".review-content",
        "[data-review-content]",
      ]
      const authorSelectors = [
        ".jdgm-rev__author",
        ".jdgm-rev__buyer-badge + span",
        ".loox-review-author",
        ".loox-reviewer-name",
        ".r--author",
        ".r--author-name",
        ".review-author",
        "[data-review-author]",
      ]
      const mediaSelectors = [
        ".jdgm-rev__pic-link img",
        ".jdgm-rev__pics img",
        ".loox-review-image",
        ".loox-review-photo img",
        ".r--review-images img",
        ".review-images img",
        "[data-review-image]",
      ]
      const videoSelectors = [
        ".jdgm-rev video",
        ".loox-review video",
        ".ryviu-review video",
        ".r--review-item video",
      ]

      const elements = Array.from(
        document.querySelectorAll((selectors[selectedPlatform] || []).join(","))
      ).slice(0, 100)

      return elements.map((element) => {
        const findText = (candidates: string[]) => {
          for (const selector of candidates) {
            const value = element.querySelector(selector)?.textContent?.trim()
            if (value) return value
          }
          return ""
        }

        const ratingSource =
          element.getAttribute("data-rating") ||
          element.querySelector("[data-rating]")?.getAttribute("data-rating") ||
          element
            .querySelector("[aria-label*='star']")
            ?.getAttribute("aria-label") ||
          "5"
        const ratingMatch = ratingSource.match(/[1-5](?:[.,]\d)?/)
        const findMedia = (candidates: string[], attribute: string) => {
          for (const selector of candidates) {
            const media = element.querySelector(selector)
            const value =
              media?.getAttribute(attribute) ||
              media?.getAttribute("data-src") ||
              media?.getAttribute("data-lazy-src")
            if (value) return value
          }
          return ""
        }

        return {
          review: findText(textSelectors),
          rating: ratingMatch ? Number(ratingMatch[0].replace(",", ".")) : 5,
          author: findText(authorSelectors),
          image: findMedia(mediaSelectors, "src"),
          video: findMedia(videoSelectors, "src"),
          verified: true,
        }
      })
    }, platform)

    rawReviews.push(...domReviews)

    return extractReviewsFromReviewAppData({ reviews: rawReviews }, count)
  } finally {
    if (browser) await browser.close()
  }
}
