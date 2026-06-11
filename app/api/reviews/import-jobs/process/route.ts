import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { scrapeAliExpressReviewsWithApify } from "../../../../../lib/scraper-engine/apify-aliexpress"
import { scrapeAmazonReviewsWithApify } from "../../../../../lib/scraper-engine/apify-amazon"
import { scrapeShopifyReviewApp } from "../../../../../lib/scraper-engine/shopify-review-apps"
import {
  enhanceReviewsWithOpenAI,
  isSupportedTargetLanguage,
} from "../../../../../lib/scraper-engine/openai-review-enhancer"
import type { ScrapedReview } from "../../../../../lib/scraper-engine/types"

export const maxDuration = 60

export async function POST(request: Request) {
  let jobId = 0

  try {
    const body = await request.json()

    jobId = Number(body.id)
    const requestedCount = Number(body.count || 10)
    const count = Math.min(Math.max(requestedCount, 1), 100)
    const aiEnabled =
      typeof body.ai_enabled === "boolean" ? body.ai_enabled : true
    const requestedTargetLanguage = body.target_language

    if (
      aiEnabled &&
      requestedTargetLanguage !== undefined &&
      !isSupportedTargetLanguage(requestedTargetLanguage)
    ) {
      return NextResponse.json(
        { success: false, error: "Langue cible non prise en charge" },
        { status: 400 }
      )
    }

    const targetLanguage = isSupportedTargetLanguage(
      requestedTargetLanguage
    )
      ? requestedTargetLanguage
      : "fr"

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "ID import obligatoire" },
        { status: 400 }
      )
    }

    const jobResult = await sql`
      SELECT *
      FROM review_import_jobs
      WHERE id = ${jobId}
      LIMIT 1
    `

    const job = jobResult.rows[0]

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Import introuvable" },
        { status: 404 }
      )
    }

    if (job.status === "completed") {
      return NextResponse.json({
        success: true,
        message: "Cet import est déjà terminé.",
        imported: Number(job.imported_count || 0),
      })
    }

    await sql`
      UPDATE review_import_jobs
      SET status = 'processing',
          error_message = NULL,
          updated_at = NOW()
      WHERE id = ${jobId}
    `

    let scrapedReviews: ScrapedReview[] = []

    if (job.platform === "aliexpress") {
      scrapedReviews = await scrapeAliExpressReviewsWithApify(
        job.source_url,
        count
      )
    } else if (job.platform === "amazon") {
      scrapedReviews = await scrapeAmazonReviewsWithApify(job.source_url, count)
    } else if (
      job.platform === "loox" ||
      job.platform === "judge_me" ||
      job.platform === "ryviu"
    ) {
      scrapedReviews = await scrapeShopifyReviewApp(
        job.source_url,
        count,
        job.platform
      )
    } else {
      throw new Error(
        "Plateforme inconnue. Supprime cet import puis recrée-le en choisissant la bonne plateforme."
      )
    }

    if (scrapedReviews.length === 0) {
      throw new Error(
        `Aucun avis réel ${job.platform} n’a été trouvé. Vérifie que le lien ouvre une page publique où les avis sont visibles.`
      )
    }

    const reviewsToImport = aiEnabled
      ? await enhanceReviewsWithOpenAI(scrapedReviews, targetLanguage)
      : scrapedReviews

    let imported = 0
    let skippedDuplicates = 0

    for (const review of reviewsToImport) {
      const duplicate = await sql`
        SELECT id
        FROM product_reviews
        WHERE shop = 'kiidiiz.com'
        AND product_handle = ${job.product_handle}
        AND LOWER(TRIM(review)) = LOWER(TRIM(${review.review}))
        LIMIT 1
      `

      if (duplicate.rows.length > 0) {
        skippedDuplicates++
        continue
      }

      await sql`
        INSERT INTO product_reviews (
          shop,
          product_handle,
          customer_first_name,
          customer_last_name,
          rating,
          review,
          image_url,
          video_url,
          verified,
          verified_parent,
          verified_purchase,
          visible,
          merchant_reply,
          import_job_id
        )
        VALUES (
          'kiidiiz.com',
          ${job.product_handle},
          ${review.customer_first_name},
          ${review.customer_last_name},
          ${review.rating},
          ${review.review},
          ${review.image_url || ""},
          ${review.video_url || ""},
          ${review.verified ?? true},
          ${review.verified_parent ?? true},
          ${review.verified_purchase ?? true},
          false,
          '',
          ${jobId}
        )
      `

      imported++
    }

    await sql`
      UPDATE review_import_jobs
      SET status = 'completed',
          imported_count = ${imported},
          error_message = NULL,
          updated_at = NOW()
      WHERE id = ${jobId}
    `

    return NextResponse.json({
      success: true,
      imported,
      skipped_duplicates: skippedDuplicates,
      message: `${
        aiEnabled
          ? `${imported} avis ${job.platform} réel(s) traduit(s), corrigé(s) et amélioré(s) par IA.`
          : `${imported} avis ${job.platform} réel(s) importé(s) sans traitement IA.`
      }${
        skippedDuplicates > 0
          ? ` ${skippedDuplicates} doublon(s) ignoré(s).`
          : ""
      }`,
    })
  } catch (error) {
    const message = String(error)

    if (jobId) {
      await sql`
        UPDATE review_import_jobs
        SET status = 'failed',
            error_message = ${message},
            updated_at = NOW()
        WHERE id = ${jobId}
      `
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
