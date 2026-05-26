import { sql } from "@vercel/postgres"

export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS widgets (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      widget TEXT NOT NULL,
      active BOOLEAN DEFAULT false
    )
  `
}