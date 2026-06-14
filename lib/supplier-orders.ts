import { sql } from "@vercel/postgres"

const DEFAULT_SUPPLIER_MESSAGE =
  "ALIEXPRESS STANDARD SHIPPING\n\n***VERY IMPORTANT***\nPLEASE DO NOT JOIN ANY INVOICE, PRICE TAG & PROMOTIONS IN THE PACKET!\nTHIS IS A DROPSHIP FOR A CUSTOMER.\nTHANK YOU VERY MUCH.\n\nPS : PLEASE PUT « Kiidiiz » AS SENDER\n\nTHANKS MY FRIENDS."

type ShopifyLineItem = {
  id?: number | string
  product_id?: number | string
  variant_id?: number | string
  title?: string
  name?: string
  variant_title?: string
  quantity?: number
  price?: string
  sku?: string
}

type ShopifyOrderPayload = {
  id?: number | string
  name?: string
  email?: string
  contact_email?: string
  currency?: string
  order_status_url?: string
  shipping_address?: Record<string, any> | null
  customer?: Record<string, any> | null
  line_items?: ShopifyLineItem[]
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength)
}

function cleanJson(value: unknown) {
  try {
    return JSON.stringify(value || {})
  } catch {
    return "{}"
  }
}

function customerName(order: ShopifyOrderPayload) {
  const shipping = order.shipping_address || {}
  const customer = order.customer || {}

  return cleanText(
    [shipping.first_name || customer.first_name, shipping.last_name || customer.last_name]
      .filter(Boolean)
      .join(" "),
    180
  )
}

function customerEmail(order: ShopifyOrderPayload) {
  return cleanText(order.email || order.contact_email || order.customer?.email, 180)
}

function shippingAddress(order: ShopifyOrderPayload) {
  return order.shipping_address || {}
}

function replaceMessageVariables(message: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value || ""),
    message
  )
}

