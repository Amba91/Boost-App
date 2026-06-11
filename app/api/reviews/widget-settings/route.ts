import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import {
  defaultReviewWidgetSettings,
  ensureReviewWidgetSettingsTable,
} from "../../../../lib/review-widget-settings"

const SHOP = "kiidiiz.com"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
}

function safeColor(value: unknown, fallback: string) {
  const color = String(value || "").trim()
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value)
  return Number.isFinite(number)
    ? Math.min(Math.max(Math.round(number), min), max)
    : fallback
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET() {
  try {
    await ensureReviewWidgetSettingsTable()

    const result = await sql`
      SELECT *
      FROM review_widget_settings
      WHERE shop = ${SHOP}
      LIMIT 1
    `

    return NextResponse.json(
      {
        success: true,
        settings: result.rows[0] || defaultReviewWidgetSettings,
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
    await ensureReviewWidgetSettingsTable()
    const body = await request.json()
    const settings = {
      title: String(body.title || defaultReviewWidgetSettings.title)
        .trim()
        .slice(0, 80),
      background_color: safeColor(
        body.background_color,
        defaultReviewWidgetSettings.background_color
      ),
      star_color: safeColor(
        body.star_color,
        defaultReviewWidgetSettings.star_color
      ),
      text_color: safeColor(
        body.text_color,
        defaultReviewWidgetSettings.text_color
      ),
      photo_size: numberInRange(
        body.photo_size,
        defaultReviewWidgetSettings.photo_size,
        60,
        220
      ),
      max_reviews: numberInRange(
        body.max_reviews,
        defaultReviewWidgetSettings.max_reviews,
        1,
        100
      ),
      show_arrows: body.show_arrows !== false,
    }

    const result = await sql`
      INSERT INTO review_widget_settings (
        shop,
        title,
        background_color,
        star_color,
        text_color,
        photo_size,
        max_reviews,
        show_arrows,
        updated_at
      )
      VALUES (
        ${SHOP},
        ${settings.title},
        ${settings.background_color},
        ${settings.star_color},
        ${settings.text_color},
        ${settings.photo_size},
        ${settings.max_reviews},
        ${settings.show_arrows},
        NOW()
      )
      ON CONFLICT (shop)
      DO UPDATE SET
        title = EXCLUDED.title,
        background_color = EXCLUDED.background_color,
        star_color = EXCLUDED.star_color,
        text_color = EXCLUDED.text_color,
        photo_size = EXCLUDED.photo_size,
        max_reviews = EXCLUDED.max_reviews,
        show_arrows = EXCLUDED.show_arrows,
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json(
      {
        success: true,
        settings: result.rows[0],
        message: "Personnalisation enregistrée.",
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
