import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    invoices: [
      {
        id: "INV-001",
        orderId: "#1001",
        customer: "Kiidiiz Customer",
        total: 89,
        status: "generated",
      },
      {
        id: "INV-002",
        orderId: "#1002",
        customer: "Emma Wilson",
        total: 129,
        status: "sent",
      },
    ],
  })
}