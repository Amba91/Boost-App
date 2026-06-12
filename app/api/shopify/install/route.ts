import { NextResponse } from "next/server"

export async function GET() {
  const shop = "hy4nf1-dt.myshopify.com"

  const apiKey = process.env.SHOPIFY_API_KEY
  const appUrl =
    process.env.SHOPIFY_APP_URL || "https://boost-app-9e6w.vercel.app"

  const scopes =
    process.env.SHOPIFY_SCOPES ||
    "read_products,read_orders,write_orders,read_customers,read_inventory,read_fulfillments"

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing SHOPIFY_API_KEY" },
      { status: 500 }
    )
  }

  const redirectUri = `${appUrl}/api/shopify/callback`

  const installUrl =
    `https://${shop}/admin/oauth/authorize?` +
    new URLSearchParams({
      client_id: apiKey,
      scope: scopes,
      redirect_uri: redirectUri,
      state: "boost-secure-state",
    }).toString()

  return NextResponse.redirect(installUrl)
}
