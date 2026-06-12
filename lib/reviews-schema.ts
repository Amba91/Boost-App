import { sql } from "@vercel/postgres"

export async function ensureReviewPriorityColumn() {
  await sql`
    ALTER TABLE product_reviews
    ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false
  `

  await sql`
    ALTER TABLE product_reviews
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  `
}
