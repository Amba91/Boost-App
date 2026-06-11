import { sql } from "@vercel/postgres"

export const defaultReviewWidgetSettings = {
  title: "Avis de nos clients",
  background_color: "#f0fffb",
  star_color: "#f59e0b",
  text_color: "#111827",
  photo_size: 104,
  max_reviews: 50,
  show_arrows: true,
}

export async function ensureReviewWidgetSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS review_widget_settings (
      shop TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Avis de nos clients',
      background_color TEXT NOT NULL DEFAULT '#f0fffb',
      star_color TEXT NOT NULL DEFAULT '#f59e0b',
      text_color TEXT NOT NULL DEFAULT '#111827',
      photo_size INTEGER NOT NULL DEFAULT 104,
      max_reviews INTEGER NOT NULL DEFAULT 50,
      show_arrows BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}
