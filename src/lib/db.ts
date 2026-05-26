import { sql } from "@vercel/postgres"

export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS widget_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      shop TEXT NOT NULL,
      widget TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true
    );
  `
}