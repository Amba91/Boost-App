export async function shopifyGraphQL(
  shop: string,
  accessToken: string,
  query: string
) {
  const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query }),
  })

  return response.json()
}