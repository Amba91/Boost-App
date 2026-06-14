import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewPriorityColumn } from "../../../../lib/reviews-schema"

const SHOP = "kiidiiz.com"

export async function GET() {
  try {
    await ensureReviewPriorityColumn()

    const result = await sql`
      SELECT
        product_reviews.*,
        COALESCE(product_reviews.source, review_import_jobs.platform, 'manual') AS source
      FROM product_reviews
      LEFT JOIN review_import_jobs
        ON review_import_jobs.id = product_reviews.import_job_id
      WHERE product_reviews.shop = ${SHOP}
      ORDER BY product_reviews.featured DESC, product_reviews.created_at DESC
    `

    return NextResponse.json({
      success: true,
      reviews: result.rows,
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
