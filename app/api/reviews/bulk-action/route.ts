import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const productHandle = String(body.product_handle || "").trim()
    const action = String(body.action || "").trim()

    if (!productHandle) {
      return NextResponse.json(
        { success: false, error: "product_handle obligatoire" },
        { status: 400 }
      )
    }

    if (!["show_all", "hide_all", "delete_hidden"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action invalide" },
        { status: 400 }
      )
    }

    if (action === "show_all") {
      const result = await sql`
        UPDATE product_reviews
        SET visible = TRUE
        WHERE product_handle = ${productHandle}
        RETURNING id
      `

      return NextResponse.json({
        success: true,
        updated: result.rows.length,
        message: `${result.rows.length} avis rendus visibles.`,
      })
    }

    if (action === "hide_all") {
      const result = await sql`
        UPDATE product_reviews
        SET visible = FALSE
        WHERE product_handle = ${productHandle}
        RETURNING id
      `

      return NextResponse.json({
        success: true,
        updated: result.rows.length,
        message: `${result.rows.length} avis masqués.`,
      })
    }

    const result = await sql`
      DELETE FROM product_reviews
      WHERE product_handle = ${productHandle}
      AND visible = FALSE
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      deleted: result.rows.length,
      message: `${result.rows.length} avis masqués supprimés.`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}