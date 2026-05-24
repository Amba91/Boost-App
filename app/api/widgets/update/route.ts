import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  const body = await request.json()

  return NextResponse.json({
    success: true,
    message: "Widget updated",
    widget: body,
  })
}