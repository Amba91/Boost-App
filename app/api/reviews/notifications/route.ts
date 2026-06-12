import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewPriorityColumn } from "../../../../lib/reviews-schema"

export async function GET() {
  try {
    await ensureReviewPriorityColumn()

    const result = await sql`
      SELECT
        COUNT(*)::int AS pending_count,
        MAX(created_at) AS latest_created_at
      FROM product_reviews
      WHERE shop = 'kiidiiz.com'
      AND source = 'storefront'
      AND visible = FALSE
    `

    return NextResponse.json(
      {
        success: true,
        pending_count: Number(result.rows[0]?.pending_count || 0),
        latest_created_at: result.rows[0]?.latest_created_at || null,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error), pending_count: 0 },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
