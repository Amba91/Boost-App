import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@vercel/postgres"
import { shopifyGraphQL } from "@/lib/shopify"

type ShopifyProductNode = {
  id: string
  title: string
  handle: string
  status: string
  featuredImage?: {
    url?: string
    altText?: string
  } | null
  variants?: {
    edges?: {
      node?: {
        price?: string
      }
    }[]
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies()

    const shop = cookieStore.get("boost_shop")?.value
    const token = cookieStore.get("boost_token")?.value

    if (!shop || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Shopify non connecté",
          synced: 0,
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

    const data = await shopifyGraphQL(shop, token, query)

    if (data?.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur Shopify GraphQL",
          details: data.errors,
          synced: 0,
        },
        { status: 500 }
      )
    }

    const products =
      data?.data?.products?.edges?.map((edge: { node: ShopifyProductNode }) => {
        const product = edge.node
        const firstVariant = product.variants?.edges?.[0]?.node

        return {
          shopify_product_id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          image_url: product.featuredImage?.url || "",
          price: firstVariant?.price || "",
        }
      }) || []

    let synced = 0

    for (const product of products) {
      await sql`
        INSERT INTO products (
          shop,
          shopify_product_id,
          title,
          handle,
          image_url,
          price,
          status,
          updated_at
        )
        VALUES (
          ${shop},
          ${product.shopify_product_id},
          ${product.title},
          ${product.handle},
          ${product.image_url},
          ${product.price},
          ${product.status},
          NOW()
        )
        ON CONFLICT (shopify_product_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          handle = EXCLUDED.handle,
          image_url = EXCLUDED.image_url,
          price = EXCLUDED.price,
          status = EXCLUDED.status,
          updated_at = NOW()
      `

      synced++
    }

    return NextResponse.json({
      success: true,
      shop,
      synced,
      products,
    })
  } catch (error) {
    console.error("SYNC SHOPIFY PRODUCTS ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: String(error),
        synced: 0,
      },
      { status: 500 }
    )
  }
}