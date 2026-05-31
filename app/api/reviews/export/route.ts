import { sql } from "@vercel/postgres"

const SHOP = "kiidiiz.com"

function escapeCSV(value: any) {
  if (value === null || value === undefined) return ""

  const text = String(value).replace(/"/g, '""')

  return `"${text}"`
}

export async function GET() {
  const result = await sql`
    SELECT
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
    FROM product_reviews
    WHERE shop = ${SHOP}
    ORDER BY created_at DESC
  `

  const headers = [
    "product_handle",
    "customer_first_name",
    "customer_last_name",
    "rating",
    "review",
    "image_url",
    "video_url",
    "verified",
    "verified_parent",
    "verified_purchase",
    "visible",
    "created_at",
  ]

  const rows = result.rows.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(",")
  )

  const csv = [headers.join(","), ...rows].join("\n")

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=boost-reviews.csv",
    },
  })
}