import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "hy4nf1-dt.myshopify.com"
const API_VERSION = "2026-04"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
}

type Fulfillment = {
  createdAt?: string | null
  inTransitAt?: string | null
  deliveredAt?: string | null
  estimatedDeliveryAt?: string | null
  displayStatus?: string | null
  status?: string | null
  trackingInfo?: Array<{
    company?: string | null
    number?: string | null
    url?: string | null
  }>
}

type ShopifyOrder = {
  name?: string | null
  email?: string | null
  createdAt?: string | null
  cancelledAt?: string | null
  displayFinancialStatus?: string | null
  displayFulfillmentStatus?: string | null
  statusPageUrl?: string | null
  fulfillments?: Fulfillment[]
}

function normalizeOrderNumber(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "")
    .slice(0, 40)
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase().slice(0, 160)
}

function statusFor(order: ShopifyOrder, fulfillment?: Fulfillment) {
  if (order.cancelledAt) {
    return { key: "cancelled", label: "Commande annulée", step: 0 }
  }

  const displayStatus = String(fulfillment?.displayStatus || "").toUpperCase()
  if (fulfillment?.deliveredAt || displayStatus === "DELIVERED") {
    return { key: "delivered", label: "Commande livrée", step: 4 }
  }
  if (displayStatus === "OUT_FOR_DELIVERY") {
    return { key: "out_for_delivery", label: "En cours de livraison", step: 3 }
  }
  if (fulfillment?.inTransitAt || displayStatus === "IN_TRANSIT") {
    return { key: "in_transit", label: "Colis en transit", step: 3 }
  }
  if (fulfillment) {
    return { key: "shipped", label: "Commande expédiée", step: 2 }
  }
  return { key: "confirmed", label: "Commande confirmée", step: 1 }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const orderNumber = normalizeOrderNumber(body.order_number)
    const email = normalizeEmail(body.email)

    if (!/^[a-z0-9-]+$/i.test(orderNumber) || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Renseigne un numéro de commande et un e-mail valides." },
        { status: 400, headers: corsHeaders }
      )
    }

    const connection = await sql`
      SELECT access_token
      FROM shop_connections
      WHERE shop = ${SHOP}
      LIMIT 1
    `
    const token = connection.rows[0]?.access_token as string | undefined

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Le suivi est momentanément indisponible." },
        { status: 503, headers: corsHeaders }
      )
    }

    const shopifyResponse = await fetch(
      `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query: `
            query TrackOrder($query: String!) {
              orders(first: 10, query: $query, sortKey: CREATED_AT, reverse: true) {
                nodes {
                  name
                  email
                  createdAt
                  cancelledAt
                  displayFinancialStatus
                  displayFulfillmentStatus
                  statusPageUrl
                  fulfillments {
                    createdAt
                    inTransitAt
                    deliveredAt
                    estimatedDeliveryAt
                    displayStatus
                    status
                    trackingInfo {
                      company
                      number
                      url
                    }
                  }
                }
              }
            }
          `,
          variables: { query: `name:${orderNumber}` },
        }),
        cache: "no-store",
      }
    )

    const payload = await shopifyResponse.json()
    if (!shopifyResponse.ok || payload.errors) {
      console.error("Shopify tracking lookup failed", payload.errors || payload)
      return NextResponse.json(
        { success: false, error: "Le suivi est momentanément indisponible." },
        { status: 502, headers: corsHeaders }
      )
    }

    const orders = (payload.data?.orders?.nodes || []) as ShopifyOrder[]
    const order = orders.find((item) => {
      const name = normalizeOrderNumber(item.name)
      return name === orderNumber && normalizeEmail(item.email) === email
    })

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Commande introuvable. Vérifie le numéro et l’e-mail utilisés lors de l’achat.",
        },
        { status: 404, headers: corsHeaders }
      )
    }

    const fulfillments = order.fulfillments || []
    const fulfillment = fulfillments
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0]
    const tracking = fulfillment?.trackingInfo?.find(
      (item) => item.number || item.url
    )

    return NextResponse.json(
      {
        success: true,
        order: {
          name: order.name,
          created_at: order.createdAt,
          financial_status: order.displayFinancialStatus,
          fulfillment_status: order.displayFulfillmentStatus,
          status: statusFor(order, fulfillment),
          shipped_at: fulfillment?.createdAt || null,
          in_transit_at: fulfillment?.inTransitAt || null,
          delivered_at: fulfillment?.deliveredAt || null,
          estimated_delivery_at: fulfillment?.estimatedDeliveryAt || null,
          tracking: tracking
            ? {
                company: tracking.company || null,
                number: tracking.number || null,
                url: tracking.url || null,
              }
            : null,
          status_page_url: order.statusPageUrl || null,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Tracking lookup error", error)
    return NextResponse.json(
      { success: false, error: "Le suivi est momentanément indisponible." },
      { status: 500, headers: corsHeaders }
    )
  }
}
