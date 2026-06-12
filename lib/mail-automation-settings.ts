import { sql } from "@vercel/postgres"

export type MailAutomationScenario =
  | "review_request"
  | "order_confirmation"
  | "abandoned_cart"
  | "post_purchase_upsell"
  | "winback"

export const defaultMailAutomations = [
  {
    scenario: "review_request",
    title: "Demande d’avis après livraison",
    description: "Demande un avis quand Shopify confirme que le colis est livré.",
    trigger_label: "Après statut livré",
    active: true,
    delay_minutes: 4320,
    subject: "{prenom}, que penses-tu de {produit} ?",
    heading: "Ton avis compte beaucoup pour nous",
    message:
      "Bonjour {prenom}, nous espérons que {produit} te plaît. Partage ton expérience pour aider d’autres familles à faire leur choix.",
    button_text: "Donner mon avis",
    reward_type: "none",
    reward_label: "",
    reward_code: "",
    reward_url: "",
  },
  {
    scenario: "order_confirmation",
    title: "Confirmation rassurante de commande",
    description: "Envoie un message chaleureux juste après l’achat, avec un récapitulatif personnalisé.",
    trigger_label: "Après commande créée",
    active: false,
    delay_minutes: 5,
    subject: "{prenom}, ta commande {commande} est bien confirmée",
    heading: "Merci pour ta confiance",
    message:
      "Bonjour {prenom}, ta commande {commande} est bien enregistrée. Nous préparons {produit} avec soin et tu recevras le suivi dès l’expédition.",
    button_text: "Voir ma commande",
    reward_type: "none",
    reward_label: "",
    reward_code: "",
    reward_url: "",
  },
  {
    scenario: "abandoned_cart",
    title: "Panier abandonné",
    description: "Relance les visiteurs qui ont commencé un panier sans finaliser leur achat.",
    trigger_label: "Panier non payé",
    active: false,
    delay_minutes: 60,
    subject: "{prenom}, ton panier t’attend encore",
    heading: "Tu avais repéré quelque chose",
    message:
      "Bonjour {prenom}, ton panier est toujours disponible. Reviens finaliser ta commande avant que le produit ne soit plus en stock.",
    button_text: "Reprendre mon panier",
    reward_type: "discount",
    reward_label: "Un petit avantage pour finaliser ta commande",
    reward_code: "",
    reward_url: "",
  },
  {
    scenario: "post_purchase_upsell",
    title: "Upsell après achat",
    description: "Propose un produit complémentaire au bon moment pour augmenter le panier moyen.",
    trigger_label: "Après achat",
    active: false,
    delay_minutes: 120,
    subject: "{prenom}, complète ton achat avec cette idée",
    heading: "Une sélection qui va bien avec {produit}",
    message:
      "Nous avons préparé une recommandation utile pour compléter {produit}. Elle peut rendre l’expérience encore plus complète.",
    button_text: "Découvrir la sélection",
    reward_type: "discount",
    reward_label: "Offre spéciale client",
    reward_code: "",
    reward_url: "",
  },
  {
    scenario: "winback",
    title: "Relance client inactif",
    description: "Réactive les anciens clients avec une offre ou une nouveauté adaptée.",
    trigger_label: "Client inactif",
    active: false,
    delay_minutes: 43200,
    subject: "{prenom}, une nouveauté pourrait te plaire",
    heading: "On a pensé à toi",
    message:
      "Bonjour {prenom}, voici une sélection pensée pour toi à partir de tes précédents achats.",
    button_text: "Voir les nouveautés",
    reward_type: "discount",
    reward_label: "Offre de retour",
    reward_code: "",
    reward_url: "",
  },
] as const

export async function ensureMailAutomationTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS mail_automation_settings (
      shop TEXT NOT NULL,
      scenario TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      trigger_label TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT false,
      delay_minutes INTEGER NOT NULL DEFAULT 0,
      subject TEXT NOT NULL DEFAULT '',
      heading TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      button_text TEXT NOT NULL DEFAULT '',
      reward_type TEXT NOT NULL DEFAULT 'none',
      reward_label TEXT NOT NULL DEFAULT '',
      reward_code TEXT NOT NULL DEFAULT '',
      reward_url TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (shop, scenario)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS mail_automation_queue (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      scenario TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_first_name TEXT,
      order_id TEXT,
      order_name TEXT,
      product_handle TEXT,
      product_title TEXT,
      product_image_url TEXT,
      action_url TEXT,
      subtotal_amount TEXT,
      currency TEXT,
      scheduled_for TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      sent_at TIMESTAMP,
      external_id TEXT,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS mail_automation_queue_order_scenario_idx
    ON mail_automation_queue (shop, scenario, order_id)
    WHERE order_id IS NOT NULL AND order_id <> ''
  `
}

export async function seedDefaultMailAutomations(shop: string) {
  await ensureMailAutomationTables()

  for (const item of defaultMailAutomations) {
    await sql`
      INSERT INTO mail_automation_settings (
        shop, scenario, title, description, trigger_label, active,
        delay_minutes, subject, heading, message, button_text,
        reward_type, reward_label, reward_code, reward_url, updated_at
      ) VALUES (
        ${shop}, ${item.scenario}, ${item.title}, ${item.description},
        ${item.trigger_label}, ${item.active}, ${item.delay_minutes},
        ${item.subject}, ${item.heading}, ${item.message}, ${item.button_text},
        ${item.reward_type}, ${item.reward_label}, ${item.reward_code},
        ${item.reward_url}, NOW()
      )
      ON CONFLICT (shop, scenario) DO NOTHING
    `
  }
}
