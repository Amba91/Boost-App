import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const shop = searchParams.get("shop")
  const code = searchParams.get("code")

  if (!shop || !code) {
    return NextResponse.json(
      { error: "Missing shop or code from Shopify" },
      { status: 400 }
    )
  }

  return NextResponse.redirect(`/dashboard?shop=${shop}&connected=true`)
}