import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "kiidiiz.com"

type ImportSource = "boost" | "amazon" | "loox" | "judge_me" | "unknown"

type NormalizedReview = {
  product_handle: string
  customer_first_name: string
  customer_last_name: string
  rating: number
  review: string
  image_url: string
  video_url: string
  verified: boolean
  verified_parent: boolean
  verified_purchase: boolean
  visible: boolean
}

function detectDelimiter(line: string) {
  const semicolonCount = (line.match(/;/g) || []).length
  const commaCount = (line.match(/,/g) || []).length

  return semicolonCount > commaCount ? ";" : ","
}

function parseCSVLine(line: string, delimiter: string) {
  const result: string[] = []
  let current = ""
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && insideQuotes && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function normalizeHeader(header: string) {
  return String(header || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/[^\w]/g, "")
}

function toBoolean(value: string | boolean | undefined, defaultValue = false) {
  if (typeof value === "boolean") return value

  const normalized = String(value || "").toLowerCase().trim()

  if (["true", "1", "yes", "oui", "vrai", "y"].includes(normalized)) {
    return true
  }

  if (["false", "0", "no", "non", "faux", "n"].includes(normalized)) {
    return false
  }

  return defaultValue
}

function toRating(value: string | number | undefined) {
  const rating = Number(value || 5)

  if (!Number.isFinite(rating)) return 5

  return Math.min(Math.max(Math.round(rating), 1), 5)
}

function splitFullName(fullName: string) {
  const cleanName = String(fullName || "").trim()

  if (!cleanName) {
    return {
      firstName: "Client",
      lastName: "",
    }
  }

  const parts = cleanName.split(/\s+/)

  return {
    firstName: parts[0] || "Client",
    lastName: parts.slice(1).join(" "),
  }
}

function getValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key)

    if (row[normalizedKey]) {
      return row[normalizedKey]
    }
  }

  return ""
}

function detectSource(headers: string[]): ImportSource {
  const normalizedHeaders = headers.map(normalizeHeader)
  const joined = normalizedHeaders.join("|")

  const has = (key: string) => normalizedHeaders.includes(normalizeHeader(key))

  if (
    has("product_handle") &&
    has("customer_first_name") &&
    has("review")
  ) {
    return "boost"
  }

  if (
    has("reviewer_name") ||
    has("reviewer_email") ||
    has("review_body") ||
    has("photo_urls")
  ) {
    return "loox"
  }

  if (
    has("review_title") ||
    has("review_content") ||
    has("reviewer_display_name") ||
    has("product_external_id")
  ) {
    return "judge_me"
  }

  if (
    joined.includes("amazon") ||
    has("profile_name") ||
    has("review_text") ||
    has("review_date") ||
    has("asin")
  ) {
    return "amazon"
  }

  return "unknown"
}

