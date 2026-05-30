import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"
const WIDGET = "upsell"

export async function GET() {
  try {
    const result = await sql`
      SELECT active
      FROM widgets
      WHERE shop = ${SHOP}
      AND widget = ${WIDGET}
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      active: result.rows[0]?.active ?? false,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        active: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const active = typeof body.active === "boolean" ? body.active : true

    const existing = await sql`
      SELECT id
      FROM widgets
      WHERE shop = ${SHOP}
      AND widget = ${WIDGET}
      LIMIT 1
    `

    if (existing.rows.length === 0) {
      await sql`
        INSERT INTO widgets (shop, widget, active)
        VALUES (${SHOP}, ${WIDGET}, ${active})
      `
    } else {
      await sql`
        UPDATE widgets
        SET active = ${active}
        WHERE shop = ${SHOP}
        AND widget = ${WIDGET}
      `
    }

    return NextResponse.json({
      success: true,
      active,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        active: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}