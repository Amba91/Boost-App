import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { shopifyGraphQL } from "@/lib/shopify"

export async function GET() {
  const cookieStore = await cookies()

  const shop = cookieStore.get("boost_shop")?.value
  const token = cookieStore.get("boost_token")?.value

  if (!shop || !token) {
    return NextResponse.json({
      connected: false,
    })
  }

  const query = `
    {
      shop {
        name
      }
    }
  `

  const data = await shopifyGraphQL(shop, token, query)

  return NextResponse.json({
    connected: true,
    shop,
    data,
  })
}