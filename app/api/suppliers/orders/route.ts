import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import {
  createSupplierOrdersFromShopifyOrder,
  ensureSupplierOrderTables,
} from "../../../../lib/supplier-orders"

const SHOP = "hy4nf1-dt.myshopify.com"

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength)
}

function replaceMessageVariables(message: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value || ""),
    message
  )
}

async function ensureSupplierManagementTables() {
  await ensureSupplierOrderTables()

  await sql`
    CREATE TABLE IF NOT EXISTS supplier_mappings (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      product_db_id INTEGER,
      shopify_product_id TEXT,
      product_handle TEXT NOT NULL,
      product_title TEXT NOT NULL,
      supplier_product_id INTEGER,
      supplier_name TEXT NOT NULL DEFAULT 'AliExpress',
      supplier_url TEXT NOT NULL,
      mapping_type TEXT NOT NULL DEFAULT 'standard',
      variant_label TEXT NOT NULL DEFAULT '',
      country_scope TEXT NOT NULL DEFAULT 'France / Europe',
      supplier_message TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      priority INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function GET() {
  try {
    await ensureSupplierManagementTables()

    const orders = await sql`
      SELECT *
      FROM supplier_orders
      WHERE shop = ${SHOP}
      ORDER BY
        CASE
          WHEN status = 'needs_mapping' THEN 0
          WHEN status = 'pending' THEN 1
          WHEN status = 'ordered' THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 120
    `

    return NextResponse.json({
      success: true,
      orders: orders.rows,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        orders: [],
        error: String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    await ensureSupplierManagementTables()

    const connection = await sql`
      SELECT shop, access_token
      FROM shop_connections
      WHERE shop = ${SHOP}
      ORDER BY updated_at DESC
      LIMIT 1
    `

    const token = connection.rows[0]?.access_token
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Shopify n'est pas connecté." },
        { status: 401 }
      )
    }

    const response = await fetch(
      `https://${SHOP}/admin/api/2026-04/orders.json?status=any&limit=25&fields=id,name,email,contact_email,currency,order_status_url,customer,shipping_address,line_items,created_at`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    )

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.errors || "Lecture Shopify impossible." },
        { status: 500 }
      )
    }

    let prepared = 0
    for (const order of data.orders || []) {
      prepared += await createSupplierOrdersFromShopifyOrder(SHOP, order)
    }

    return NextResponse.json({
      success: true,
      prepared,
      orders_read: Array.isArray(data.orders) ? data.orders.length : 0,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureSupplierManagementTables()
    const body = await request.json()
    const id = Number(body.id || 0)
    const status = cleanText(body.status, 40)
    const action = cleanText(body.action, 40)
    const note = cleanText(body.internal_note, 600)

    if (action === "assign_mapping") {
      const mappingId = Number(body.mapping_id || 0)
      if (!id || !mappingId) {
        return NextResponse.json(
          { success: false, error: "Choisis une commande et un fournisseur." },
          { status: 400 }
        )
      }

      const orderResult = await sql`
        SELECT *
        FROM supplier_orders
        WHERE id = ${id} AND shop = ${SHOP}
        LIMIT 1
      `
      const order = orderResult.rows[0]
      if (!order) {
        return NextResponse.json(
          { success: false, error: "Commande fournisseur introuvable." },
          { status: 404 }
        )
      }

      const mappingResult = await sql`
        SELECT
          sm.*,
          svm.supplier_variant_label,
          svm.supplier_color,
          svm.supplier_size,
          svm.supplier_shape,
          svm.supplier_sku,
          svm.supplier_price,
          svm.supplier_image_url
        FROM supplier_mappings sm
        LEFT JOIN supplier_variant_mappings svm
          ON svm.supplier_mapping_id = sm.id
         AND svm.shopify_variant_id = ${order.shopify_variant_id}
         AND svm.status = 'active'
        WHERE sm.id = ${mappingId}
          AND sm.shop = ${SHOP}
          AND sm.status = 'active'
        LIMIT 1
      `
      const mapping = mappingResult.rows[0]
      if (!mapping) {
        return NextResponse.json(
          { success: false, error: "Fournisseur actif introuvable." },
          { status: 404 }
        )
      }

      const message = replaceMessageVariables(mapping.supplier_message || order.supplier_message || "", {
        boutique: "Kiidiiz",
        commande: order.order_name,
        client: order.customer_name,
        produit: order.product_title,
        variante: mapping.supplier_variant_label || order.shopify_variant_title,
      })

      const result = await sql`
        UPDATE supplier_orders
        SET supplier_mapping_id = ${mapping.id},
            supplier_product_id = ${mapping.supplier_product_id},
            supplier_name = ${mapping.supplier_name},
            supplier_url = ${mapping.supplier_url},
            supplier_variant_label = ${mapping.supplier_variant_label || mapping.variant_label || ""},
            supplier_color = ${mapping.supplier_color || ""},
            supplier_size = ${mapping.supplier_size || ""},
            supplier_shape = ${mapping.supplier_shape || ""},
            supplier_sku = ${mapping.supplier_sku || ""},
            supplier_price = ${mapping.supplier_price || ""},
            supplier_message = ${message},
            status = 'pending',
            internal_note = '',
            updated_at = NOW()
        WHERE id = ${id} AND shop = ${SHOP}
        RETURNING *
      `

      return NextResponse.json({
        success: true,
        order: result.rows[0] || null,
      })
    }

    const allowed = ["pending", "needs_mapping", "ordered", "cancelled"]
    if (!id || !allowed.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Action commande invalide." },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE supplier_orders
      SET status = ${status},
          internal_note = ${note},
          updated_at = NOW()
      WHERE id = ${id} AND shop = ${SHOP}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      order: result.rows[0] || null,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
