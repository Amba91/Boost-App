import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { seedDefaultMailAutomations } from "../../../../lib/mail-automation-settings"

const SHOP = "hy4nf1-dt.myshopify.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength)
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 180).toLowerCase()
  return /^\S+@\S+\.\S+$/.test(email) ? email : ""
}

function cleanItems(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 12).map((item) => {
    const row = item as Record<string, unknown>
    return {
      title: cleanText(row.title, 180),
      handle: cleanText(row.handle, 180),
      image: cleanText(row.image, 500),
      quantity: Math.max(1, Math.min(Number(row.quantity || 1), 99)),
      price: cleanText(row.price, 80),
    }
  })
}

export async function POST(request: Request) {
  try {
    await seedDefaultMailAutomations(SHOP)
    const body = await request.json()
    const email = cleanEmail(body.email)

    if (!email) {
      return NextResponse.json(
        { success: false, error: "E-mail invalide." },
        { status: 400, headers: corsHeaders }
      )
    }

    const items = cleanItems(body.items)
    if (!items.length) {
      return NextResponse.json(
        { success: false, error: "Panier vide." },
        { status: 400, headers: corsHeaders }
      )
    }

    const settingsResult = await sql`
      SELECT *
      FROM mail_automation_settings
      WHERE shop = ${SHOP} AND scenario = 'abandoned_cart'
      LIMIT 1
    `
    const settings = settingsResult.rows[0]
    const firstItem = items[0]
    const scheduledFor = new Date(
      Date.now() + Number(settings?.delay_minutes || 60) * 60000
    )
    const token = cleanText(body.cart_token, 180) || `${email}-${Date.now()}`
    const cartUrl = cleanText(body.cart_url, 500) || "https://kiidiiz.com/cart"
    const status = settings?.active ? "scheduled" : "captured"

    const inserted = await sql`
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
        ${SHOP},
        'abandoned_cart',
        ${email},
        ${cleanText(body.first_name, 80)},
        ${token},
        'Panier abandonné',
        ${firstItem.handle},
        ${firstItem.title},
        ${firstItem.image},
        ${cartUrl},
        ${cleanText(body.total_price, 80)},
        ${cleanText(body.currency, 10) || "EUR"},
        ${scheduledFor.toISOString()},
        ${status},
        NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      queued: Boolean(status === "scheduled" && inserted.rows[0]?.id),
      captured: Boolean(inserted.rows[0]?.id),
      active: Boolean(settings?.active),
      id: inserted.rows[0]?.id || null,
    }, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    )
  }
}
