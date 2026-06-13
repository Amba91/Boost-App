import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewRequestTrackingTables } from "../../../../lib/review-request-tracking"
import { seedDefaultMailAutomations } from "../../../../lib/mail-automation-settings"
import { createSupplierOrdersFromShopifyOrder } from "../../../../lib/supplier-orders"

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
                    featuredImage {
                      url
                    }
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
        product_image_url,
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
        ${lineItem.product?.featuredImage?.url || ""},
        ${deliveredDate.toISOString()},
        ${scheduledFor.toISOString()},
        'scheduled',
        NOW()
      )
      ON CONFLICT (shop, order_id, product_handle)
      DO UPDATE SET
        delivered_at = EXCLUDED.delivered_at,
        scheduled_for = EXCLUDED.scheduled_for,
        product_title = EXCLUDED.product_title,
        product_image_url = EXCLUDED.product_image_url,
        updated_at = NOW()
    `
    scheduled += 1
  }

  return scheduled
}

function firstNameFromOrder(body: Record<string, unknown>) {
  const customer = body.customer as { first_name?: string } | undefined
  const shipping = body.shipping_address as { first_name?: string } | undefined
  const billing = body.billing_address as { first_name?: string } | undefined
  return customer?.first_name || shipping?.first_name || billing?.first_name || ""
}

function firstProductFromOrder(body: Record<string, unknown>) {
  const items = Array.isArray(body.line_items) ? body.line_items : []
  const first = items[0] as
    | {
        title?: string
        product_id?: string | number
        variant_id?: string | number
        image?: { src?: string }
      }
    | undefined

  return {
    title: first?.title || "votre commande",
    handle: first?.product_id ? String(first.product_id) : first?.variant_id ? String(first.variant_id) : "",
    image: first?.image?.src || "",
  }
}

async function scheduleOrderAutomation(
  shop: string,
  scenario: "order_confirmation" | "post_purchase_upsell",
  body: Record<string, unknown>
) {
  await seedDefaultMailAutomations(shop)

  const settingsResult = await sql`
    SELECT *
    FROM mail_automation_settings
    WHERE shop = ${shop} AND scenario = ${scenario}
    LIMIT 1
  `
  const settings = settingsResult.rows[0]
  if (!settings?.active) return 0

  const email = String(body.email || body.contact_email || "")
  if (!email || !email.includes("@")) return 0

  const product = firstProductFromOrder(body)
  const orderId = String(body.id || "")
  const orderName = String(body.name || "")
  const orderStatusUrl = String(body.order_status_url || "https://kiidiiz.com")
  const scheduledFor = new Date(
    Date.now() + Number(settings.delay_minutes || 0) * 60000
  )

  await sql`
    INSERT INTO mail_automation_queue (
      shop,
      scenario,
      customer_email,
      customer_first_name,
      order_id,
      order_name,
      product_handle,
      product_title,
      product_image_url,
      action_url,
      subtotal_amount,
      currency,
      scheduled_for,
      status,
      updated_at
    )
    VALUES (
      ${shop},
      ${scenario},
      ${email},
      ${firstNameFromOrder(body)},
      ${orderId},
      ${orderName},
      ${product.handle},
      ${product.title},
      ${product.image},
      ${orderStatusUrl},
      ${String(body.subtotal_price || "")},
      ${String(body.currency || "")},
      ${scheduledFor.toISOString()},
      'scheduled',
      NOW()
    )
    ON CONFLICT DO NOTHING
  `

  return 1
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

  if (topic === "orders/create") {
    const supplierOrders = await createSupplierOrdersFromShopifyOrder(shop, body)
    const confirmation = await scheduleOrderAutomation(
      shop,
      "order_confirmation",
      body
    )
    const upsell = await scheduleOrderAutomation(
      shop,
      "post_purchase_upsell",
      body
    )

    return NextResponse.json({
      success: true,
      received: true,
      scheduled: confirmation + upsell,
      supplier_orders: supplierOrders,
    })
  }

  return NextResponse.json({ success: true, received: true, scheduled: 0 })
}
