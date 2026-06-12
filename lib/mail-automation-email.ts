type AutomationSettings = {
  subject: string
  heading: string
  message: string
  button_text: string
  reward_type: string
  reward_label: string
  reward_code: string
  reward_url: string
}

type AutomationValues = {
  firstName: string
  orderName: string
  productTitle: string
  productImageUrl?: string | null
  actionUrl: string
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function replaceTokens(template: string, values: AutomationValues, reward: string) {
  return String(template || "")
    .replaceAll("{prenom}", values.firstName || "Bonjour")
    .replaceAll("{commande}", values.orderName || "")
    .replaceAll("{produit}", values.productTitle || "votre produit")
    .replaceAll("{recompense}", reward || "")
}

export function buildAutomationEmail({
  settings,
  values,
}: {
  settings: AutomationSettings
  values: AutomationValues
}) {
  const reward = settings.reward_label || settings.reward_code || ""
  const subject = replaceTokens(settings.subject, values, reward)
  const heading = replaceTokens(settings.heading, values, reward)
  const message = replaceTokens(settings.message, values, reward)
  const actionUrl = values.actionUrl || "https://kiidiiz.com"
  const rewardVisible = settings.reward_type !== "none" && reward

  const html = `
  <div style="margin:0;padding:30px;background:#f8fafc;font-family:Arial,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,.08)">
      <tr><td style="padding:30px 34px 10px;text-align:center"><h1 style="margin:0;font-size:28px;line-height:1.2">${escapeHtml(heading)}</h1></td></tr>
      ${
        values.productImageUrl
          ? `<tr><td style="padding:12px 34px;text-align:center"><img src="${escapeHtml(values.productImageUrl)}" alt="${escapeHtml(values.productTitle)}" width="260" style="display:block;width:100%;max-width:260px;height:auto;margin:auto;border-radius:18px"></td></tr>`
          : ""
      }
      <tr><td style="padding:10px 34px;color:#374151;font-size:16px;line-height:1.65;text-align:center">${escapeHtml(message)}</td></tr>
      <tr><td style="padding:18px 34px;text-align:center"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:12px;font-weight:800">${escapeHtml(settings.button_text || "Découvrir")}</a></td></tr>
      ${
        rewardVisible
          ? `<tr><td style="padding:8px 34px 24px"><div style="padding:18px;border-radius:14px;background:#ecfdf5;border:1px solid #a7f3d0;text-align:center"><strong style="display:block;color:#047857;font-size:17px">${escapeHtml(reward)}</strong>${settings.reward_code ? `<div style="display:inline-block;margin-top:12px;padding:10px 16px;border:2px dashed #059669;border-radius:9px;font-weight:800;letter-spacing:1px">${escapeHtml(settings.reward_code)}</div>` : ""}${settings.reward_url ? `<p style="margin:14px 0 0"><a href="${escapeHtml(settings.reward_url)}" style="color:#047857;font-weight:700">Accéder à mon cadeau</a></p>` : ""}</div></td></tr>`
          : ""
      }
      <tr><td style="padding:18px 34px 30px;border-top:1px solid #eef2f7;color:#6b7280;font-size:12px;line-height:1.5;text-align:center">Commande ${escapeHtml(values.orderName)}<br>Kiidiiz · contact@kiidiiz.com</td></tr>
    </table>
  </div>`

  return { subject, html, actionUrl }
}
