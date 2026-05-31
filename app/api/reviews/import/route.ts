import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

const SHOP = "kiidiiz.com"

function parseCSVLine(line: string) {
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
    } else if (char === "," && !insideQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function toBoolean(value: string) {
  return ["true", "1", "yes", "oui"].includes(String(value).toLowerCase())
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
    const lines = text.split(/\r?\n/).filter(Boolean)

    const headers = parseCSVLine(lines[0]).map((h) => h.trim())

    let imported = 0

    for (const line of lines.slice(1)) {
      const values = parseCSVLine(line)

      const row: Record<string, string> = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      if (!row.product_handle || !row.review) continue

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
          ${row.product_handle},
          ${row.customer_first_name || ""},
          ${row.customer_last_name || ""},
          ${Number(row.rating || 5)},
          ${row.review || ""},
          ${row.image_url || ""},
          ${row.video_url || ""},
          ${toBoolean(row.verified)},
          ${toBoolean(row.verified_parent)},
          ${toBoolean(row.verified_purchase)},
          ${row.visible ? toBoolean(row.visible) : true}
        )
      `

      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
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