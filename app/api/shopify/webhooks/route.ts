import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const topic = request.headers.get("x-shopify-topic")
  const shop = request.headers.get("x-shopify-shop-domain")
  const body = await request.json()

  return NextResponse.json({
    success: true,
    topic,
    shop,
    received: true,
    payload: body,
  })
}