import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    const result = await sql`
      SELECT * FROM widgets
      WHERE shop = ${SHOP}
      AND widget = ${slug}
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      active: result.rows[0]?.active || false,
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

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const body = await request.json()
    const active = typeof body.active === "boolean" ? body.active : true

    const existing = await sql`
      SELECT id FROM widgets
      WHERE shop = ${SHOP}
      AND widget = ${slug}
      LIMIT 1
    `

    if (existing.rows.length === 0) {
      await sql`
        INSERT INTO widgets (shop, widget, active)
        VALUES (${SHOP}, ${slug}, ${active})
      `
    } else {
      await sql`
        UPDATE widgets
        SET active = ${active}
        WHERE shop = ${SHOP}
        AND widget = ${slug}
      `
    }

    return NextResponse.json({
      success: true,
      active,
      widget: slug,
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