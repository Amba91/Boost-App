import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"

export async function GET() {
  const result = await sql`
    SELECT * FROM widgets
    WHERE shop = ${SHOP}
    AND widget = 'sticky-cart'
    LIMIT 1
  `

  if (result.rows.length === 0) {
    await sql`
      INSERT INTO widgets (shop, widget, active)
      VALUES (${SHOP}, 'sticky-cart', true)
    `

    return NextResponse.json({
      success: true,
      active: true,
    })
  }

  return NextResponse.json({
    success: true,
    active: result.rows[0].active,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const active = Boolean(body.active)

  await sql`
    INSERT INTO widgets (shop, widget, active)
    VALUES (${SHOP}, 'sticky-cart', ${active})
    ON CONFLICT DO NOTHING
  `

  await sql`
    UPDATE widgets
    SET active = ${active}
    WHERE shop = ${SHOP}
    AND widget = 'sticky-cart'
  `

  return NextResponse.json({
    success: true,
    active,
  })
}