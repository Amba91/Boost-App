import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const demoReviews = [
  ["Sophie", "Martin", 5, "Très bon produit, conforme à la description. Mon enfant adore jouer avec."],
  ["Camille", "Dubois", 5, "Livraison rapide et produit de qualité. Je recommande."],
  ["Thomas", "Bernard", 4, "Bon rapport qualité-prix. Le produit correspond aux photos."],
  ["Marie", "Moreau", 5, "Très satisfaite de mon achat. Mon enfant joue avec tous les jours."],
  ["Julien", "Petit", 5, "Produit solide et facile à utiliser."],
  ["Claire", "Roux", 4, "Très bonne surprise, conforme à mes attentes."],
  ["Nicolas", "Laurent", 5, "Excellent produit. Livraison sans problème."],
  ["Émilie", "Simon", 5, "Mon enfant est ravi. Je recommande vivement."],
  ["Antoine", "Michel", 4, "Bonne qualité générale. Rien à signaler."],
  ["Catherine", "Robert", 5, "Très beau produit, exactement comme sur les photos."],

]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const jobId = Number(body.id)

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
          ${review[0]},
          ${review[1]},
          ${review[2]},
          ${review[3]},
          '',
          '',
          true,
          true,
          true,
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
          updated_at = NOW()
      WHERE id = ${jobId}
    `

    return NextResponse.json({
      success: true,
      imported,
      message: `${imported} avis importé(s) en brouillon. Tu peux maintenant choisir lesquels afficher.`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}