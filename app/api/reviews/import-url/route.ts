import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { detectPlatform } from "../../../../lib/scraper-engine/detect-plateform"
import type { ScraperPlatform } from "../../../../lib/scraper-engine/types"

const supportedPlatforms: ScraperPlatform[] = [
  "aliexpress",
  "amazon",
  "loox",
  "judge_me",
  "ryviu",
]

function isSafePublicUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()

    if (!["http:", "https:"].includes(url.protocol)) return false
    if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return false
    if (/^10\./.test(hostname)) return false
    if (/^192\.168\./.test(hostname)) return false
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false

    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const productHandle = String(body.product_handle || "").trim()
    const url = String(body.url || "").trim()
    const requestedPlatform = String(body.platform || "auto")

    if (!productHandle) {
      return NextResponse.json(
        {
          success: false,
          error: "Produit cible obligatoire",
        },
        { status: 400 }
      )
    }

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "Lien obligatoire",
        },
        { status: 400 }
      )
    }

    if (!isSafePublicUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Le lien fourni n’est pas une adresse publique valide." },
        { status: 400 }
      )
    }

    const detectedPlatform = detectPlatform(url)
    const platform = supportedPlatforms.includes(
      requestedPlatform as ScraperPlatform
    )
      ? (requestedPlatform as ScraperPlatform)
      : detectedPlatform

    if (platform === "unknown") {
      return NextResponse.json(
        {
          success: false,
          error: "Choisis Amazon, AliExpress, Loox, Judge.me ou Ryviu dans la liste.",
        },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO review_import_jobs (
        product_handle,
        source_url,
        platform,
        status,
        imported_count,
        updated_at
      )
      VALUES (
        ${productHandle},
        ${url},
        ${platform},
        'pending',
        0,
        NOW()
      )
      RETURNING id, product_handle, source_url, platform, status, imported_count, created_at, updated_at
    `

    const job = result.rows[0]

    return NextResponse.json({
      success: true,
      job,
      platform,
      product_handle: productHandle,
      url,
      imported: 0,
      message: `Lien ${platform} enregistré. Tu peux maintenant lancer l’extraction depuis l’historique.`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}
