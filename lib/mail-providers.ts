export type MailProvider = "resend" | "klaviyo"

type SendPayload = {
  to: string
  firstName: string
  subject: string
  html: string
  senderName: string
  senderEmail: string
  orderName: string
  productTitle: string
  productHandle: string
  productImageUrl?: string | null
  reviewUrl: string
  rewardLabel?: string
  rewardCode?: string
  rewardUrl?: string
}

export function providerConnected(provider: MailProvider) {
  return provider === "resend"
    ? Boolean(process.env.RESEND_API_KEY)
    : Boolean(process.env.KLAVIYO_PRIVATE_API_KEY)
}

async function sendWithResend(payload: SendPayload) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("Resend n’est pas connecté")
  const fromEmail = process.env.RESEND_FROM_EMAIL || payload.senderEmail
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${payload.senderName} <${fromEmail}>`,
      to: [payload.to],
      reply_to: payload.senderEmail,
      subject: payload.subject,
      html: payload.html,
    }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || "Envoi Resend impossible")
  return { id: String(result.id || ""), provider: "resend" as const }
}

async function sendWithKlaviyo(payload: SendPayload) {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY
  if (!apiKey) throw new Error("Klaviyo n’est pas connecté")

  const response = await fetch("https://a.klaviyo.com/api/events", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      revision: "2026-01-15",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          metric: {
            data: {
              type: "metric",
              attributes: { name: "Boost Review Request Ready" },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: payload.to,
                first_name: payload.firstName || undefined,
              },
            },
          },
          properties: {
            subject: payload.subject,
            order_name: payload.orderName,
            product_title: payload.productTitle,
            product_handle: payload.productHandle,
            product_image_url: payload.productImageUrl || "",
            review_url: payload.reviewUrl,
            reward_label: payload.rewardLabel || "",
            reward_code: payload.rewardCode || "",
            reward_url: payload.rewardUrl || "",
          },
          unique_id: `boost-${payload.orderName}-${payload.productHandle}`,
        },
      },
    }),
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.errors?.[0]?.detail || "Événement Klaviyo impossible")
  }
  return { id: `klaviyo-${Date.now()}`, provider: "klaviyo" as const }
}

export async function sendWithProvider(provider: MailProvider, payload: SendPayload) {
  return provider === "resend" ? sendWithResend(payload) : sendWithKlaviyo(payload)
}
