import { sql } from "@vercel/postgres"

export const defaultReviewRequestSettings = {
  active: false,
  delay_days: 3,
}

export async function ensureReviewRequestTrackingTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS review_request_settings (
      shop TEXT PRIMARY KEY,
      active BOOLEAN NOT NULL DEFAULT false,
      delay_days INTEGER NOT NULL DEFAULT 3,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS review_request_queue (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_name TEXT,
      customer_email TEXT NOT NULL,
      customer_first_name TEXT,
      product_handle TEXT NOT NULL,
      product_title TEXT,
      delivered_at TIMESTAMP NOT NULL,
      scheduled_for TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (shop, order_id, product_handle)
    )
  `
}
