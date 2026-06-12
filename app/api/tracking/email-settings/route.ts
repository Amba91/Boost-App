import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import {
  defaultReviewEmailSettings,
  ensureReviewEmailSettingsTable,
} from "../../../../lib/review-email-settings"

const SHOP = "hy4nf1-dt.myshopify.com"

function text(value: unknown, fallback: string, maxLength: number) {
  return String(value ?? fallback).trim().slice(0, maxLength)
}

function rewardType(value: unknown) {
  const result = String(value || "none")
  return ["none", "discount", "ebook", "custom"].includes(result)
    ? result
    : "none"
}

function provider(value: unknown, fallback: string) {
  const result = String(value || fallback)
  return ["resend", "klaviyo"].includes(result) ? result : fallback
}

function providerMode(value: unknown) {
  const result = String(value || "fallback")
  return ["manual", "fallback", "quota"].includes(result) ? result : "fallback"
}

function limit(value: unknown, fallback: number) {
  const result = Math.round(Number(value))
  return Number.isFinite(result) ? Math.min(Math.max(result, 0), 1000000) : fallback
}

export async function GET() {
  try {
    await ensureReviewEmailSettingsTable()
    const [result, usageResult] = await Promise.all([
      sql`SELECT * FROM review_email_settings WHERE shop = ${SHOP} LIMIT 1`,
      sql`
        SELECT provider, COUNT(*)::int AS sent
        FROM mail_delivery_log
        WHERE shop = ${SHOP} AND status = 'sent'
          AND created_at >= date_trunc('month', NOW())
        GROUP BY provider
      `,
    ])
    const usage = Object.fromEntries(usageResult.rows.map((row) => [row.provider, Number(row.sent)]))

    return NextResponse.json({
      success: true,
      settings: result.rows[0] || defaultReviewEmailSettings,
      connection: {
        connected: Boolean(process.env.RESEND_API_KEY || process.env.KLAVIYO_PRIVATE_API_KEY),
        sender: process.env.RESEND_FROM_EMAIL || result.rows[0]?.sender_email || defaultReviewEmailSettings.sender_email,
        providers: {
          resend: { connected: Boolean(process.env.RESEND_API_KEY), used: usage.resend || 0 },
          klaviyo: { connected: Boolean(process.env.KLAVIYO_PRIVATE_API_KEY), used: usage.klaviyo || 0 },
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureReviewEmailSettingsTable()
    const body = await request.json()
    const settings = {
      sender_name: text(body.sender_name, defaultReviewEmailSettings.sender_name, 80),
      sender_email: text(body.sender_email, defaultReviewEmailSettings.sender_email, 160),
      subject: text(body.subject, defaultReviewEmailSettings.subject, 180),
      heading: text(body.heading, defaultReviewEmailSettings.heading, 180),
      message: text(body.message, defaultReviewEmailSettings.message, 1200),
      button_text: text(body.button_text, defaultReviewEmailSettings.button_text, 60),
      reward_type: rewardType(body.reward_type),
      reward_label: text(body.reward_label, "", 240),
      reward_code: text(body.reward_code, "", 80),
      reward_url: text(body.reward_url, "", 500),
      provider_mode: providerMode(body.provider_mode),
      primary_provider: provider(body.primary_provider, "resend"),
      fallback_provider: provider(body.fallback_provider, "klaviyo"),
      resend_monthly_limit: limit(body.resend_monthly_limit, 3000),
      klaviyo_monthly_limit: limit(body.klaviyo_monthly_limit, 500),
    }

    const result = await sql`
      INSERT INTO review_email_settings (
        shop, sender_name, sender_email, subject, heading, message,
        button_text, reward_type, reward_label, reward_code, reward_url,
        provider_mode, primary_provider, fallback_provider,
        resend_monthly_limit, klaviyo_monthly_limit, updated_at
      ) VALUES (
        ${SHOP}, ${settings.sender_name}, ${settings.sender_email},
        ${settings.subject}, ${settings.heading}, ${settings.message},
        ${settings.button_text}, ${settings.reward_type}, ${settings.reward_label},
        ${settings.reward_code}, ${settings.reward_url}, ${settings.provider_mode},
        ${settings.primary_provider}, ${settings.fallback_provider},
        ${settings.resend_monthly_limit}, ${settings.klaviyo_monthly_limit}, NOW()
      )
      ON CONFLICT (shop) DO UPDATE SET
        sender_name = EXCLUDED.sender_name,
        sender_email = EXCLUDED.sender_email,
        subject = EXCLUDED.subject,
        heading = EXCLUDED.heading,
        message = EXCLUDED.message,
        button_text = EXCLUDED.button_text,
        reward_type = EXCLUDED.reward_type,
        reward_label = EXCLUDED.reward_label,
        reward_code = EXCLUDED.reward_code,
        reward_url = EXCLUDED.reward_url,
        provider_mode = EXCLUDED.provider_mode,
        primary_provider = EXCLUDED.primary_provider,
        fallback_provider = EXCLUDED.fallback_provider,
        resend_monthly_limit = EXCLUDED.resend_monthly_limit,
        klaviyo_monthly_limit = EXCLUDED.klaviyo_monthly_limit,
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({ success: true, settings: result.rows[0] })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
