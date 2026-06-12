import { sql } from "@vercel/postgres"

export const defaultTrackingWidgetSettings = {
  page_path: "/pages/suivre-ma-commande",
  title: "Suivre ma commande",
  subtitle: "Entre ton numéro de commande et l’e-mail utilisé lors de l’achat.",
  button_text: "Voir le suivi",
  primary_color: "#111827",
  background_color: "#f0fffb",
  text_color: "#111827",
}

export async function ensureTrackingWidgetSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tracking_widget_settings (
      shop TEXT PRIMARY KEY,
      page_path TEXT NOT NULL DEFAULT '/pages/suivre-ma-commande',
      title TEXT NOT NULL DEFAULT 'Suivre ma commande',
      subtitle TEXT NOT NULL DEFAULT 'Entre ton numéro de commande et l''e-mail utilisé lors de l''achat.',
      button_text TEXT NOT NULL DEFAULT 'Voir le suivi',
      primary_color TEXT NOT NULL DEFAULT '#111827',
      background_color TEXT NOT NULL DEFAULT '#f0fffb',
      text_color TEXT NOT NULL DEFAULT '#111827',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}
