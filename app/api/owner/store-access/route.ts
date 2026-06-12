import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

type AccessPatch = {
  shop?: string
  plan?: string
  subscription_status?: string
  monthly_price?: number
  lifetime_access?: boolean
  billing_active?: boolean
  note?: string
}

const defaultPlan = "Starter"

function cleanShop(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .slice(0, 180)
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  return String(value ?? fallback).trim().slice(0, maxLength)
}

function cleanPrice(value: unknown) {
  const price = Number(value)
  if (!Number.isFinite(price)) return 0
  return Math.max(0, Math.min(Math.round(price * 100) / 100, 9999))
}

async function ensureOwnerStoreAccessTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS owner_store_access (
      shop TEXT PRIMARY KEY,
      plan TEXT NOT NULL DEFAULT 'Starter',
      subscription_status TEXT NOT NULL DEFAULT 'trial',
      monthly_price NUMERIC(10,2) NOT NULL DEFAULT 29,
      lifetime_access BOOLEAN NOT NULL DEFAULT false,
      billing_active BOOLEAN NOT NULL DEFAULT true,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function GET() {
  try {
    await ensureOwnerStoreAccessTable()

    const result = await sql`
      WITH connected AS (
        SELECT shop, created_at, updated_at
        FROM shop_connections
      )
      SELECT
        connected.shop,
        connected.created_at,
        connected.updated_at,
        COALESCE(access.plan, ${defaultPlan}) AS plan,
        COALESCE(access.subscription_status, 'trial') AS subscription_status,
        COALESCE(access.monthly_price, 29) AS monthly_price,
        COALESCE(access.lifetime_access, false) AS lifetime_access,
        COALESCE(access.billing_active, true) AS billing_active,
        COALESCE(access.note, '') AS note
      FROM connected
      LEFT JOIN owner_store_access access ON access.shop = connected.shop

      UNION

      SELECT
        access.shop,
        access.created_at,
        access.updated_at,
        access.plan,
        access.subscription_status,
        access.monthly_price,
        access.lifetime_access,
        access.billing_active,
        access.note
      FROM owner_store_access access
      WHERE NOT EXISTS (
        SELECT 1 FROM shop_connections connected WHERE connected.shop = access.shop
      )
      ORDER BY updated_at DESC
    `

    return NextResponse.json({
      success: true,
      stores: result.rows,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error), stores: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await ensureOwnerStoreAccessTable()
    const body = (await request.json()) as AccessPatch
    const shop = cleanShop(body.shop)

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Boutique obligatoire." },
        { status: 400 }
      )
    }

    const lifetimeAccess = Boolean(body.lifetime_access)
    const billingActive =
      typeof body.billing_active === "boolean" ? body.billing_active : true
    const status = lifetimeAccess
      ? "lifetime"
      : cleanText(body.subscription_status, billingActive ? "active" : "paused", 40)

    const result = await sql`
      INSERT INTO owner_store_access (
        shop,
        plan,
        subscription_status,
        monthly_price,
        lifetime_access,
        billing_active,
        note,
        updated_at
      )
      VALUES (
        ${shop},
        ${cleanText(body.plan, defaultPlan, 80)},
        ${status},
        ${cleanPrice(body.monthly_price)},
        ${lifetimeAccess},
        ${billingActive},
        ${cleanText(body.note, "", 500)},
        NOW()
      )
      ON CONFLICT (shop)
      DO UPDATE SET
        plan = EXCLUDED.plan,
        subscription_status = EXCLUDED.subscription_status,
        monthly_price = EXCLUDED.monthly_price,
        lifetime_access = EXCLUDED.lifetime_access,
        billing_active = EXCLUDED.billing_active,
        note = EXCLUDED.note,
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      store: result.rows[0],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
