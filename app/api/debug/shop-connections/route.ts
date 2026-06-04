import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET() {
  try {
    const result = await sql`
      SELECT
        shop,
        created_at,
        updated_at
      FROM shop_connections
      ORDER BY updated_at DESC
    `

    return NextResponse.json({
      success: true,
      connections: result.rows,
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