import { NextResponse } from "next/server"

const allowedHostSuffixes = [
  "media-amazon.com",
  "ssl-images-amazon.com",
  "amazonaws.com",
  "alicdn.com",
  "aliexpress-media.com",
  "judge.me",
  "loox.io",
  "ryviu.com",
  "shopify.com",
  "shopifycdn.com",
  "vercel-storage.com",
]

function isAllowedHost(hostname: string) {
  const host = hostname.toLowerCase()

  return allowedHostSuffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  )
}

export async function GET(request: Request) {
  try {
    const source = new URL(request.url).searchParams.get("url")

    if (!source) {
      return NextResponse.json({ error: "URL manquante" }, { status: 400 })
    }

    const sourceUrl = new URL(source)

    if (sourceUrl.protocol !== "https:" || !isAllowedHost(sourceUrl.hostname)) {
      return NextResponse.json({ error: "Source non autorisée" }, { status: 400 })
    }

    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 Boost Reviews Media",
      },
      next: { revalidate: 86400 },
    })

    const contentType = response.headers.get("content-type") || ""

    if (!response.ok || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Image indisponible" }, { status: 404 })
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch {
    return NextResponse.json({ error: "Image invalide" }, { status: 400 })
  }
}
