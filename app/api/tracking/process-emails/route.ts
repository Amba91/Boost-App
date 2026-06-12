import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewRequestTrackingTables } from "../../../../lib/review-request-tracking"
import { buildReviewEmail, sendReviewEmail } from "../../../../lib/review-email"
import { defaultReviewEmailSettings } from "../../../../lib/review-email-settings"

const SHOP = "hy4nf1-dt.myshopify.com"

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`)
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  try {
    await ensureReviewRequestTrackingTables()
    const [settingsResult, queueResult] = await Promise.all([
      sql`SELECT * FROM review_email_settings WHERE shop = ${SHOP} LIMIT 1`,
      sql`
        SELECT q.*, COALESCE(NULLIF(q.product_image_url, ''), p.image_url) AS final_product_image_url
        FROM review_request_queue q
        LEFT JOIN products p ON p.shop = q.shop AND p.handle = q.product_handle
        WHERE q.shop = ${SHOP}
          AND q.status = 'scheduled'
          AND q.scheduled_for <= NOW()
        ORDER BY q.scheduled_for ASC
        LIMIT 20
      `,
    ])
    const settings = settingsResult.rows[0] || defaultReviewEmailSettings

    let sent = 0
    const errors: Array<{ id: number; error: string }> = []

    for (const item of queueResult.rows) {
      try {
        const email = buildReviewEmail({
          settings: settings as never,
          firstName: String(item.customer_first_name || ""),
          orderName: String(item.order_name || ""),
          productTitle: String(item.product_title || "votre produit"),
          productImageUrl: item.final_product_image_url,
          productHandle: String(item.product_handle),
        })
        const result = await sendReviewEmail({
          to: String(item.customer_email),
          settings: settings as never,
          subject: email.subject,
          html: email.html,
        })
        await sql`
          UPDATE review_request_queue
          SET status = 'sent', sent_at = NOW(), resend_email_id = ${result.id || ""},
              error_message = NULL, updated_at = NOW()
          WHERE id = ${item.id}
        `
        sent += 1
      } catch (error) {
        const message = String(error).slice(0, 500)
        await sql`
          UPDATE review_request_queue
          SET error_message = ${message}, updated_at = NOW()
          WHERE id = ${item.id}
        `
        errors.push({ id: Number(item.id), error: message })
      }
    }

    return NextResponse.json({ success: true, sent, errors })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
