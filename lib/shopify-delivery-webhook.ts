export async function registerDeliveryWebhook(
  shop: string,
  accessToken: string
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
          topic: "FULFILLMENT_EVENTS_CREATE",
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

  return {
    success: response.ok && !result.errors && errors.length === 0,
    errors: result.errors || errors,
  }
}
