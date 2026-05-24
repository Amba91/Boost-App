import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()

  const shopDomain = body.shopDomain || "kiidiiz.myshopify.com"
  const plan = body.plan || "Pro"

  return NextResponse.json({
    success: true,
    subscription: {
      shopDomain,
      plan,
      status: shopDomain === "kiidiiz.myshopify.com" ? "LIFETIME" : "TRIAL",
      trialDays: 30,
      price: shopDomain === "kiidiiz.myshopify.com" ? 0 : 49,
    },
  })
}