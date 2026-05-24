import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    stats: {
      stores: 284,
      mrr: 8920,
      arr: 107040,
      trials: 62,
      lifetimeDeals: 12,
    },
  })
}