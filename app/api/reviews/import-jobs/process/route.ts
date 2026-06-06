import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const jobId = Number(body.id)

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID import obligatoire",
        },
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
        {
          success: false,
          error: "Import introuvable",
        },
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

    const demoReviews = [
      {
        firstName: "Sarah",
        lastName: "M.",
        rating: 5,
        review:
          "Très bon produit, conforme à la description. Mon enfant adore jouer avec.",
      },
      {
        firstName: "Nadia",
        lastName: "K.",
        rating: 5,
        review:
          "Livraison correcte et produit pratique. Je suis satisfaite de mon achat.",
      },
      {
        firstName: "Amine",
        lastName: "B.",
        rating: 4,
        review:
          "Bon rapport qualité-prix. Le produit correspond bien aux photos.",
      },
    ]

    let imported = 0

    for (const review of demoReviews) {
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
          ${review.firstName},
          ${review.lastName},
          ${review.rating},
          ${review.review},
          '',
          '',
          true,
          true,
          true,
          true,
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
          updated_at = NOW()
      WHERE id = ${jobId}
    `

    return NextResponse.json({
      success: true,
      imported,
      message: `${imported} avis de test importé(s) avec succès.`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}