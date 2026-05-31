import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "id obligatoire",
        },
        { status: 400 }
      )
    }

    await sql`
      DELETE FROM product_reviews
      WHERE id = ${Number(id)}
    `

    return NextResponse.json({
      success: true,
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