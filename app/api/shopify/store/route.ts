import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    shop: "kiidiiz.myshopify.com",
    revenue: "18 945€",
    orders: 1259,
    conversion: "3.62%",
    aov: "65€",
  })
}