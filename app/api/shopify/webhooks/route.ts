import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewRequestTrackingTables } from "../../../../lib/review-request-tracking"

function validShopifyHmac(rawBody: string, receivedHmac: string | null) {
  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret || !receivedHmac) return false

  const calculated = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64")
  const receivedBuffer = Buffer.from(receivedHmac)
  const calculatedBuffer = Buffer.from(calculated)

  return (
    receivedBuffer.length === calculatedBuffer.length &&
    timingSafeEqual(receivedBuffer, calculatedBuffer)
  )
}

async function getOrderDetails(shop: string, orderId: string) {
  const connection = await sql`
    SELECT access_token
    FROM shop_connections
    WHERE shop = ${shop}
    LIMIT 1
  `
  const token = connection.rows[0]?.access_token
  if (!token) throw new Error(`Connexion Shopify introuvable pour ${shop}`)

  const response = await fetch(
    `https://${shop}/admin/api/2026-04/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query: `
          query ReviewRequestOrder($id: ID!) {
            order(id: $id) {
              name
              email
              customer {
                firstName
                email
              }
              lineItems(first: 50) {
                nodes {
                  title
                  product {
                    handle
                  }
                }
              }
            }
          }
        `,
        variables: { id: `gid://shopify/Order/${orderId}` },
      }),
    }
  )
  const result = await response.json()
  if (!response.ok || result.errors) {
    throw new Error(JSON.stringify(result.errors || result))
  }

  return result.data?.order
}

async function scheduleReviewRequests(
  shop: string,
  orderId: string,
  deliveredAt: string
) {
  await ensureReviewRequestTrackingTables()

  const settingsResult = await sql`
    SELECT active, delay_days
    FROM review_request_settings
    WHERE shop = ${shop}
    LIMIT 1
  `
  const settings = settingsResult.rows[0]
  if (!settings?.active) return 0

  const order = await getOrderDetails(shop, orderId)
  const email = order?.email || order?.customer?.email
  if (!order || !email) return 0

  const deliveredDate = new Date(deliveredAt)
  const scheduledFor = new Date(
    deliveredDate.getTime() + Number(settings.delay_days || 3) * 86400000
  )
  let scheduled = 0

  for (const lineItem of order.lineItems?.nodes || []) {
    const productHandle = lineItem.product?.handle
    if (!productHandle) continue

    await sql`
      INSERT INTO review_request_queue (
        shop,
        order_id,
        order_name,
        customer_email,
        customer_first_name,
        product_handle,
        product_title,
        delivered_at,
        scheduled_for,
        status,
        updated_at
      )
      VALUES (
        ${shop},
        ${orderId},
        ${order.name || ""},
        ${email},
        ${order.customer?.firstName || ""},
        ${productHandle},
        ${lineItem.title || ""},
        ${deliveredDate.toISOString()},
        ${scheduledFor.toISOString()},
        'scheduled',
        NOW()
      )
      ON CONFLICT (shop, order_id, product_handle)
      DO UPDATE SET
        delivered_at = EXCLUDED.delivered_at,
        scheduled_for = EXCLUDED.scheduled_for,
        updated_at = NOW()
    `
    scheduled += 1
  }

  return scheduled
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const hmac = request.headers.get("x-shopify-hmac-sha256")

  if (!validShopifyHmac(rawBody, hmac)) {
    return NextResponse.json(
      { success: false, error: "Signature Shopify invalide" },
      { status: 401 }
    )
  }

  const topic = request.headers.get("x-shopify-topic") || ""
  const shop = request.headers.get("x-shopify-shop-domain") || ""
  const body = JSON.parse(rawBody)

  if (topic === "fulfillment_events/create" && body.status === "delivered") {
    const scheduled = await scheduleReviewRequests(
      shop,
      String(body.order_id || ""),
      body.happened_at || new Date().toISOString()
    )

    return NextResponse.json({ success: true, received: true, scheduled })
  }

  return NextResponse.json({ success: true, received: true, scheduled: 0 })
}
