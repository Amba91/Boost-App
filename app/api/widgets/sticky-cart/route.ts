import { NextResponse } from "next/server"

export async function GET() {
  const script = `
    const s = document.createElement("script")
    s.src = "/widgets/sticky-cart.js"
    document.body.appendChild(s)
  `

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
    },
  })
}