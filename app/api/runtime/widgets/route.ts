import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const shop =
      searchParams.get("shop") || "hy4nf1-dt.myshopify.com"

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