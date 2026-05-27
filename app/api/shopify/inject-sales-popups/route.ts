import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({
    success: false,
    error:
      "Pour injecter automatiquement dans la boutique client, il faut d’abord récupérer un vrai token Shopify Admin. Pour l’instant, le widget fonctionne dans Boost mais pas encore côté boutique.",
  })
}