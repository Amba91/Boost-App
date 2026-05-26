import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json({
        success: false,
        error: "Shop manquant",
      })
    }

    await sql`
      INSERT INTO widgets (shop, widget, active)
      VALUES (${shop}, 'sticky-cart', true)
    `

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json({
      success: false,
      error: "Erreur serveur",
    })
  }
}