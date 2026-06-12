import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { registerMailAutomationWebhooks } from "../../../../lib/shopify-delivery-webhook"

const SHOP = "hy4nf1-dt.myshopify.com"

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`)
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  try {
    const connection = await sql`
      SELECT access_token
      FROM shop_connections
      WHERE shop = ${SHOP}
      LIMIT 1
    `
    const token = connection.rows[0]?.access_token
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Connexion Shopify introuvable." },
        { status: 404 }
      )
    }

    const result = await registerMailAutomationWebhooks(SHOP, token)
    return NextResponse.json({ success: result.success, result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
