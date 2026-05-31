import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      id,
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
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id obligatoire" },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE product_reviews
      SET
        product_handle = ${product_handle},
        customer_first_name = ${customer_first_name || ""},
        customer_last_name = ${customer_last_name || ""},
        rating = ${Number(rating || 5)},
        review = ${review || ""},
        image_url = ${image_url || ""},
        video_url = ${video_url || ""},
        verified = ${verified ?? false},
        verified_parent = ${verified_parent ?? false},
        verified_purchase = ${verified_purchase ?? false},
        visible = ${visible ?? true},
        merchant_reply = ${merchant_reply || ""}
      WHERE id = ${Number(id)}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      review: result.rows[0],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}