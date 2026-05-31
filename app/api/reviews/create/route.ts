import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(request: Request) {
  try {
    const body = await request.json()

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
        merchant_reply
      )
      VALUES (
        ${body.shop || "kiidiiz.com"},
        ${body.product_handle},
        ${body.customer_first_name || ""},
        ${body.customer_last_name || ""},
        ${Number(body.rating || 5)},
        ${body.review || ""},
        ${body.image_url || ""},
        ${body.video_url || ""},
        ${body.verified ?? true},
        ${body.verified_parent ?? true},
        ${body.verified_purchase ?? true},
        ${body.visible ?? true},
        ${body.merchant_reply || ""}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}