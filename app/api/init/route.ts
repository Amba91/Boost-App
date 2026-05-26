import { NextResponse } from "next/server"
import { createTables } from "@/lib/db"

export async function GET() {
  try {
    await createTables()

    return NextResponse.json({
      success: true,
      message: "Database initialized",
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