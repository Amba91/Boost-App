import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewRequestTrackingTables } from "../../../../lib/review-request-tracking"
import { buildReviewEmail } from "../../../../lib/review-email"
import { defaultReviewEmailSettings } from "../../../../lib/review-email-settings"
import {
  MailProvider,
  providerConnected,
  sendWithProvider,
} from "../../../../lib/mail-providers"

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
    const [settingsResult, queueResult, usageResult] = await Promise.all([
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
      sql`
        SELECT provider, COUNT(*)::int AS sent
        FROM mail_delivery_log
        WHERE shop = ${SHOP} AND status = 'sent'
          AND created_at >= date_trunc('month', NOW())
        GROUP BY provider
      `,
    ])
    const settings = settingsResult.rows[0] || defaultReviewEmailSettings
    const usage = Object.fromEntries(
      usageResult.rows.map((row) => [String(row.provider), Number(row.sent)])
    )

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
        const primary = String(settings.primary_provider || "resend") as MailProvider
        const fallback = String(settings.fallback_provider || "klaviyo") as MailProvider
        const mode = String(settings.provider_mode || "fallback")
        const providers = [primary]
        if (mode !== "manual" && fallback !== primary) providers.push(fallback)

        let result: { id: string; provider: MailProvider } | null = null
        const providerErrors: string[] = []
        for (const provider of providers) {
          const monthlyLimit = Number(
            provider === "resend"
              ? settings.resend_monthly_limit || 3000
              : settings.klaviyo_monthly_limit || 500
          )
          if (!providerConnected(provider)) {
            providerErrors.push(`${provider}: non connecté`)
            continue
          }
          if (mode === "quota" && monthlyLimit > 0 && (usage[provider] || 0) >= monthlyLimit) {
            providerErrors.push(`${provider}: limite mensuelle atteinte`)
            continue
          }
          try {
            result = await sendWithProvider(provider, {
              to: String(item.customer_email),
              firstName: String(item.customer_first_name || ""),
              subject: email.subject,
              html: email.html,
              senderName: String(settings.sender_name),
              senderEmail: String(settings.sender_email),
              orderName: String(item.order_name || ""),
              productTitle: String(item.product_title || "votre produit"),
              productHandle: String(item.product_handle),
              productImageUrl: item.final_product_image_url,
              reviewUrl: email.reviewUrl,
              rewardLabel: String(settings.reward_label || ""),
              rewardCode: String(settings.reward_code || ""),
              rewardUrl: String(settings.reward_url || ""),
            })
            usage[provider] = (usage[provider] || 0) + 1
            break
          } catch (error) {
            providerErrors.push(`${provider}: ${String(error)}`)
          }
        }
        if (!result) throw new Error(providerErrors.join(" | ") || "Aucun fournisseur disponible")

        await sql`
          UPDATE review_request_queue
          SET status = 'sent', sent_at = NOW(), resend_email_id = ${result.id || ""},
              email_provider = ${result.provider},
              error_message = NULL, updated_at = NOW()
          WHERE id = ${item.id}
        `
        await sql`
          INSERT INTO mail_delivery_log (shop, queue_id, provider, status, external_id)
          VALUES (${SHOP}, ${item.id}, ${result.provider}, 'sent', ${result.id})
        `
        sent += 1
      } catch (error) {
        const message = String(error).slice(0, 500)
        await sql`
          UPDATE review_request_queue
          SET error_message = ${message}, updated_at = NOW()
          WHERE id = ${item.id}
        `
        await sql`
          INSERT INTO mail_delivery_log (shop, queue_id, provider, status, error_message)
          VALUES (${SHOP}, ${item.id}, 'none', 'failed', ${message})
        `
        errors.push({ id: Number(item.id), error: message })
      }
    }

    return NextResponse.json({ success: true, sent, errors })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
