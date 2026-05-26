import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const shop = body.shop || "hy4nf1-dt.myshopify.com"

    const existing = await sql`
      SELECT id FROM widgets
      WHERE shop = ${shop}
      AND widget = 'sticky-cart'
      LIMIT 1
    `

    if (existing.rows.length === 0) {
      await sql`
        INSERT INTO widgets (shop, widget, active)
        VALUES (${shop}, 'sticky-cart', true)
      `
    } else {
      await sql`
        UPDATE widgets
        SET active = true
        WHERE shop = ${shop}
        AND widget = 'sticky-cart'
      `
    }

    return NextResponse.json({
      success: true,
      message: "Sticky Cart activé",
      shop,
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

export async function GET() {
  try {
    const shop = "hy4nf1-dt.myshopify.com"

    const result = await sql`
      SELECT * FROM widgets
      WHERE shop = ${shop}
      AND widget = 'sticky-cart'
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      data: result.rows[0] || null,
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