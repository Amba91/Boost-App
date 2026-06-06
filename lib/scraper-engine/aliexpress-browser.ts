import chromium from "@sparticuz/chromium"
import { chromium as playwrightChromium } from "playwright-core"
import type { ScrapedReview } from "./types"
import { normalizeReview } from "./normalizer"

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
      node.reviewBody ||
      node.review ||
      node.content ||
      node.comment ||
      node.feedback ||
      node.buyerFeedback

    const rating =
      node.rating ||
      node.starRating ||
      node.reviewRating?.ratingValue ||
      node.evaluation

    const author =
      node.author?.name ||
      node.authorName ||
      node.buyerName ||
      node.userName ||
      node.name ||
      "Client"

    if (text && String(text).length > 10) {
      const [firstName, ...lastParts] = String(author).split(" ")

      reviews.push(
        normalizeReview({
          customer_first_name: firstName || "Client",
          customer_last_name: lastParts.join(" "),
          rating: Number(rating || 5),
          review: String(text),
          image_url: "",
          video_url: "",
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
      array.findIndex((item) => item.review === review.review) === index
  )
}

export async function scrapeAliExpressReviewsWithBrowser(
  url: string,
  count: number
): Promise<ScrapedReview[]> {
  let browser: any = null
  const collectedReviews: ScrapedReview[] = []

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

        const looksLikeReviewApi =
          responseUrl.includes("review") ||
          responseUrl.includes("feedback") ||
          responseUrl.includes("evaluation") ||
          responseUrl.includes("aer-jsonapi") ||
          responseUrl.includes("buyer")

        if (!looksLikeReviewApi) return

        const contentType = response.headers()["content-type"] || ""

        if (
          !contentType.includes("application/json") &&
          !contentType.includes("text")
        ) {
          return
        }

        const text = await response.text()

        if (
          !text.includes("review") &&
          !text.includes("feedback") &&
          !text.includes("rating") &&
          !text.includes("star")
        ) {
          return
        }

        try {
          const json = JSON.parse(text)
          collectedReviews.push(...findReviewsInObject(json))
        } catch {
          // Réponse non JSON exploitable
        }
      } catch {
        // On ignore les réponses réseau non lisibles
      }
    })

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    })

    await page.waitForTimeout(8000)

    try {
      await page.mouse.wheel(0, 1800)
      await page.waitForTimeout(4000)
    } catch {
      // Rien
    }

    try {
      const bodyText = await page.textContent("body")

      if (bodyText) {
        const textReviews = bodyText
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 30 && line.length < 400)
          .filter(
            (line: string) =>
              !line.toLowerCase().includes("cookie") &&
              !line.toLowerCase().includes("javascript") &&
              !line.toLowerCase().includes("aliexpress")
          )
          .slice(0, count)

        for (const text of textReviews) {
          collectedReviews.push(
            normalizeReview({
              customer_first_name: "Client",
              customer_last_name: "",
              rating: 5,
              review: text,
            })
          )
        }
      }
    } catch {
      // Rien
    }

    return uniqueReviews(collectedReviews).slice(0, count)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}