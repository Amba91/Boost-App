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

    if (!productHandle) {
      return NextResponse.json(
        {
          success: false,
          error: "product_handle est obligatoire",
        },
        { status: 400, headers: corsHeaders }
      )
    }

    let result = await sql`
      SELECT *
      FROM product_reviews
      WHERE shop = ${shop || "kiidiiz.com"}
      AND product_handle = ${productHandle}
      AND visible = TRUE
      ORDER BY created_at DESC
    `

    if (result.rows.length === 0) {
      result = await sql`
        SELECT *
        FROM product_reviews
        WHERE product_handle = ${productHandle}
        AND visible = TRUE
        ORDER BY created_at DESC
      `
    }

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