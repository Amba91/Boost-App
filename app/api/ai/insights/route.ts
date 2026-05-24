import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    insights: [
      { title: "Active Sticky Cart sur toutes les pages produits", impact: "High" },
      { title: "Ajoute un bundle sur tes 3 produits les plus vendus", impact: "Medium" },
      { title: "Affiche les avis clients au-dessus du bouton achat", impact: "Medium" },
    ],
  })
}