function normalizeRow(
  row: Record<string, string>,
  source: ImportSource
): NormalizedReview | null {
  if (source === "boost") {
    return {
      product_handle: getValue(row, ["product_handle"]),
      customer_first_name: getValue(row, ["customer_first_name"]),
      customer_last_name: getValue(row, ["customer_last_name"]),
      rating: toRating(getValue(row, ["rating"])),
      review: getValue(row, ["review"]),
      image_url: getValue(row, ["image_url"]),
      video_url: getValue(row, ["video_url"]),
      verified: toBoolean(getValue(row, ["verified"]), true),
      verified_parent: toBoolean(getValue(row, ["verified_parent"]), true),
      verified_purchase: toBoolean(getValue(row, ["verified_purchase"]), true),
      visible: getValue(row, ["visible"])
        ? toBoolean(getValue(row, ["visible"]), true)
        : true,
    }
  }

  if (source === "loox") {
    const fullName = getValue(row, ["reviewer_name", "name", "author"])
    const name = splitFullName(fullName)

    return {
      product_handle: getValue(row, [
        "product_handle",
        "product_slug",
        "handle",
        "product_url",
      ]),
      customer_first_name: name.firstName,
      customer_last_name: name.lastName,
      rating: toRating(getValue(row, ["rating", "stars"])),
      review: getValue(row, ["review_body", "body", "review", "content"]),
      image_url: getValue(row, ["photo_urls", "photo_url", "image_url"]),
      video_url: getValue(row, ["video_url"]),
      verified: true,
      verified_parent: true,
      verified_purchase: true,
      visible: true,
    }
  }

  if (source === "judge_me") {
    const fullName = getValue(row, [
      "reviewer_display_name",
      "reviewer_name",
      "name",
      "author",
    ])
    const name = splitFullName(fullName)

    return {
      product_handle: getValue(row, [
        "product_handle",
        "handle",
        "product_title",
        "product_external_id",
      ]),
      customer_first_name: name.firstName,
      customer_last_name: name.lastName,
      rating: toRating(getValue(row, ["rating", "stars"])),
      review:
        getValue(row, ["review_content", "body", "content", "review"]) ||
        getValue(row, ["review_title"]),
      image_url: getValue(row, ["picture_urls", "image_url", "photo_url"]),
      video_url: getValue(row, ["video_url"]),
      verified: true,
      verified_parent: true,
      verified_purchase: true,
      visible: true,
    }
  }

  if (source === "amazon") {
    const fullName = getValue(row, ["profile_name", "name", "author"])
    const name = splitFullName(fullName)

    return {
      product_handle: getValue(row, [
        "product_handle",
        "handle",
        "asin",
        "product_title",
      ]),
      customer_first_name: name.firstName,
      customer_last_name: name.lastName,
      rating: toRating(getValue(row, ["rating", "stars", "review_rating"])),
      review: getValue(row, ["review_text", "review", "body", "content"]),
      image_url: getValue(row, ["image_url", "photo_url", "picture_url"]),
      video_url: getValue(row, ["video_url"]),
      verified: true,
      verified_parent: true,
      verified_purchase: true,
      visible: true,
    }
  }

  const fullName = getValue(row, ["name", "author", "customer_name"])
  const name = splitFullName(fullName)

  return {
    product_handle: getValue(row, [
      "product_handle",
      "handle",
      "product",
      "product_title",
    ]),
    customer_first_name:
      getValue(row, ["customer_first_name", "first_name"]) || name.firstName,
    customer_last_name:
      getValue(row, ["customer_last_name", "last_name"]) || name.lastName,
    rating: toRating(getValue(row, ["rating", "stars"])),
    review: getValue(row, ["review", "body", "content", "text"]),
    image_url: getValue(row, ["image_url", "photo_url", "picture_url"]),
    video_url: getValue(row, ["video_url"]),
    verified: true,
    verified_parent: true,
    verified_purchase: true,
    visible: true,
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier CSV reçu" },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({
        success: false,
        error: "CSV vide ou sans données",
      })
    }

    const delimiter = detectDelimiter(lines[0])
    const rawHeaders = parseCSVLine(lines[0], delimiter)
    const headers = rawHeaders.map(normalizeHeader)
    const source = detectSource(rawHeaders)

    let imported = 0
    let skipped = 0

    for (const line of lines.slice(1)) {
      const values = parseCSVLine(line, delimiter)

      const row: Record<string, string> = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      const normalizedReview = normalizeRow(row, source)

      if (!normalizedReview?.product_handle || !normalizedReview.review) {
        skipped++
        continue
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
          visible
        )
        VALUES (
          ${SHOP},
          ${normalizedReview.product_handle},
          ${normalizedReview.customer_first_name},
          ${normalizedReview.customer_last_name},
          ${normalizedReview.rating},
          ${normalizedReview.review},
          ${normalizedReview.image_url},
          ${normalizedReview.video_url},
          ${normalizedReview.verified},
          ${normalizedReview.verified_parent},
          ${normalizedReview.verified_purchase},
          ${normalizedReview.visible}
        )
      `

      imported++
    }

    return NextResponse.json({
      success: true,
      source,
      imported,
      skipped,
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