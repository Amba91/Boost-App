import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const result = await sql`
      SELECT
        id,
        product_handle,
        source_url,
        platform,
        status,
        imported_count,
        error_message,
        created_at,
        updated_at
      FROM review_import_jobs
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json(
      {
        success: true,
        jobs: result.rows,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        jobs: [],
        error: String(error),
      },
      { status: 500 }
    )
  }
}