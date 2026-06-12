import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { buildAutomationEmail } from "../../../../lib/mail-automation-email"
import {
  defaultMailAutomations,
  seedDefaultMailAutomations,
} from "../../../../lib/mail-automation-settings"

const SHOP = "hy4nf1-dt.myshopify.com"

function cleanText(value: unknown, fallback: string, maxLength: number) {
  return String(value ?? fallback).trim().slice(0, maxLength)
}

function cleanScenario(value: unknown) {
  const scenario = String(value || "")
  return defaultMailAutomations.some((item) => item.scenario === scenario)
    ? scenario
    : ""
}

export async function POST(request: Request) {
  try {
    await seedDefaultMailAutomations(SHOP)
    const body = await request.json()
    const scenario = cleanScenario(body.scenario)

    if (!scenario) {
      return NextResponse.json(
        { success: false, error: "Scénario invalide." },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT *
      FROM mail_automation_settings
      WHERE shop = ${SHOP} AND scenario = ${scenario}
      LIMIT 1
    `
    const settings = result.rows[0]

    if (!settings) {
      return NextResponse.json(
        { success: false, error: "Scénario introuvable." },
        { status: 404 }
      )
    }

    const email = buildAutomationEmail({
      settings: settings as never,
      values: {
        firstName: cleanText(body.first_name, "Sarah", 80),
        orderName: cleanText(body.order_name, "#TEST-1001", 80),
        productTitle: cleanText(
          body.product_title,
          "AdventureTrack™ - Circuit de Voitures Mécaniques et Educatives",
          180
        ),
        productImageUrl: cleanText(body.product_image_url, "", 500),
        actionUrl: cleanText(body.action_url, "https://kiidiiz.com/cart", 500),
      },
    })

    return NextResponse.json({
      success: true,
      scenario,
      subject: email.subject,
      html: email.html,
      action_url: email.actionUrl,
      note:
        "Prévisualisation uniquement : aucun e-mail n’a été envoyé et aucune commande Shopify n’a été créée.",
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
