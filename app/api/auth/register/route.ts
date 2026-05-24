import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()

  return NextResponse.json({
    success: true,
    user: {
      email: body.email || "owner@boost-app.com",
      role: "OWNER",
    },
  })
}