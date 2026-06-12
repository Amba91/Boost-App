import { sql } from "@vercel/postgres"

export const defaultTrackingWidgetSettings = {
  page_path: "/pages/suivre-ma-commande",
  title: "Suivre ma commande",
  subtitle: "Entre ton numéro de commande et l’e-mail utilisé lors de l’achat.",
  button_text: "Voir le suivi",
  primary_color: "#111827",
  background_color: "#f0fffb",
  text_color: "#111827",
  confirmed_message: "Merci, ta commande est bien confirmée et se prépare avec soin.",
  shipped_message: "Bonne nouvelle, ton colis a quitté notre entrepôt et se dirige vers toi.",
  in_transit_message: "Ton colis est en route. Il poursuit son trajet vers ton adresse.",
  delivered_message: "Ta commande a été livrée. Nous espérons qu’elle te plaît !",
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
      confirmed_message TEXT NOT NULL DEFAULT 'Merci, ta commande est bien confirmée et se prépare avec soin.',
      shipped_message TEXT NOT NULL DEFAULT 'Bonne nouvelle, ton colis a quitté notre entrepôt et se dirige vers toi.',
      in_transit_message TEXT NOT NULL DEFAULT 'Ton colis est en route. Il poursuit son trajet vers ton adresse.',
      delivered_message TEXT NOT NULL DEFAULT 'Ta commande a été livrée. Nous espérons qu''elle te plaît !',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE tracking_widget_settings ADD COLUMN IF NOT EXISTS confirmed_message TEXT NOT NULL DEFAULT 'Merci, ta commande est bien confirmée et se prépare avec soin.'`
  await sql`ALTER TABLE tracking_widget_settings ADD COLUMN IF NOT EXISTS shipped_message TEXT NOT NULL DEFAULT 'Bonne nouvelle, ton colis a quitté notre entrepôt et se dirige vers toi.'`
  await sql`ALTER TABLE tracking_widget_settings ADD COLUMN IF NOT EXISTS in_transit_message TEXT NOT NULL DEFAULT 'Ton colis est en route. Il poursuit son trajet vers ton adresse.'`
  await sql`ALTER TABLE tracking_widget_settings ADD COLUMN IF NOT EXISTS delivered_message TEXT NOT NULL DEFAULT 'Ta commande a été livrée. Nous espérons qu''elle te plaît !'`
}
