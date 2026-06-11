import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewPriorityColumn } from "../../../../lib/reviews-schema"

const SHOP = "kiidiiz.com"

export async function GET() {
  try {
    await ensureReviewPriorityColumn()

    const result = await sql`
      SELECT *
      FROM product_reviews
      WHERE shop = ${SHOP}
      ORDER BY featured DESC, created_at DESC
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
