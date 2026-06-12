import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { registerMailAutomationWebhooks } from "../../../../lib/shopify-delivery-webhook"

const SHOP = "hy4nf1-dt.myshopify.com"

function authorized(request: Request) {
  const received = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SHOPIFY_WEBHOOK_SYNC_SECRET
  return Boolean(
    (cronSecret && received === `Bearer ${cronSecret}`) ||
      (syncSecret && received === `Bearer ${syncSecret}`)
  )
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
