import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { shopifyGraphQL } from "@/lib/shopify"

export async function GET() {
  const cookieStore = await cookies()

  const shop = cookieStore.get("boost_shop")?.value
  const token = cookieStore.get("boost_token")?.value

  if (!shop || !token) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        products: [],
        error: "Shopify non connecté",
      },
      { status: 401 }
    )
  }

  const query = `
    {
      products(first: 100, sortKey: TITLE) {
        edges {
          node {
            id
            title
            handle
            status
            featuredImage {
              url
              altText
            }
            variants(first: 1) {
              edges {
                node {
                  price
                }
              }
            }
          }
        }
      }
    }
  `

  try {
    const data = await shopifyGraphQL(shop, token, query)

    const products =
      data?.data?.products?.edges?.map((edge: any) => {
        const product = edge.node
        const firstVariant = product.variants?.edges?.[0]?.node

        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          image_url: product.featuredImage?.url || "",
          image_alt: product.featuredImage?.altText || "",
          price: firstVariant?.price || "",
        }
      }) || []

    return NextResponse.json({
      success: true,
      connected: true,
      shop,
      products,
    })
  } catch (error) {
    console.error("SHOPIFY PRODUCTS API ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        connected: false,
        products: [],
        error: "Erreur pendant la récupération des produits Shopify",
      },
      { status: 500 }
    )
  }
}