import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET() {
  try {
    const result = await sql`
      SELECT
        id,
        shop,
        shopify_product_id,
        title,
        handle,
        image_url,
        price,
        status,
        created_at,
        updated_at
      FROM products
      ORDER BY title ASC
    `

    return NextResponse.json({
      success: true,
      products: result.rows,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        products: [],
        error: String(error),
      },
      { status: 500 }
    )
  }
}