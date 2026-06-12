import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { buildAutomationEmail } from "../../../../lib/mail-automation-email"
import { ensureMailAutomationTables } from "../../../../lib/mail-automation-settings"
import {
  defaultReviewEmailSettings,
  ensureReviewEmailSettingsTable,
} from "../../../../lib/review-email-settings"
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
    await ensureMailAutomationTables()
    await ensureReviewEmailSettingsTable()
    const [settingsResult, queueResult, providerSettingsResult, usageResult] =
      await Promise.all([
        sql`SELECT * FROM mail_automation_settings WHERE shop = ${SHOP}`,
        sql`
          SELECT *
          FROM mail_automation_queue
          WHERE shop = ${SHOP}
            AND status = 'scheduled'
            AND scheduled_for <= NOW()
          ORDER BY scheduled_for ASC
          LIMIT 25
        `,
        sql`SELECT * FROM review_email_settings WHERE shop = ${SHOP} LIMIT 1`,
        sql`
          SELECT provider, COUNT(*)::int AS sent
          FROM mail_delivery_log
          WHERE shop = ${SHOP} AND status = 'sent'
            AND created_at >= date_trunc('month', NOW())
          GROUP BY provider
        `,
      ])

    const settingsByScenario = Object.fromEntries(
      settingsResult.rows.map((row) => [String(row.scenario), row])
    )
    const providerSettings = providerSettingsResult.rows[0] || defaultReviewEmailSettings
    const usage = Object.fromEntries(
      usageResult.rows.map((row) => [String(row.provider), Number(row.sent)])
    )

    let sent = 0
    const errors: Array<{ id: number; error: string }> = []

    for (const item of queueResult.rows) {
      const automation = settingsByScenario[String(item.scenario)]
      if (!automation?.active) continue

      try {
        const email = buildAutomationEmail({
          settings: automation as never,
          values: {
            firstName: String(item.customer_first_name || ""),
            orderName: String(item.order_name || ""),
            productTitle: String(item.product_title || "votre produit"),
            productImageUrl: item.product_image_url,
            actionUrl: String(item.action_url || "https://kiidiiz.com"),
          },
        })
        const primary = String(providerSettings.primary_provider || "resend") as MailProvider
        const fallback = String(providerSettings.fallback_provider || "klaviyo") as MailProvider
        const mode = String(providerSettings.provider_mode || "fallback")
        const providers = [primary]
        if (mode !== "manual" && fallback !== primary) providers.push(fallback)

        let result: { id: string; provider: MailProvider } | null = null
        const providerErrors: string[] = []
        for (const provider of providers) {
          const monthlyLimit = Number(
            provider === "resend"
              ? providerSettings.resend_monthly_limit || 3000
              : providerSettings.klaviyo_monthly_limit || 500
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
              senderName: String(providerSettings.sender_name || "Kiidiiz"),
              senderEmail: String(providerSettings.sender_email || "contact@kiidiiz.com"),
              orderName: String(item.order_name || ""),
              productTitle: String(item.product_title || "votre produit"),
              productHandle: String(item.product_handle || ""),
              productImageUrl: item.product_image_url,
              reviewUrl: email.actionUrl,
              rewardLabel: String(automation.reward_label || ""),
              rewardCode: String(automation.reward_code || ""),
              rewardUrl: String(automation.reward_url || ""),
            })
            usage[provider] = (usage[provider] || 0) + 1
            break
          } catch (error) {
            providerErrors.push(`${provider}: ${String(error)}`)
          }
        }
        if (!result) throw new Error(providerErrors.join(" | ") || "Aucun fournisseur disponible")

        await sql`
          UPDATE mail_automation_queue
          SET status = 'sent',
              sent_at = NOW(),
              external_id = ${result.id || ""},
              error_message = NULL,
              updated_at = NOW()
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
          UPDATE mail_automation_queue
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