export async function ensureSupplierOrderTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS supplier_orders (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_name TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      customer_name TEXT NOT NULL DEFAULT '',
      shipping_address JSONB NOT NULL DEFAULT '{}',
      product_db_id INTEGER,
      shopify_product_id TEXT NOT NULL DEFAULT '',
      product_title TEXT NOT NULL DEFAULT '',
      product_handle TEXT NOT NULL DEFAULT '',
      shopify_variant_id TEXT NOT NULL DEFAULT '',
      shopify_variant_title TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      supplier_mapping_id INTEGER,
      supplier_product_id INTEGER,
      supplier_name TEXT NOT NULL DEFAULT '',
      supplier_url TEXT NOT NULL DEFAULT '',
      supplier_variant_label TEXT NOT NULL DEFAULT '',
      supplier_color TEXT NOT NULL DEFAULT '',
      supplier_size TEXT NOT NULL DEFAULT '',
      supplier_shape TEXT NOT NULL DEFAULT '',
      supplier_sku TEXT NOT NULL DEFAULT '',
      supplier_price TEXT NOT NULL DEFAULT '',
      supplier_message TEXT NOT NULL DEFAULT '',
      order_payload JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      internal_note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS supplier_orders_unique_line_idx
    ON supplier_orders (shop, order_id, shopify_variant_id)
  `
}

export async function createSupplierOrdersFromShopifyOrder(
  shop: string,
  order: ShopifyOrderPayload
) {
  await ensureSupplierOrderTables()

  const orderId = cleanText(order.id, 120)
  const orderName = cleanText(order.name, 80)
  const items = Array.isArray(order.line_items) ? order.line_items : []
  let created = 0

  for (const item of items) {
    const numericVariantId = cleanText(item.variant_id, 120)
    const numericProductId = cleanText(item.product_id, 120)
    const quantity = Math.max(1, Number(item.quantity || 1))

    const variantResult = await sql`
      SELECT *
      FROM product_variants
      WHERE shop = ${shop}
        AND (
          shopify_variant_id = ${numericVariantId}
          OR shopify_variant_id = ${`gid://shopify/ProductVariant/${numericVariantId}`}
        )
      LIMIT 1
    `

    const productResult = await sql`
      SELECT *
      FROM products
      WHERE shop = ${shop}
        AND (
          shopify_product_id = ${numericProductId}
          OR shopify_product_id = ${`gid://shopify/Product/${numericProductId}`}
        )
      LIMIT 1
    `

    const variant = variantResult.rows[0]
    const product = productResult.rows[0]
    const productDbId = variant?.product_db_id || product?.id || null

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
       AND (
          svm.shopify_variant_id = ${numericVariantId}
          OR svm.shopify_variant_id = ${`gid://shopify/ProductVariant/${numericVariantId}`}
        )
       AND svm.status = 'active'
      WHERE sm.shop = ${shop}
        AND sm.status = 'active'
        AND (
          sm.product_db_id = ${productDbId}
          OR sm.shopify_product_id = ${variant?.shopify_product_id || product?.shopify_product_id || ""}
        )
      ORDER BY
        CASE WHEN sm.mapping_type = 'standard' THEN 0 ELSE 1 END,
        sm.priority ASC,
        sm.updated_at DESC
      LIMIT 1
    `

    const mapping = mappingResult.rows[0]
    const rawMessage = cleanText(mapping?.supplier_message, 1800) || DEFAULT_SUPPLIER_MESSAGE
    const message = replaceMessageVariables(rawMessage, {
      boutique: "Kiidiiz",
      commande: orderName,
      client: customerName(order),
      produit: cleanText(product?.title || item.title || item.name, 180),
      variante: cleanText(
        mapping?.supplier_variant_label || variant?.variant_title || item.variant_title,
        180
      ),
    })

    await sql`
      INSERT INTO supplier_orders (
        shop,
        order_id,
        order_name,
        customer_email,
        customer_name,
        shipping_address,
        product_db_id,
        shopify_product_id,
        product_title,
        product_handle,
        shopify_variant_id,
        shopify_variant_title,
        quantity,
        supplier_mapping_id,
        supplier_product_id,
        supplier_name,
        supplier_url,
        supplier_variant_label,
        supplier_color,
        supplier_size,
        supplier_shape,
        supplier_sku,
        supplier_price,
        supplier_message,
        order_payload,
        status,
        internal_note,
        updated_at
      )
      VALUES (
        ${shop},
        ${orderId},
        ${orderName},
        ${customerEmail(order)},
        ${customerName(order)},
        ${cleanJson(shippingAddress(order))}::jsonb,
        ${productDbId},
        ${variant?.shopify_product_id || product?.shopify_product_id || numericProductId},
        ${product?.title || variant?.product_title || cleanText(item.title || item.name, 240)},
        ${product?.handle || variant?.product_handle || ""},
        ${variant?.shopify_variant_id || numericVariantId},
        ${variant?.variant_title || cleanText(item.variant_title, 180)},
        ${quantity},
        ${mapping?.id || null},
        ${mapping?.supplier_product_id || null},
        ${mapping?.supplier_name || ""},
        ${mapping?.supplier_url || ""},
        ${mapping?.supplier_variant_label || ""},
        ${mapping?.supplier_color || ""},
        ${mapping?.supplier_size || ""},
        ${mapping?.supplier_shape || ""},
        ${mapping?.supplier_sku || ""},
        ${mapping?.supplier_price || ""},
        ${message},
        ${cleanJson(item)}::jsonb,
        ${mapping ? "pending" : "needs_mapping"},
        ${mapping ? "" : "Aucun mapping fournisseur trouvé pour cette variante."},
        NOW()
      )
      ON CONFLICT (shop, order_id, shopify_variant_id)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        supplier_mapping_id = EXCLUDED.supplier_mapping_id,
        supplier_product_id = EXCLUDED.supplier_product_id,
        supplier_name = EXCLUDED.supplier_name,
        supplier_url = EXCLUDED.supplier_url,
        supplier_variant_label = EXCLUDED.supplier_variant_label,
        supplier_color = EXCLUDED.supplier_color,
        supplier_size = EXCLUDED.supplier_size,
        supplier_shape = EXCLUDED.supplier_shape,
        supplier_sku = EXCLUDED.supplier_sku,
        supplier_price = EXCLUDED.supplier_price,
        supplier_message = EXCLUDED.supplier_message,
        status = CASE
          WHEN supplier_orders.status IN ('ordered', 'cancelled') THEN supplier_orders.status
          ELSE EXCLUDED.status
        END,
        internal_note = EXCLUDED.internal_note,
        updated_at = NOW()
    `

    created += 1
  }

  return created
}
