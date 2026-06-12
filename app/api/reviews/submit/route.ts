import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { ensureReviewPriorityColumn } from "../../../../lib/reviews-schema"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength)
}

function validImageUrl(value: unknown) {
  const raw = cleanText(value, 1000)
  if (!raw) return ""

  try {
    const url = new URL(raw)
    return url.protocol === "https:" ? url.href : ""
  } catch {
    return ""
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    await ensureReviewPriorityColumn()
    const body = await request.json()

    // A hidden field catches simple automated form submissions.
    if (body.website) {
      return NextResponse.json({ success: true }, { headers: corsHeaders })
    }

    const productHandle = cleanText(body.product_handle, 200)
    const firstName = cleanText(body.customer_first_name, 60)
    const lastName = cleanText(body.customer_last_name, 60)
    const review = cleanText(body.review, 2000)
    const rating = Math.min(Math.max(Math.round(Number(body.rating) || 5), 1), 5)
    const imageUrl = validImageUrl(body.image_url)

    if (!productHandle || productHandle.includes("/") || productHandle.includes("\\")) {
      return NextResponse.json(
        { success: false, error: "Produit invalide." },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!firstName || review.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Indique ton prénom et un avis d’au moins 10 caractères.",
        },
        { status: 400, headers: corsHeaders }
      )
    }

    await sql`
      INSERT INTO product_reviews (
        shop,
        product_handle,
        customer_first_name,
        customer_last_name,
        rating,
        review,
        image_url,
        video_url,
        verified,
        verified_parent,
        verified_purchase,
        visible,
        merchant_reply,
        featured,
        source
      )
      VALUES (
        'kiidiiz.com',
        ${productHandle},
        ${firstName},
        ${lastName},
        ${rating},
        ${review},
        ${imageUrl},
        '',
        false,
        false,
        false,
        false,
        '',
        false,
        'storefront'
      )
    `

    return NextResponse.json(
      {
        success: true,
        message: "Merci ! Ton avis sera publié après validation.",
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    )
  }
}
