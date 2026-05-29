import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"
const WIDGET = "sales-popups"

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
        error: String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const active = Boolean(body.active)

    await sql`
      INSERT INTO widgets (shop, widget, active)
      VALUES (${SHOP}, ${WIDGET}, ${active})
      ON CONFLICT (shop, widget)
      DO UPDATE SET active = ${active}
    `

    return NextResponse.json({
      success: true,
      active,
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