import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { scrapeAliExpressReviews } from "../../../../../lib/scraper-engine/aliexpress"
import type { ScrapedReview } from "../../../../../lib/scraper-engine/types"

const fallbackReviews: ScrapedReview[] = [
  {
    customer_first_name: "Sophie",
    customer_last_name: "Martin",
    rating: 5,
    review:
      "Très bon produit, conforme à la description. Mon enfant adore jouer avec.",
  },
  {
    customer_first_name: "Camille",
    customer_last_name: "Dubois",
    rating: 5,
    review: "Livraison rapide et produit de qualité. Je recommande.",
  },
  {
    customer_first_name: "Thomas",
    customer_last_name: "Bernard",
    rating: 4,
    review: "Bon rapport qualité-prix. Le produit correspond aux photos.",
  },
  {
    customer_first_name: "Marie",
    customer_last_name: "Moreau",
    rating: 5,
    review:
      "Très satisfaite de mon achat. Mon enfant joue avec tous les jours.",
  },
  {
    customer_first_name: "Julien",
    customer_last_name: "Petit",
    rating: 5,
    review: "Produit solide et facile à utiliser.",
  },
  {
    customer_first_name: "Claire",
    customer_last_name: "Roux",
    rating: 4,
    review: "Très bonne surprise, conforme à mes attentes.",
  },
  {
    customer_first_name: "Nicolas",
    customer_last_name: "Laurent",
    rating: 5,
    review: "Excellent produit. Livraison sans problème.",
  },
  {
    customer_first_name: "Émilie",
    customer_last_name: "Simon",
    rating: 5,
    review: "Mon enfant est ravi. Je recommande vivement.",
  },
  {
    customer_first_name: "Antoine",
    customer_last_name: "Michel",
    rating: 4,
    review: "Bonne qualité générale. Rien à signaler.",
  },
  {
    customer_first_name: "Catherine",
    customer_last_name: "Robert",
    rating: 5,
    review: "Très beau produit, exactement comme sur les photos.",
  },
]

function buildFallbackReviews(count: number) {
  const reviews: ScrapedReview[] = []

  for (let index = 0; index < count; index++) {
    reviews.push(fallbackReviews[index % fallbackReviews.length])
  }

  return reviews
}

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
    let usedFallback = false

    if (job.platform === "aliexpress") {
      try {
        scrapedReviews = await scrapeAliExpressReviews(job.source_url, count)
      } catch {
        scrapedReviews = []
      }
    } else {
      throw new Error(
        `Extraction ${job.platform} pas encore disponible dans Boost Scraper Engine.`
      )
    }

    if (scrapedReviews.length === 0) {
      usedFallback = true
      scrapedReviews = buildFallbackReviews(count)
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
          error_message = ${usedFallback
            ? "Aucun avis réel récupéré. Boost a utilisé des avis brouillons intelligents."
            : null},
          updated_at = NOW()
      WHERE id = ${jobId}
    `

    return NextResponse.json({
      success: true,
      imported,
      fallback: usedFallback,
      message: usedFallback
        ? `${imported} avis brouillons intelligents importé(s).`
        : `${imported} avis AliExpress réel(s) importé(s) en brouillon.`,
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