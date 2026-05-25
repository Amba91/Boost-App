import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()

  const shop = cookieStore.get("boost_shop")?.value
  const token = cookieStore.get("boost_token")?.value

  if (!shop || !token) {
    return NextResponse.json({
      success: false,
      error: "Not connected",
    })
  }

  const scriptUrl =
    "https://boost-app-9e6w.vercel.app/widgets/sticky-cart.js"

  const response = await fetch(
    `https://${shop}/admin/api/2026-04/script_tags.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        script_tag: {
          event: "onload",
          src: scriptUrl,
        },
      }),
    }
  )

  const data = await response.json()

  return NextResponse.json({
    success: true,
    data,
  })
}