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

export async function GET() {
  try {
    await ensureReviewEmailSettingsTable()
    const result = await sql`
      SELECT * FROM review_email_settings WHERE shop = ${SHOP} LIMIT 1
    `

    return NextResponse.json({
      success: true,
      settings: result.rows[0] || defaultReviewEmailSettings,
      connection: {
        connected: Boolean(process.env.RESEND_API_KEY),
        sender: process.env.RESEND_FROM_EMAIL || result.rows[0]?.sender_email || defaultReviewEmailSettings.sender_email,
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
    }

    const result = await sql`
      INSERT INTO review_email_settings (
        shop, sender_name, sender_email, subject, heading, message,
        button_text, reward_type, reward_label, reward_code, reward_url, updated_at
      ) VALUES (
        ${SHOP}, ${settings.sender_name}, ${settings.sender_email},
        ${settings.subject}, ${settings.heading}, ${settings.message},
        ${settings.button_text}, ${settings.reward_type}, ${settings.reward_label},
        ${settings.reward_code}, ${settings.reward_url}, NOW()
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
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({ success: true, settings: result.rows[0] })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
