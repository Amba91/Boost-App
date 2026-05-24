import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get("shop")

  if (!shop) {
    return NextResponse.json(
      { error: "Missing shop parameter" },
      { status: 400 }
    )
  }

  const apiKey = process.env.SHOPIFY_API_KEY
  const appUrl = process.env.SHOPIFY_APP_URL || "http://localhost:3000"
  const scopes =
    process.env.SHOPIFY_SCOPES ||
    "read_products,read_orders,write_orders,read_customers,read_inventory"

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing SHOPIFY_API_KEY in .env" },
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