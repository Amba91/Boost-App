import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const requestedShop = searchParams.get("shop") || ""

    const shop =
      requestedShop === "kiidiiz.com"
        ? "hy4nf1-dt.myshopify.com"
        : requestedShop || "hy4nf1-dt.myshopify.com"

    const result = await sql`
      SELECT widget, active FROM widgets
      WHERE shop = ${shop}
    `

    const widgets: Record<string, boolean> = {}

    for (const row of result.rows) {
      widgets[row.widget] = row.active
    }

    return NextResponse.json({
      success: true,
      requestedShop,
      shop,
      widgets,
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