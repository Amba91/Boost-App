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

    const deletedReviews = await sql`
      DELETE FROM product_reviews
      WHERE import_job_id = ${jobId}
      RETURNING id
    `

    const deletedJob = await sql`
      DELETE FROM review_import_jobs
      WHERE id = ${jobId}
      RETURNING id
    `

    if (deletedJob.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Import introuvable",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted_job_id: jobId,
      deleted_reviews: deletedReviews.rows.length,
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