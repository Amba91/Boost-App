import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "kiidiiz.com"

export async function GET() {
  try {
    const result = await sql`
      SELECT *
      FROM product_reviews
      WHERE shop = ${SHOP}
      ORDER BY created_at DESC
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