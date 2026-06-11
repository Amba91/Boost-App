import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier reçu" },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Le fichier doit être une image." },
        { status: 400, headers: corsHeaders }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "L’image ne doit pas dépasser 5 Mo." },
        { status: 400, headers: corsHeaders }
      )
    }

    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-")

    const blob = await put(`reviews/${Date.now()}-${safeName}`, file, {
      access: "public",
    })

    return NextResponse.json(
      {
        success: true,
        url: blob.url,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
