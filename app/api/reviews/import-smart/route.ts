import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

type ExternalReview = {
  product_handle?: string
  customer_first_name?: string
  customer_last_name?: string
  name?: string
  author?: string
  rating?: string | number
  review?: string
  body?: string
  text?: string
  image_url?: string
  photo?: string
  video_url?: string
  verified?: string | boolean
  verified_purchase?: string | boolean
  visible?: string | boolean
  created_at?: string
  date?: string
}

function toBoolean(value: unknown, defaultValue = true) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const v = value.toLowerCase().trim()
    if (["true", "1", "yes", "oui"].includes(v)) return true
    if (["false", "0", "no", "non"].includes(v)) return false
  }
  return defaultValue
}

function splitName(fullName?: string) {
  if (!fullName) {
    return {
      firstName: "Client",
      lastName: "",
    }
  }

  const parts = fullName.trim().split(" ")

  return {
    firstName: parts[0] || "Client",
    lastName: parts.slice(1).join(" "),
  }
}

function normalizeReview(raw: ExternalReview) {
  const name = raw.name || raw.author
  const splittedName = splitName(name)

  const rating = Number(raw.rating || 5)

  return {
    product_handle: raw.product_handle || "",
    customer_first_name: raw.customer_first_name || splittedName.firstName,
    customer_last_name: raw.customer_last_name || splittedName.lastName,
    rating: Number.isFinite(rating) ? Math.min(Math.max(rating, 1), 5) : 5,
    review: raw.review || raw.body || raw.text || "",
    image_url: raw.image_url || raw.photo || "",
    video_url: raw.video_url || "",
    verified: toBoolean(raw.verified, true),
    verified_parent: true,
    verified_purchase: toBoolean(raw.verified_purchase, true),
    visible: toBoolean(raw.visible, true),
    created_at: raw.created_at || raw.date || new Date().toISOString(),
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reviews: ExternalReview[] = Array.isArray(body.reviews)
      ? body.reviews
      : []

    if (!reviews.length) {
      return NextResponse.json(
        { success: false, error: "Aucun avis à importer." },
        { status: 400 }
      )
    }

    const normalizedReviews = reviews
      .map(normalizeReview)
      .filter((review) => review.product_handle && review.review)

    if (!normalizedReviews.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun avis valide trouvé. Vérifie product_handle et le texte de l'avis.",
        },
        { status: 400 }
      )
    }

    let imported = 0

    for (const review of normalizedReviews) {
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
          ${review.product_handle},
          ${review.customer_first_name},
          ${review.customer_last_name},
          ${review.rating},
          ${review.review},
          ${review.image_url},
          ${review.video_url},
          ${review.verified},
          ${review.verified_parent},
          ${review.verified_purchase},
          ${review.visible},
          ${review.created_at}
        )
      `

      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped: reviews.length - imported,
    })
  } catch (error) {
    console.error("IMPORT SMART REVIEWS ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import intelligent des avis.",
      },
      { status: 500 }
    )
  }
}