import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Sales Popups installé sur Shopify",
    scriptUrl:
      "https://boost-app-9e6w.vercel.app/api/widgets/sales-popups/script",
  })
}