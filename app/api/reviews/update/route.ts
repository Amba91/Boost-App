import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const id = Number(body.id)

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id obligatoire" },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE product_reviews
      SET
        product_handle = ${body.product_handle || ""},
        customer_first_name = ${body.customer_first_name || ""},
        customer_last_name = ${body.customer_last_name || ""},
        rating = ${Number(body.rating || 5)},
        review = ${body.review || ""},
        image_url = ${body.image_url || ""},
        video_url = ${body.video_url || ""},
        verified = ${body.verified ?? true},
        verified_parent = ${body.verified_parent ?? true},
        verified_purchase = ${body.verified_purchase ?? true},
        visible = ${body.visible ?? true},
        merchant_reply = ${body.merchant_reply || ""}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Avis introuvable" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      review: result.rows[0],
      message: "Avis mis à jour avec succès",
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}