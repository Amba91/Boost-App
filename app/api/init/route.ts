import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS widgets (
        id SERIAL PRIMARY KEY,
        shop TEXT NOT NULL,
        widget TEXT NOT NULL,
        active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        shop TEXT NOT NULL,
        product_handle TEXT NOT NULL,
        customer_first_name TEXT,
        customer_last_name TEXT,
        rating INTEGER DEFAULT 5,
        review TEXT,
        image_url TEXT,
        video_url TEXT,
        verified BOOLEAN DEFAULT true,
        verified_parent BOOLEAN DEFAULT true,
        verified_purchase BOOLEAN DEFAULT true,
        visible BOOLEAN DEFAULT true,
        merchant_reply TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        shop TEXT NOT NULL,
        shopify_product_id TEXT,
        title TEXT NOT NULL,
        handle TEXT NOT NULL,
        image_url TEXT,
        price TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS products_shopify_product_id_unique
      ON products (shopify_product_id)
    `

    await sql`
      CREATE TABLE IF NOT EXISTS shop_connections (
        id SERIAL PRIMARY KEY,
        shop TEXT NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS review_import_jobs (
        id SERIAL PRIMARY KEY,
        product_handle TEXT NOT NULL,
        source_url TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        imported_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Database initialized",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}