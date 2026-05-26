import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const shop = searchParams.get("shop")
  const code = searchParams.get("code")

  if (!shop || !code) {
    return NextResponse.json(
      { error: "Missing shop or code" },
      { status: 400 }
    )
  }

  const tokenResponse = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    }
  )

  const data = await tokenResponse.json()

  if (!data.access_token) {
    return NextResponse.json(
      {
        error: "OAuth failed",
        details: data,
      },
      { status: 400 }
    )
  }

  const appUrl =
    process.env.SHOPIFY_APP_URL || "https://boost-app-9e6w.vercel.app"

  const redirect = NextResponse.redirect(`${appUrl}/?shop=${shop}&connected=true`)

  redirect.cookies.set("boost_shop", shop, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  })

  redirect.cookies.set("boost_token", data.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  })

  return redirect
}