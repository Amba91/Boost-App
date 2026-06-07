import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { scrapeAliExpressReviewsWithApify } from "../../../../../lib/scraper-engine/apify-aliexpress"
import type { ScrapedReview } from "../../../../../lib/scraper-engine/types"

export const maxDuration = 60

export async function POST(request: Request) {
  let jobId = 0

  try {
    const body = await request.json()

    jobId = Number(body.id)
    const requestedCount = Number(body.count || 10)
    const count = Math.min(Math.max(requestedCount, 1), 100)

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
    } else {
      throw new Error(
        `Extraction ${job.platform} pas encore disponible dans Boost Scraper Engine.`
      )
    }

    if (scrapedReviews.length === 0) {
      throw new Error(
        "Aucun avis réel récupéré depuis Apify. Boost n’a importé aucun faux avis."
      )
    }

    let imported = 0

    for (const review of scrapedReviews) {
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
      message: `${imported} avis AliExpress réel(s) importé(s) via Apify en brouillon.`,
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