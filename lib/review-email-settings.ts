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
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function ensureReviewQueueEmailColumns() {
  await sql`ALTER TABLE review_request_queue ADD COLUMN IF NOT EXISTS product_image_url TEXT`
  await sql`ALTER TABLE review_request_queue ADD COLUMN IF NOT EXISTS resend_email_id TEXT`
  await sql`ALTER TABLE review_request_queue ADD COLUMN IF NOT EXISTS error_message TEXT`
}
