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

      orders(first: 50) {
        edges {
          node {
            totalPriceSet {
              shopMoney {
                amount
              }
            }
          }
        }
      }
    }
  `

  try {
    const data = await shopifyGraphQL(shop, token, query)

    const orders = data?.data?.orders?.edges || []

    const revenue = orders.reduce(
      (total: number, order: any) =>
        total +
        Number(
          order.node.totalPriceSet.shopMoney.amount
        ),
      0
    )

    return NextResponse.json({
      connected: true,
      shop,

      revenue: `${revenue.toFixed(2)}€`,
      orders: orders.length,

      conversion: "3.2%",
      aov:
        orders.length > 0
          ? `${(revenue / orders.length).toFixed(2)}€`
          : "0€",
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: "Shopify API error",
    })
  }
}