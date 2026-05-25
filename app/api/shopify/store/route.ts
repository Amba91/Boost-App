import { NextResponse } from "next/server"
import { cookies } from "next/headers"

async function shopifyGraphQL(shop: string, accessToken: string, query: string) {
  const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query }),
  })

  return response.json()
}

export async function GET() {
  const cookieStore = await cookies()

  const shop = cookieStore.get("boost_shop")?.value
  const token = cookieStore.get("boost_token")?.value

  if (!shop || !token) {
    return NextResponse.json({
      shop: "kiidiiz.myshopify.com",
      revenue: "0€",
      orders: 0,
      conversion: "0%",
      aov: "0€",
      connected: false,
    })
  }

  const query = `
    {
      shop {
        name
        myshopifyDomain
      }
      orders(first: 50) {
        edges {
          node {
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `

  const data = await shopifyGraphQL(shop, token, query)
  const orders = data?.data?.orders?.edges || []

  const revenueNumber = orders.reduce((total: number, order: any) => {
    return total + Number(order.node.totalPriceSet.shopMoney.amount)
  }, 0)

  const aov = orders.length > 0 ? revenueNumber / orders.length : 0

  return NextResponse.json({
    shop,
    revenue: `${revenueNumber.toFixed(2)}€`,
    orders: orders.length,
    conversion: "3.62%",
    aov: `${aov.toFixed(2)}€`,
    connected: true,
  })
}