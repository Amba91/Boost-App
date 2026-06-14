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
        email
        contactEmail
        myshopifyDomain
        primaryDomain {
          url
        }
        billingAddress {
          company
          address1
          address2
          zip
          city
          country
          phone
        }
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
    const shopData = data?.data?.shop || {}
    let logoUrl = ""

    try {
      const brandData = await shopifyGraphQL(
        shop,
        token,
        `
          {
            shop {
              brand {
                logo {
                  image {
                    url
                  }
                }
                squareLogo {
                  image {
                    url
                  }
                }
              }
            }
          }
        `
      )

      logoUrl =
        brandData?.data?.shop?.brand?.logo?.image?.url ||
        brandData?.data?.shop?.brand?.squareLogo?.image?.url ||
        ""
    } catch {
      logoUrl = ""
    }

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
      shop_name: shopData.name || "",
      invoice_profile: {
        logo_url: logoUrl,
        brand_name: shopData.name || "",
        company_name: shopData.billingAddress?.company || shopData.name || "",
        address: [shopData.billingAddress?.address1, shopData.billingAddress?.address2]
          .filter(Boolean)
          .join(", "),
        zip: shopData.billingAddress?.zip || "",
        city: shopData.billingAddress?.city || "",
        country: shopData.billingAddress?.country || "",
        phone: shopData.billingAddress?.phone || "",
        email: shopData.contactEmail || shopData.email || "",
        website: shopData.primaryDomain?.url || `https://${shopData.myshopifyDomain || shop}`,
      },

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
