type TemplateValues = {
  firstName: string
  productTitle: string
  orderName: string
  reward: string
}

type EmailSettings = {
  sender_name: string
  sender_email: string
  subject: string
  heading: string
  message: string
  button_text: string
  reward_type: string
  reward_label: string
  reward_code: string
  reward_url: string
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function fillReviewTemplate(template: string, values: TemplateValues) {
  return String(template || "")
    .replaceAll("{prenom}", values.firstName || "")
    .replaceAll("{produit}", values.productTitle || "votre produit")
    .replaceAll("{commande}", values.orderName || "")
    .replaceAll("{recompense}", values.reward || "")
}

export function buildReviewEmail({
  settings,
  firstName,
  orderName,
  productTitle,
  productImageUrl,
  productHandle,
}: {
  settings: EmailSettings
  firstName: string
  orderName: string
  productTitle: string
  productImageUrl?: string | null
  productHandle: string
}) {
  const reward = settings.reward_label || ""
  const values = { firstName, productTitle, orderName, reward }
  const subject = fillReviewTemplate(settings.subject, values)
  const heading = fillReviewTemplate(settings.heading, values)
  const message = fillReviewTemplate(settings.message, values)
  const reviewUrl = `https://kiidiiz.com/products/${encodeURIComponent(
    productHandle
  )}?boost_review=1&utm_source=review_email&utm_medium=email&utm_campaign=post_delivery#boost-reviews-widget`
  const rewardVisible = settings.reward_type !== "none" && reward
  const rewardLink = settings.reward_url || reviewUrl

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f6faf9;font-family:Arial,sans-serif;color:#172033">
  <div style="display:none;max-height:0;overflow:hidden">Ton expérience avec ${escapeHtml(productTitle)} peut aider une autre famille.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6faf9;padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,.08)">
      <tr><td style="padding:28px 34px 14px;text-align:center"><div style="font-size:28px;font-weight:800;color:#172033">Kiidiiz</div><div style="margin-top:5px;color:#6b7280;font-size:13px">Apprendre, créer et partager en s’amusant</div></td></tr>
      ${productImageUrl ? `<tr><td style="padding:12px 34px;text-align:center"><img src="${escapeHtml(productImageUrl)}" alt="${escapeHtml(productTitle)}" width="260" style="display:block;width:100%;max-width:260px;height:auto;margin:auto;border-radius:18px"></td></tr>` : ""}
      <tr><td style="padding:18px 34px 8px;text-align:center"><h1 style="margin:0;font-size:28px;line-height:1.2">${escapeHtml(heading)}</h1></td></tr>
      <tr><td style="padding:10px 34px;color:#4b5563;font-size:16px;line-height:1.65;text-align:center">${escapeHtml(message).replace(/\n/g, "<br>")}</td></tr>
      <tr><td style="padding:18px 34px;text-align:center"><a href="${reviewUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:12px;font-weight:800">${escapeHtml(settings.button_text)}</a></td></tr>
      ${rewardVisible ? `<tr><td style="padding:8px 34px 24px"><div style="padding:18px;border-radius:14px;background:#ecfdf5;border:1px solid #a7f3d0;text-align:center"><strong style="display:block;color:#047857;font-size:17px">Un merci pour ton avis honnête</strong><p style="margin:8px 0;color:#374151">${escapeHtml(reward)}</p>${settings.reward_code ? `<div style="display:inline-block;padding:10px 16px;border:2px dashed #059669;border-radius:9px;font-weight:800;letter-spacing:1px">${escapeHtml(settings.reward_code)}</div>` : ""}${settings.reward_url ? `<p style="margin:14px 0 0"><a href="${escapeHtml(rewardLink)}" style="color:#047857;font-weight:700">Accéder à mon cadeau</a></p>` : ""}<p style="margin:10px 0 0;font-size:11px;color:#6b7280">Cette attention récompense un avis sincère, quelle que soit la note donnée.</p></div></td></tr>` : ""}
      <tr><td style="padding:18px 34px 30px;border-top:1px solid #eef2f7;color:#6b7280;font-size:12px;line-height:1.5;text-align:center">Commande ${escapeHtml(orderName)} · Tu reçois ce message parce que cette commande a été livrée.<br>Kiidiiz · contact@kiidiiz.com</td></tr>
    </table>
  </td></tr></table>
</body></html>`

  return { subject, html, reviewUrl }
}

export async function sendReviewEmail({
  to,
  settings,
  subject,
  html,
}: {
  to: string
  settings: EmailSettings
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY manquante")

  const senderEmail = process.env.RESEND_FROM_EMAIL || settings.sender_email
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${settings.sender_name} <${senderEmail}>`,
      to: [to],
      reply_to: settings.sender_email,
      subject,
      html,
    }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || "Envoi Resend impossible")
  return result as { id?: string }
}
