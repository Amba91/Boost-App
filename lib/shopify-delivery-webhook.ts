export async function registerDeliveryWebhook(
  shop: string,
  accessToken: string
) {
  return registerWebhook(shop, accessToken, "FULFILLMENT_EVENTS_CREATE")
}

export async function registerMailAutomationWebhooks(
  shop: string,
  accessToken: string
) {
  const topics = ["FULFILLMENT_EVENTS_CREATE", "ORDERS_CREATE"] as const
  const results = await Promise.all(
    topics.map((topic) => registerWebhook(shop, accessToken, topic))
  )

  return {
    success: results.every((result) => result.success || result.alreadyExists),
    results,
  }
}

async function registerWebhook(
  shop: string,
  accessToken: string,
  topic: "FULFILLMENT_EVENTS_CREATE" | "ORDERS_CREATE"
) {
  const appUrl =
    process.env.SHOPIFY_APP_URL || "https://boost-app-9e6w.vercel.app"
  const response = await fetch(
    `https://${shop}/admin/api/2026-04/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: `
          mutation RegisterDeliveryWebhook(
            $topic: WebhookSubscriptionTopic!,
            $webhookSubscription: WebhookSubscriptionInput!
          ) {
            webhookSubscriptionCreate(
              topic: $topic,
              webhookSubscription: $webhookSubscription
            ) {
              webhookSubscription {
                id
                topic
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          topic,
          webhookSubscription: {
            uri: `${appUrl}/api/shopify/webhooks`,
            format: "JSON",
          },
        },
      }),
    }
  )
  const result = await response.json()
  const errors = result.data?.webhookSubscriptionCreate?.userErrors || []
  const alreadyExists = errors.some((error: { message?: string }) =>
    String(error.message || "").toLowerCase().includes("already")
  )

  return {
    success: response.ok && !result.errors && (errors.length === 0 || alreadyExists),
    alreadyExists,
    topic,
    errors: result.errors || errors,
  }
}
