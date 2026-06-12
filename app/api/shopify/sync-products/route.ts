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
        id?: string
        title?: string
        sku?: string
        price?: string
        selectedOptions?: {
          name?: string
          value?: string
        }[]
        image?: {
          url?: string
        } | null
      }
    }[]
  }
}

async function ensureProductVariantsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS product_variants (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      product_db_id INTEGER,
      shopify_product_id TEXT NOT NULL,
      shopify_variant_id TEXT NOT NULL UNIQUE,
      product_title TEXT NOT NULL,
      product_handle TEXT NOT NULL,
      variant_title TEXT NOT NULL,
      sku TEXT NOT NULL DEFAULT '',
      selected_options JSONB NOT NULL DEFAULT '[]',
      image_url TEXT NOT NULL DEFAULT '',
      price TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}

async function getShopConnectionFromCookies() {
  const cookieStore = await cookies()

  const shop = cookieStore.get("boost_shop")?.value
  const token = cookieStore.get("boost_token")?.value

  if (shop && token) {
    return {
      shop,
      token,
    }
  }

  return null
}

async function getShopConnectionFromDatabase() {
  const result = await sql`
    SELECT shop, access_token
    FROM shop_connections
    ORDER BY updated_at DESC
    LIMIT 1
  `

  const connection = result.rows[0]

  if (!connection?.shop || !connection?.access_token) {
    return null
  }

  return {
    shop: connection.shop as string,
    token: connection.access_token as string,
  }
}

export async function POST() {
  try {
    await ensureProductVariantsTable()
    const cookieConnection = await getShopConnectionFromCookies()
    const databaseConnection = cookieConnection || (await getShopConnectionFromDatabase())

    if (!databaseConnection) {
      return NextResponse.json(
        {
          success: false,
          error: "Shopify non connecté",
          synced: 0,
        },
        { status: 401 }
      )
    }

    const { shop, token } = databaseConnection

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
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      url
                    }
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
        const variants = product.variants?.edges || []
        const firstVariant = variants[0]?.node

        return {
          shopify_product_id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          image_url: product.featuredImage?.url || "",
          price: firstVariant?.price || "",
          variants: variants.map((variantEdge) => variantEdge.node).filter(Boolean),
        }
      }) || []

    let synced = 0
    let variantsSynced = 0

    for (const product of products) {
      const productResult = await sql`
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
          shop = EXCLUDED.shop,
          title = EXCLUDED.title,
          handle = EXCLUDED.handle,
          image_url = EXCLUDED.image_url,
          price = EXCLUDED.price,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING id
      `

      const productDbId = productResult.rows[0]?.id

      for (const variant of product.variants || []) {
        if (!variant?.id) continue

        await sql`
          INSERT INTO product_variants (
            shop,
            product_db_id,
            shopify_product_id,
            shopify_variant_id,
            product_title,
            product_handle,
            variant_title,
            sku,
            selected_options,
            image_url,
            price,
            updated_at
          )
          VALUES (
            ${shop},
            ${productDbId},
            ${product.shopify_product_id},
            ${variant.id},
            ${product.title},
            ${product.handle},
            ${variant.title || "Default Title"},
            ${variant.sku || ""},
            ${JSON.stringify(variant.selectedOptions || [])}::jsonb,
            ${variant.image?.url || product.image_url || ""},
            ${variant.price || ""},
            NOW()
          )
          ON CONFLICT (shopify_variant_id)
          DO UPDATE SET
            shop = EXCLUDED.shop,
            product_db_id = EXCLUDED.product_db_id,
            shopify_product_id = EXCLUDED.shopify_product_id,
            product_title = EXCLUDED.product_title,
            product_handle = EXCLUDED.product_handle,
            variant_title = EXCLUDED.variant_title,
            sku = EXCLUDED.sku,
            selected_options = EXCLUDED.selected_options,
            image_url = EXCLUDED.image_url,
            price = EXCLUDED.price,
            updated_at = NOW()
        `

        variantsSynced++
      }

      synced++
    }

    return NextResponse.json({
      success: true,
      shop,
      synced,
      variants_synced: variantsSynced,
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
