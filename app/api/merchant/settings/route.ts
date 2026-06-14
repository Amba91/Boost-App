import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import {
  defaultMerchantSettings,
  ensureMerchantSettingsTable,
} from "../../../../lib/merchant-settings"

const SHOP = "hy4nf1-dt.myshopify.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  const result = String(value || "").trim().slice(0, maxLength)
  return result || fallback
}

function cleanLanguage(value: unknown) {
  const result = String(value || defaultMerchantSettings.language).trim().toLowerCase()
  return ["fr", "en", "es", "de", "it"].includes(result)
    ? result
    : defaultMerchantSettings.language
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET() {
  try {
    await ensureMerchantSettingsTable()
    const result = await sql`
      SELECT *
      FROM merchant_settings
      WHERE shop = ${SHOP}
      LIMIT 1
    `

    return NextResponse.json(
      {
        success: true,
        settings: result.rows[0] || defaultMerchantSettings,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: Request) {
  try {
    await ensureMerchantSettingsTable()
    const body = await request.json()
    const settings = {
      language: cleanLanguage(body.language),
      shop_name: cleanText(body.shop_name, defaultMerchantSettings.shop_name, 100),
      support_email: cleanText(body.support_email, defaultMerchantSettings.support_email, 160),
      plan: cleanText(body.plan, defaultMerchantSettings.plan, 80),
      notifications_email: Boolean(body.notifications_email),
      notifications_reviews: Boolean(body.notifications_reviews),
      notifications_orders: Boolean(body.notifications_orders),
    }

    const result = await sql`
      INSERT INTO merchant_settings (
        shop, language, shop_name, support_email, plan,
        notifications_email, notifications_reviews, notifications_orders,
        updated_at
      ) VALUES (
        ${SHOP}, ${settings.language}, ${settings.shop_name}, ${settings.support_email},
        ${settings.plan}, ${settings.notifications_email}, ${settings.notifications_reviews},
        ${settings.notifications_orders}, NOW()
      )
      ON CONFLICT (shop) DO UPDATE SET
        language = EXCLUDED.language,
        shop_name = EXCLUDED.shop_name,
        support_email = EXCLUDED.support_email,
        plan = EXCLUDED.plan,
        notifications_email = EXCLUDED.notifications_email,
        notifications_reviews = EXCLUDED.notifications_reviews,
        notifications_orders = EXCLUDED.notifications_orders,
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json(
      { success: true, settings: result.rows[0] },
      { headers: corsHeaders }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    )
  }
}
