import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const shop = searchParams.get("shop")
    const productHandle = searchParams.get("product_handle")

    if (!shop || !productHandle) {
      return NextResponse.json(
        {
          success: false,
          error: "shop et product_handle sont obligatoires",
        },
        { status: 400, headers: corsHeaders }
      )
    }

    const result = await sql`
      SELECT *
      FROM product_reviews
      WHERE shop = ${shop}
      AND product_handle = ${productHandle}
      AND visible = TRUE
      ORDER BY created_at DESC
    `

    return NextResponse.json(
      {
        success: true,
        reviews: result.rows,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500, headers: corsHeaders }
    )
  }
}