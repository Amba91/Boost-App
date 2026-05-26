import { NextResponse } from "next/server"
import { createTables } from "@/lib/db"

export async function GET() {
  await createTables()

  return NextResponse.json({
    success: true,
  })
}