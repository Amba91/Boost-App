import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import {
  defaultTrackingWidgetSettings,
  ensureTrackingWidgetSettingsTable,
} from "../../../../lib/tracking-widget-settings"

const SHOP = "hy4nf1-dt.myshopify.com"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
}

function text(value: unknown, fallback: string, maxLength: number) {
  return String(value || fallback).trim().slice(0, maxLength) || fallback
}

function color(value: unknown, fallback: string) {
  const result = String(value || "").trim()
  return /^#[0-9a-f]{6}$/i.test(result) ? result : fallback
}

function pagePath(value: unknown) {
  const result = String(value || defaultTrackingWidgetSettings.page_path).trim()
  return /^\/pages\/[a-z0-9-]+$/i.test(result)
    ? result
    : defaultTrackingWidgetSettings.page_path
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET() {
  try {
    await ensureTrackingWidgetSettingsTable()
    const result = await sql`
      SELECT * FROM tracking_widget_settings WHERE shop = ${SHOP} LIMIT 1
    `

    return NextResponse.json(
      {
        success: true,
        settings: result.rows[0] || defaultTrackingWidgetSettings,
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
    await ensureTrackingWidgetSettingsTable()
    const body = await request.json()
    const settings = {
      page_path: pagePath(body.page_path),
      title: text(body.title, defaultTrackingWidgetSettings.title, 80),
      subtitle: text(body.subtitle, defaultTrackingWidgetSettings.subtitle, 240),
      button_text: text(body.button_text, defaultTrackingWidgetSettings.button_text, 40),
      primary_color: color(body.primary_color, defaultTrackingWidgetSettings.primary_color),
      background_color: color(body.background_color, defaultTrackingWidgetSettings.background_color),
      text_color: color(body.text_color, defaultTrackingWidgetSettings.text_color),
      confirmed_message: text(body.confirmed_message, defaultTrackingWidgetSettings.confirmed_message, 240),
      shipped_message: text(body.shipped_message, defaultTrackingWidgetSettings.shipped_message, 240),
      in_transit_message: text(body.in_transit_message, defaultTrackingWidgetSettings.in_transit_message, 240),
      delivered_message: text(body.delivered_message, defaultTrackingWidgetSettings.delivered_message, 240),
    }

    const result = await sql`
      INSERT INTO tracking_widget_settings (
        shop, page_path, title, subtitle, button_text,
        primary_color, background_color, text_color,
        confirmed_message, shipped_message, in_transit_message,
        delivered_message, updated_at
      ) VALUES (
        ${SHOP}, ${settings.page_path}, ${settings.title}, ${settings.subtitle},
        ${settings.button_text}, ${settings.primary_color},
        ${settings.background_color}, ${settings.text_color},
        ${settings.confirmed_message}, ${settings.shipped_message},
        ${settings.in_transit_message}, ${settings.delivered_message}, NOW()
      )
      ON CONFLICT (shop) DO UPDATE SET
        page_path = EXCLUDED.page_path,
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        button_text = EXCLUDED.button_text,
        primary_color = EXCLUDED.primary_color,
        background_color = EXCLUDED.background_color,
        text_color = EXCLUDED.text_color,
        confirmed_message = EXCLUDED.confirmed_message,
        shipped_message = EXCLUDED.shipped_message,
        in_transit_message = EXCLUDED.in_transit_message,
        delivered_message = EXCLUDED.delivered_message,
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
