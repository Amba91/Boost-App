import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()

  return NextResponse.json({
    success: true,
    message: "Lifetime access granted",
    shopDomain: body.shopDomain || "kiidiiz.myshopify.com",
    plan: "Pro",
    billingDisabled: true,
  })
}