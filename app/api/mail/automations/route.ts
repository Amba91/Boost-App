import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import {
  defaultMailAutomations,
  seedDefaultMailAutomations,
} from "../../../../lib/mail-automation-settings"

const SHOP = "hy4nf1-dt.myshopify.com"

function cleanText(value: unknown, fallback: string, maxLength: number) {
  return String(value ?? fallback).trim().slice(0, maxLength)
}

function cleanScenario(value: unknown) {
  const scenario = String(value || "")
  return defaultMailAutomations.some((item) => item.scenario === scenario)
    ? scenario
    : ""
}

function cleanRewardType(value: unknown) {
  const result = String(value || "none")
  return ["none", "discount", "ebook", "custom"].includes(result)
    ? result
    : "none"
}

function cleanDelay(value: unknown, fallback: number) {
  const result = Math.round(Number(value))
  if (!Number.isFinite(result)) return fallback
  return Math.min(Math.max(result, 0), 525600)
}

export async function GET() {
  try {
    await seedDefaultMailAutomations(SHOP)

    const result = await sql`
      SELECT *
      FROM mail_automation_settings
      WHERE shop = ${SHOP}
      ORDER BY
        CASE scenario
          WHEN 'review_request' THEN 1
          WHEN 'order_confirmation' THEN 2
          WHEN 'abandoned_cart' THEN 3
          WHEN 'post_purchase_upsell' THEN 4
          WHEN 'winback' THEN 5
          ELSE 99
        END
    `

    const queueResult = await sql`
      SELECT scenario, status, COUNT(*)::int AS count
      FROM mail_automation_queue
      WHERE shop = ${SHOP}
      GROUP BY scenario, status
    `

    return NextResponse.json({
      success: true,
      automations: result.rows,
      queue_summary: queueResult.rows,
      connection: {
        providers: {
          resend: Boolean(process.env.RESEND_API_KEY),
          klaviyo: Boolean(process.env.KLAVIYO_PRIVATE_API_KEY),
        },
        sender: process.env.RESEND_FROM_EMAIL || "contact@kiidiiz.com",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await seedDefaultMailAutomations(SHOP)

    const body = await request.json()
    const scenario = cleanScenario(body.scenario)
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: "Scénario invalide." },
        { status: 400 }
      )
    }

    const defaults =
      defaultMailAutomations.find((item) => item.scenario === scenario) ||
      defaultMailAutomations[0]

    const settings = {
      active: Boolean(body.active),
      delay_minutes: cleanDelay(body.delay_minutes, defaults.delay_minutes),
      subject: cleanText(body.subject, defaults.subject, 180),
      heading: cleanText(body.heading, defaults.heading, 180),
      message: cleanText(body.message, defaults.message, 1500),
      button_text: cleanText(body.button_text, defaults.button_text, 80),
      reward_type: cleanRewardType(body.reward_type),
      reward_label: cleanText(body.reward_label, "", 240),
      reward_code: cleanText(body.reward_code, "", 80),
      reward_url: cleanText(body.reward_url, "", 500),
    }

    const result = await sql`
      UPDATE mail_automation_settings
      SET
        active = ${settings.active},
        delay_minutes = ${settings.delay_minutes},
        subject = ${settings.subject},
        heading = ${settings.heading},
        message = ${settings.message},
        button_text = ${settings.button_text},
        reward_type = ${settings.reward_type},
        reward_label = ${settings.reward_label},
        reward_code = ${settings.reward_code},
        reward_url = ${settings.reward_url},
        updated_at = NOW()
      WHERE shop = ${SHOP} AND scenario = ${scenario}
      RETURNING *
    `

    return NextResponse.json({ success: true, automation: result.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
