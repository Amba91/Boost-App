import { sql } from "@vercel/postgres"

export const defaultMerchantSettings = {
  shop: "hy4nf1-dt.myshopify.com",
  language: "fr",
  shop_name: "Kiidiiz",
  support_email: "contact@kiidiiz.com",
  plan: "Boost Starter",
  notifications_email: true,
  notifications_reviews: true,
  notifications_orders: true,
}

export async function ensureMerchantSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS merchant_settings (
      shop TEXT PRIMARY KEY,
      language TEXT NOT NULL DEFAULT 'fr',
      shop_name TEXT NOT NULL DEFAULT '',
      support_email TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'Boost Starter',
      notifications_email BOOLEAN NOT NULL DEFAULT true,
      notifications_reviews BOOLEAN NOT NULL DEFAULT true,
      notifications_orders BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}
