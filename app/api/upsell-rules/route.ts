import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "kiidiiz.com"

export async function GET() {
  try {
    const result = await sql`
      SELECT *
      FROM upsell_rules
      WHERE shop = ${SHOP}
      ORDER BY id DESC
    `

    return NextResponse.json(
      { success: true, rules: result.rows },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    await sql`
      INSERT INTO upsell_rules (
        shop,
        source_product,
        target_product,
        upsell_price
      )
      VALUES (
        ${SHOP},
        ${body.sourceProduct},
        ${body.targetProduct},
        ${body.upsellPrice || null}
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