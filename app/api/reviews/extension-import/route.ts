import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

type ExtensionReview = {
  author?: string
  name?: string
  rating?: number | string
  review?: string
  text?: string
  image_url?: string
  video_url?: string
  date?: string
}

type NormalizedReview = {
  customer_first_name: string
  customer_last_name: string
  rating: number
  review: string
  image_url: string
  video_url: string
  created_at: string
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength)
}

function normalizeUrl(value: unknown) {
  const raw = cleanText(value, 1200)
  if (!raw) return ""

  try {
    const url = new URL(raw)
    if (!["http:", "https:"].includes(url.protocol)) return ""
    return url.toString()
  } catch {
    return ""
  }
}

function splitName(value: unknown) {
  const name = cleanText(value, 140) || "Client AliExpress"
  const parts = name.split(" ")
  return {
    firstName: parts[0] || "Client",
    lastName: parts.slice(1).join(" "),
  }
}

function normalizeReview(review: ExtensionReview): NormalizedReview {
  const name = splitName(review.author || review.name)
  const rating = Number(review.rating || 5)

  return {
    customer_first_name: name.firstName,
    customer_last_name: name.lastName,
    rating: Number.isFinite(rating) ? Math.min(Math.max(rating, 1), 5) : 5,
    review: cleanText(review.review || review.text, 1200),
    image_url: normalizeUrl(review.image_url),
    video_url: normalizeUrl(review.video_url),
    created_at: review.date || new Date().toISOString(),
  }
}

async function ensureExtensionReviewTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS review_extension_imports (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL DEFAULT 'kiidiiz.com',
      source TEXT NOT NULL DEFAULT 'aliexpress_extension',
      source_url TEXT NOT NULL DEFAULT '',
      product_title TEXT NOT NULL DEFAULT '',
      reviews JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      product_handle TEXT NOT NULL DEFAULT '',
      imported_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function POST(request: Request) {
  try {
    await ensureExtensionReviewTables()
    const body = await request.json()
    const rawReviews: ExtensionReview[] = Array.isArray(body.reviews)
      ? body.reviews
      : []
    const reviews: NormalizedReview[] = rawReviews
      .map(normalizeReview)
      .filter((review: NormalizedReview) => review.review)

    if (!reviews.length) {
      return NextResponse.json(
        { success: false, error: "Aucun avis AliExpress visible n'a été détecté." },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO review_extension_imports (
        shop,
        source_url,
        product_title,
        reviews,
        status,
        updated_at
      )
      VALUES (
        'kiidiiz.com',
        ${normalizeUrl(body.source_url)},
        ${cleanText(body.product_title, 260)},
        ${JSON.stringify(reviews)}::jsonb,
        'pending',
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      import: result.rows[0],
      reviews_count: reviews.length,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    await ensureExtensionReviewTables()
    const { searchParams } = new URL(request.url)
    const id = Number(searchParams.get("id") || 0)

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Import avis introuvable." },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT *
      FROM review_extension_imports
      WHERE id = ${id}
      LIMIT 1
    `

    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: "Import avis introuvable." },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, import: result.rows[0] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureExtensionReviewTables()
    const body = await request.json()
    const id = Number(body.id || 0)
    const productHandle = cleanText(body.product_handle, 180)

    if (!id || !productHandle) {
      return NextResponse.json(
        { success: false, error: "Choisis un produit avant d'importer les avis." },
        { status: 400 }
      )
    }

    const pending = await sql`
      SELECT *
      FROM review_extension_imports
      WHERE id = ${id}
      LIMIT 1
    `

    const batch = pending.rows[0]
    const reviews = Array.isArray(batch?.reviews) ? batch.reviews : []

    if (!batch || !reviews.length) {
      return NextResponse.json(
        { success: false, error: "Aucun avis à importer." },
        { status: 404 }
      )
    }

    let imported = 0

    for (const review of reviews) {
      await sql`
        INSERT INTO product_reviews (
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
          created_at
        )
        VALUES (
          ${productHandle},
          ${review.customer_first_name || "Client"},
          ${review.customer_last_name || ""},
          ${Number(review.rating || 5)},
          ${review.review || ""},
          ${review.image_url || ""},
          ${review.video_url || ""},
          true,
          true,
          true,
          true,
          ${review.created_at || new Date().toISOString()}
        )
      `

      imported += 1
    }

    await sql`
      UPDATE review_extension_imports
      SET status = 'imported',
          product_handle = ${productHandle},
          imported_count = ${imported},
          updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true, imported })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
