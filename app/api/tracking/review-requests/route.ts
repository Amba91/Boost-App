import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import {
  defaultReviewRequestSettings,
  ensureReviewRequestTrackingTables,
} from "../../../../lib/review-request-tracking"

const SHOP = "hy4nf1-dt.myshopify.com"

export async function GET() {
  try {
    await ensureReviewRequestTrackingTables()

    const [settingsResult, queueResult] = await Promise.all([
      sql`
        SELECT active, delay_days
        FROM review_request_settings
        WHERE shop = ${SHOP}
        LIMIT 1
      `,
      sql`
        SELECT *
        FROM review_request_queue
        WHERE shop = ${SHOP}
        ORDER BY delivered_at DESC
        LIMIT 50
      `,
    ])

    const queue = queueResult.rows.map((item) => ({
      ...item,
      status:
        item.status === "scheduled" && new Date(item.scheduled_for) <= new Date()
          ? "ready"
          : item.status,
    }))

    return NextResponse.json(
      {
        success: true,
        settings: settingsResult.rows[0] || defaultReviewRequestSettings,
        queue,
        counts: {
          scheduled: queue.filter((item) => item.status === "scheduled").length,
          ready: queue.filter((item) => item.status === "ready").length,
          sent: queue.filter((item) => item.status === "sent").length,
        },
        email_service_connected: Boolean(process.env.RESEND_API_KEY),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}

export async function POST(request: Request) {
  try {
    await ensureReviewRequestTrackingTables()
    const body = await request.json()
    const delayDays = Math.min(Math.max(Math.round(Number(body.delay_days) || 3), 0), 30)
    const active = body.active === true

    const result = await sql`
      INSERT INTO review_request_settings (shop, active, delay_days, updated_at)
      VALUES (${SHOP}, ${active}, ${delayDays}, NOW())
      ON CONFLICT (shop)
      DO UPDATE SET
        active = EXCLUDED.active,
        delay_days = EXCLUDED.delay_days,
        updated_at = NOW()
      RETURNING active, delay_days
    `

    return NextResponse.json({ success: true, settings: result.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
