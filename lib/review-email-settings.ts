import { sql } from "@vercel/postgres"

export const defaultReviewEmailSettings = {
  sender_name: "Kiidiiz",
  sender_email: "contact@kiidiiz.com",
  subject: "{prenom}, que penses-tu de {produit} ?",
  heading: "Ton avis compte beaucoup pour nous",
  message:
    "Bonjour {prenom}, nous espérons que {produit} te plaît. Partage ton expérience pour aider d’autres familles à faire leur choix.",
  button_text: "Donner mon avis",
  reward_type: "none",
  reward_label: "",
  reward_code: "",
  reward_url: "",
  provider_mode: "fallback",
  primary_provider: "resend",
  fallback_provider: "klaviyo",
  resend_monthly_limit: 3000,
  klaviyo_monthly_limit: 500,
}

export async function ensureReviewEmailSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS review_email_settings (
      shop TEXT PRIMARY KEY,
      sender_name TEXT NOT NULL DEFAULT 'Kiidiiz',
      sender_email TEXT NOT NULL DEFAULT 'contact@kiidiiz.com',
      subject TEXT NOT NULL DEFAULT '{prenom}, que penses-tu de {produit} ?',
      heading TEXT NOT NULL DEFAULT 'Ton avis compte beaucoup pour nous',
      message TEXT NOT NULL DEFAULT 'Bonjour {prenom}, nous espérons que {produit} te plaît. Partage ton expérience pour aider d''autres familles à faire leur choix.',
      button_text TEXT NOT NULL DEFAULT 'Donner mon avis',
      reward_type TEXT NOT NULL DEFAULT 'none',
      reward_label TEXT NOT NULL DEFAULT '',
      reward_code TEXT NOT NULL DEFAULT '',
      reward_url TEXT NOT NULL DEFAULT '',
      provider_mode TEXT NOT NULL DEFAULT 'fallback',
      primary_provider TEXT NOT NULL DEFAULT 'resend',
      fallback_provider TEXT NOT NULL DEFAULT 'klaviyo',
      resend_monthly_limit INTEGER NOT NULL DEFAULT 3000,
      klaviyo_monthly_limit INTEGER NOT NULL DEFAULT 500,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE review_email_settings ADD COLUMN IF NOT EXISTS provider_mode TEXT NOT NULL DEFAULT 'fallback'`
  await sql`ALTER TABLE review_email_settings ADD COLUMN IF NOT EXISTS primary_provider TEXT NOT NULL DEFAULT 'resend'`
  await sql`ALTER TABLE review_email_settings ADD COLUMN IF NOT EXISTS fallback_provider TEXT NOT NULL DEFAULT 'klaviyo'`
  await sql`ALTER TABLE review_email_settings ADD COLUMN IF NOT EXISTS resend_monthly_limit INTEGER NOT NULL DEFAULT 3000`
  await sql`ALTER TABLE review_email_settings ADD COLUMN IF NOT EXISTS klaviyo_monthly_limit INTEGER NOT NULL DEFAULT 500`

  await sql`
    CREATE TABLE IF NOT EXISTS mail_delivery_log (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      queue_id INTEGER,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      external_id TEXT,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function ensureReviewQueueEmailColumns() {
  await sql`ALTER TABLE review_request_queue ADD COLUMN IF NOT EXISTS product_image_url TEXT`
  await sql`ALTER TABLE review_request_queue ADD COLUMN IF NOT EXISTS resend_email_id TEXT`
  await sql`ALTER TABLE review_request_queue ADD COLUMN IF NOT EXISTS error_message TEXT`
  await sql`ALTER TABLE review_request_queue ADD COLUMN IF NOT EXISTS email_provider TEXT`
}
