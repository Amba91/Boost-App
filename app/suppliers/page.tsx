"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type ShopifyProduct = {
  id: number
  shopify_product_id: string
  title: string
  handle: string
  image_url?: string
  price?: string
  status?: string
}

type SupplierProduct = {
  id: number
  source: string
  source_url: string
  title: string
  supplier_name: string
  status: string
}

type ShopifyVariant = {
  id: number
  product_db_id: number
  shopify_variant_id: string
  variant_title: string
  sku?: string
  selected_options?: { name?: string; value?: string }[] | string
  image_url?: string
  price?: string
}

type SupplierMapping = {
  id: number
  product_db_id?: number
  product_title: string
  product_handle: string
  supplier_name: string
  supplier_url: string
  mapping_type: string
  variant_label: string
  country_scope: string
  supplier_message: string
  status: string
}

type VariantMapping = {
  id: number
  supplier_mapping_id: number
  product_db_id: number
  shopify_variant_id: string
  shopify_variant_title: string
  supplier_variant_label: string
  supplier_color: string
  supplier_size: string
  supplier_shape: string
  supplier_sku: string
  supplier_price: string
}

type SupplierOrder = {
  id: number
  order_name: string
  customer_email: string
  customer_name: string
  shipping_address?: Record<string, any> | string
  product_db_id?: number
  product_title: string
  product_handle: string
  shopify_variant_title: string
  quantity: number
  supplier_name: string
  supplier_url: string
  supplier_variant_label: string
  supplier_color: string
  supplier_size: string
  supplier_shape: string
  supplier_sku: string
  supplier_price: string
  supplier_message: string
  status: string
  internal_note: string
  created_at: string
}

type SupplierVariantDraft = {
  supplier_variant_label: string
  supplier_color: string
  supplier_size: string
  supplier_shape: string
  supplier_sku: string
  supplier_price: string
  supplier_image_url: string
  supplier_note: string
}

type SupplierVariantOption = SupplierVariantDraft & {
  id: string
}

type SupplierVariantSource = "none" | "aliexpress" | "shopify_fallback" | "manual"

const mappingLabels: Record<string, string> = {
  standard: "Produit simple",
  backup: "Fournisseur de secours",
  bogo: "BOGO / 2e offert",
  bundle: "Bundle / Pack",
}

const defaultSupplierMessage =
  "ALIEXPRESS STANDARD SHIPPING\n\n***VERY IMPORTANT***\nPLEASE DO NOT JOIN ANY INVOICE, PRICE TAG & PROMOTIONS IN THE PACKET!\nTHIS IS A DROPSHIP FOR A CUSTOMER.\nTHANK YOU VERY MUCH.\n\nPS : PLEASE PUT « Kiidiiz » AS SENDER\n\nTHANKS MY FRIENDS."

export default function SuppliersPage() {
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([])
  const [shopifyVariants, setShopifyVariants] = useState<ShopifyVariant[]>([])
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([])
  const [mappings, setMappings] = useState<SupplierMapping[]>([])
  const [savedVariantMappings, setSavedVariantMappings] = useState<VariantMapping[]>([])
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [supplierUrl, setSupplierUrl] = useState("")
  const [supplierTitle, setSupplierTitle] = useState("")
  const [supplierName, setSupplierName] = useState("AliExpress")
  const [mappingType, setMappingType] = useState("standard")
  const [variantLabel, setVariantLabel] = useState("")
  const [countryScope, setCountryScope] = useState("France / Europe")
  const [notes, setNotes] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncingOrders, setSyncingOrders] = useState(false)
  const [orderMappingSelections, setOrderMappingSelections] = useState<Record<number, string>>({})
  const [supplierPreviewBlocked, setSupplierPreviewBlocked] = useState(false)
  const [supplierConnectorNote, setSupplierConnectorNote] = useState("")
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false)
  const [supplierVariantSource, setSupplierVariantSource] = useState<SupplierVariantSource>("none")
  const [supplierVariantDrafts, setSupplierVariantDrafts] = useState<Record<string, SupplierVariantDraft>>({})
  const [supplierVariants, setSupplierVariants] = useState<SupplierVariantOption[]>([])
  const [supplierMessageText, setSupplierMessageText] = useState(defaultSupplierMessage)

  const selectedProduct = useMemo(
    () => shopifyProducts.find((product) => String(product.id) === selectedProductId),
    [selectedProductId, shopifyProducts]
  )

  const supplierPreviewMessage = supplierMessageText

  const selectedVariants = useMemo(
    () => shopifyVariants.filter((variant) => String(variant.product_db_id) === selectedProductId),
    [selectedProductId, shopifyVariants]
  )

  const mappedVariantCount = savedVariantMappings.filter(
    (mapping) => String(mapping.product_db_id) === selectedProductId
  ).length

  const readyVariantCount = selectedVariants.filter((variant, index) => {
    const draft = supplierVariantDrafts[variant.shopify_variant_id] || supplierVariants[index]
    return Boolean(draft?.supplier_variant_label || draft?.supplier_color || draft?.supplier_sku)
  }).length

  const pendingSupplierOrders = supplierOrders.filter((order) =>
    ["pending", "needs_mapping"].includes(order.status)
  )

  function parseAddress(address: SupplierOrder["shipping_address"]) {
    if (!address) return {}
    if (typeof address === "object") return address
    try {
      const parsed = JSON.parse(address)
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  }

  function formatAddress(order: SupplierOrder) {
    const address = parseAddress(order.shipping_address)
    return [
      [address.first_name, address.last_name].filter(Boolean).join(" ") || order.customer_name,
      address.address1,
      address.address2,
      [address.zip, address.city].filter(Boolean).join(" "),
      address.province,
      address.country,
      address.phone ? `Tel : ${address.phone}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  }

  function mappingsForOrder(order: SupplierOrder) {
    const exact = mappings.filter(
      (mapping) =>
        String(mapping.product_db_id || "") === String(order.product_db_id || "") ||
        mapping.product_handle === order.product_handle
    )

    return exact.length > 0 ? exact : mappings
  }

  function optionsLabel(variant: ShopifyVariant) {
    const rawOptions = variant.selected_options
    let options: { name?: string; value?: string }[] = []
    if (Array.isArray(rawOptions)) options = rawOptions
    if (typeof rawOptions === "string") {
      try {
        const parsed = JSON.parse(rawOptions)
        if (Array.isArray(parsed)) options = parsed
      } catch {
        options = []
      }
    }

    const label = options
      .map((option) => `${option.name}: ${option.value}`)
      .join(" · ")

    return label || variant.variant_title || "Variante par défaut"
  }

  function updateSupplierVariantDraft(variantId: string, field: keyof SupplierVariantDraft, value: string) {
    const emptyDraft: SupplierVariantDraft = {
      supplier_variant_label: "",
      supplier_color: "",
      supplier_size: "",
      supplier_shape: "",
      supplier_sku: "",
      supplier_price: "",
      supplier_image_url: "",
      supplier_note: "",
    }

    setSupplierVariantDrafts((current) => ({
      ...current,
      [variantId]: {
        ...emptyDraft,
        ...(current[variantId] || {}),
        [field]: value,
      },
    }))
  }

  function updateSupplierVariantOption(id: string, field: keyof SupplierVariantDraft, value: string) {
    setSupplierVariants((current) =>
      current.map((variant) =>
        variant.id === id ? { ...variant, [field]: value } : variant
      )
    )
  }

  function addSupplierVariant() {
    setSupplierVariantSource("manual")
    setSupplierVariants((current) => [
      ...current,
      {
        id: `supplier-${Date.now()}`,
        supplier_variant_label: "",
        supplier_color: "",
        supplier_size: "",
        supplier_shape: "",
        supplier_sku: "",
        supplier_price: "",
        supplier_image_url: "",
        supplier_note: "",
      },
    ])
  }

  function applySupplierVariant(shopifyVariantId: string, supplierVariantId: string) {
    const supplierVariant = supplierVariants.find((variant) => variant.id === supplierVariantId)
    if (!supplierVariant) return

    setSupplierVariantDrafts((current) => ({
      ...current,
      [shopifyVariantId]: {
        supplier_variant_label: supplierVariant.supplier_variant_label,
        supplier_color: supplierVariant.supplier_color,
        supplier_size: supplierVariant.supplier_size,
        supplier_shape: supplierVariant.supplier_shape,
        supplier_sku: supplierVariant.supplier_sku,
        supplier_price: supplierVariant.supplier_price,
        supplier_image_url: supplierVariant.supplier_image_url,
        supplier_note: supplierVariant.supplier_note,
      },
    }))
  }

  function supplierVariantName(variant: SupplierVariantOption) {
    return (
      variant.supplier_variant_label ||
      [variant.supplier_color, variant.supplier_size, variant.supplier_shape]
        .filter(Boolean)
        .join(" / ") ||
      "Variante fournisseur"
    )
  }

  function optionValue(variant: ShopifyVariant, names: string[]) {
    const rawOptions = variant.selected_options
    let options: { name?: string; value?: string }[] = []
    if (Array.isArray(rawOptions)) options = rawOptions
    if (typeof rawOptions === "string") {
      try {
        const parsed = JSON.parse(rawOptions)
        if (Array.isArray(parsed)) options = parsed
      } catch {
        options = []
      }
    }

    const normalizedNames = names.map((name) => name.toLowerCase())
    return (
      options.find((option) =>
        normalizedNames.some((name) =>
          String(option.name || "").toLowerCase().includes(name)
        )
      )?.value || ""
    )
  }

  function supplierVariantFromShopifyVariant(variant: ShopifyVariant, index: number): SupplierVariantOption {
    const color = optionValue(variant, ["couleur", "color"])
    const size = optionValue(variant, ["taille", "size"])
    const shape = optionValue(variant, ["modèle", "modele", "model", "variant", "pack", "forme"])
    const label = [color, size, shape].filter(Boolean).join(" / ") || optionsLabel(variant)

    return {
      id: `auto-${variant.shopify_variant_id}-${index}`,
      supplier_variant_label: label,
      supplier_color: color,
      supplier_size: size,
      supplier_shape: shape,
      supplier_sku: variant.sku || "",
      supplier_price: variant.price || "",
      supplier_image_url: variant.image_url || "",
      supplier_note: "",
    }
  }

  function generateSupplierVariantsFromShopify() {
    if (selectedVariants.length === 0) {
      setMessage("Synchronise d'abord les produits Shopify pour récupérer les variantes.")
      return
    }

    setSupplierVariants(
      selectedVariants.map((variant, index) =>
        supplierVariantFromShopifyVariant(variant, index)
      )
    )
    setSupplierVariantSource("shopify_fallback")
    setMessage("Mode secours activé : variantes copiées depuis Shopify. Ce ne sont pas des variantes AliExpress réelles.")
  }

  function autoLinkSupplierVariants() {
    if (selectedVariants.length === 0) return
    if (supplierVariants.length === 0) {
      setMessage("Aucune vraie variante fournisseur à relier. Lance d'abord l'import détaillé AliExpress.")
      return
    }

    const variantsToUse =
      supplierVariants.some((variant) => supplierVariantName(variant) !== "Variante fournisseur")
        ? supplierVariants
        : supplierVariants

    const nextDrafts: Record<string, SupplierVariantDraft> = {}
    selectedVariants.forEach((variant, index) => {
      const supplierVariant = variantsToUse[index]
      if (!supplierVariant) return
      nextDrafts[variant.shopify_variant_id] = {
        supplier_variant_label: supplierVariant.supplier_variant_label,
        supplier_color: supplierVariant.supplier_color,
        supplier_size: supplierVariant.supplier_size,
        supplier_shape: supplierVariant.supplier_shape,
        supplier_sku: supplierVariant.supplier_sku,
        supplier_price: supplierVariant.supplier_price,
        supplier_image_url: supplierVariant.supplier_image_url,
        supplier_note: supplierVariant.supplier_note,
      }
    })

    setSupplierVariants(variantsToUse)
    setSupplierVariantDrafts(nextDrafts)
    setMessage(
      supplierVariantSource === "shopify_fallback"
        ? "Mode secours relié. Attention : ce sont les variantes Shopify, pas les vraies variantes AliExpress."
        : "Variantes AliExpress reliées automatiquement. Vérifie seulement les exceptions, puis enregistre."
    )
  }

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/suppliers/mappings", { cache: "no-store" })
      const data = await res.json()
      const ordersRes = await fetch("/api/suppliers/orders", { cache: "no-store" })
      const ordersData = await ordersRes.json()
      if (data.success) {
        setShopifyProducts(data.products || [])
        setShopifyVariants(data.variants || [])
        setSupplierProducts(data.supplier_products || [])
        setMappings(data.mappings || [])
        setSavedVariantMappings(data.variant_mappings || [])
        setSupplierOrders(ordersData.success ? ordersData.orders || [] : [])
        if (!selectedProductId && data.products?.[0]?.id) {
          setSelectedProductId(String(data.products[0].id))
        }
      } else {
        setMessage(data.error || "Chargement impossible.")
      }
    } catch {
      setMessage("Chargement impossible.")
    } finally {
      setLoading(false)
    }
  }

  async function syncSupplierOrders() {
    setSyncingOrders(true)
    setMessage("")
    try {
      const res = await fetch("/api/suppliers/orders", { method: "POST" })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.error || "Impossible de récupérer les commandes Shopify.")
        return
      }

      setMessage(`${data.orders_read} commande(s) Shopify lue(s), ${data.prepared} ligne(s) fournisseur préparée(s).`)
      await loadData()
    } catch {
      setMessage("Impossible de récupérer les commandes Shopify.")
    } finally {
      setSyncingOrders(false)
    }
  }

  async function updateSupplierOrder(orderId: number, status: string) {
    try {
      const res = await fetch("/api/suppliers/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      })
      const data = await res.json()
      setMessage(data.success ? "Commande fournisseur mise à jour." : data.error)
      await loadData()
    } catch {
      setMessage("Mise à jour commande fournisseur impossible.")
    }
  }

  async function assignMappingToOrder(order: SupplierOrder) {
    const mappingId = orderMappingSelections[order.id]
    if (!mappingId) {
      setMessage("Choisis d'abord le fournisseur à utiliser pour cette commande.")
      return
    }

    try {
      const res = await fetch("/api/suppliers/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          action: "assign_mapping",
          mapping_id: mappingId,
        }),
      })
      const data = await res.json()
      setMessage(data.success ? "Fournisseur relié à la commande." : data.error)
      await loadData()
    } catch {
      setMessage("Impossible de relier le fournisseur à cette commande.")
    }
  }

  async function copySupplierMessage(order: SupplierOrder) {
    const text = [
      `Commande ${order.order_name}`,
      `Client : ${order.customer_name || order.customer_email}`,
      "",
      "Adresse de livraison :",
      formatAddress(order) || "Adresse non disponible",
      "",
      `Produit : ${order.product_title}`,
      `Variante : ${order.supplier_variant_label || order.shopify_variant_title || "N/A"}`,
      `Quantité : ${order.quantity}`,
      order.supplier_sku ? `SKU fournisseur : ${order.supplier_sku}` : "",
      order.supplier_price ? `Prix fournisseur : ${order.supplier_price}` : "",
      "",
      order.supplier_message,
    ].filter(Boolean).join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setMessage("Message fournisseur copié.")
    } catch {
      setMessage("Copie impossible. Tu peux copier le message affiché.")
    }
  }

  async function updateMapping(mappingId: number, action: string, payload: Record<string, string> = {}) {
    try {
      const res = await fetch("/api/suppliers/mappings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mappingId, action, ...payload }),
      })
      const data = await res.json()
      setMessage(data.success ? "Fournisseur mis à jour." : data.error)
      await loadData()
    } catch {
      setMessage("Mise à jour fournisseur impossible.")
    }
  }

  async function deleteMapping(mappingId: number) {
    if (!confirm("Supprimer ce fournisseur et ses variantes liées ?")) return

    try {
      const res = await fetch(`/api/suppliers/mappings?id=${mappingId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      setMessage(data.success ? "Fournisseur supprimé." : data.error)
      await loadData()
    } catch {
      setMessage("Suppression fournisseur impossible.")
    }
  }

  async function syncProducts() {
    setSyncing(true)
    setMessage("")
    try {
      const res = await fetch("/api/shopify/sync-products", { method: "POST" })
      const data = await res.json()
      setMessage(data.success ? `${data.synced} produit(s) Shopify synchronisé(s).` : data.error)
      await loadData()
    } catch {
      setMessage("Synchronisation Shopify impossible.")
    } finally {
      setSyncing(false)
    }
  }

  async function previewSupplier() {
    if (!supplierUrl.trim()) {
      setMessage("Colle d'abord un lien fournisseur.")
      return
    }

    setSaving(true)
    setMessage("")
    setSupplierPreviewBlocked(false)
    setSupplierConnectorNote("")
    try {
      const res = await fetch("/api/suppliers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: supplierUrl }),
      })
      const data = await res.json()
      if (data.success) {
        setSupplierConnectorNote(String(data.connector_note || ""))
        setSupplierTitle(data.product?.title || supplierTitle)
        setSupplierName(data.product?.supplier_name || supplierName)
        if (Array.isArray(data.variants) && data.variants.length > 0) {
          setSupplierVariants(
            data.variants.map((variant: any, index: number) => ({
              id: String(variant.id || `supplier-${index}`),
              supplier_variant_label: String(variant.label || ""),
              supplier_color: String(variant.color || ""),
              supplier_size: String(variant.size || ""),
              supplier_shape: String(variant.shape || ""),
              supplier_sku: String(variant.sku || ""),
              supplier_price: String(variant.price || ""),
              supplier_image_url: String(variant.image_url || ""),
              supplier_note: "",
            }))
          )
          setSupplierVariantDrafts({})
          setSupplierVariantSource("aliexpress")
          setSupplierPreviewBlocked(false)
        } else {
          setSupplierVariants([])
          setSupplierVariantDrafts({})
          setSupplierVariantSource("none")
          setSupplierPreviewBlocked(true)
        }
        setMessage(
          data.variants?.length
            ? `${data.variants.length} vraie(s) variante(s) AliExpress récupérée(s) avec images.`
            : data.product?.image_urls?.length
              ? "Fiche fournisseur récupérée, mais aucune vraie variante AliExpress n'a été retournée."
              : "Lien enregistré, mais AliExpress n'a pas laissé Boost lire les variantes automatiquement pour ce lien."
        )
        await loadData()
      } else {
        setMessage(data.error || "Lecture fournisseur impossible.")
      }
    } catch {
      setMessage("Lecture fournisseur impossible.")
    } finally {
      setSaving(false)
    }
  }

  async function fastImportSupplier() {
    if (!selectedProductId || !supplierUrl.trim()) {
      setMessage("Choisis un produit Shopify et colle le lien fournisseur.")
      return
    }

    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/suppliers/fast-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId,
          supplier_url: supplierUrl,
          supplier_title: supplierTitle,
          supplier_name: supplierName,
          supplier_message: supplierMessageText,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.error || "Import express impossible.")
        return
      }

      const fallbackVariants = selectedVariants.map((variant, index) =>
        supplierVariantFromShopifyVariant(variant, index)
      )
      const nextDrafts: Record<string, SupplierVariantDraft> = {}
      selectedVariants.forEach((variant, index) => {
        const supplierVariant = fallbackVariants[index]
        if (!supplierVariant) return
        nextDrafts[variant.shopify_variant_id] = {
          supplier_variant_label: supplierVariant.supplier_variant_label,
          supplier_color: supplierVariant.supplier_color,
          supplier_size: supplierVariant.supplier_size,
          supplier_shape: supplierVariant.supplier_shape,
          supplier_sku: supplierVariant.supplier_sku,
          supplier_price: supplierVariant.supplier_price,
          supplier_image_url: supplierVariant.supplier_image_url,
          supplier_note: supplierVariant.supplier_note,
        }
      })
      setSupplierVariants(fallbackVariants)
      setSupplierVariantDrafts(nextDrafts)
      setSupplierVariantSource("shopify_fallback")
      setMessage(`${data.message} Attention : ces variantes viennent de Shopify, pas d'AliExpress.`)
      await loadData()
    } catch {
      setMessage("Import express impossible.")
    } finally {
      setSaving(false)
    }
  }

  async function saveMapping() {
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch("/api/suppliers/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId,
          supplier_url: supplierUrl,
          supplier_title: supplierTitle,
          supplier_name: supplierName,
          mapping_type: mappingType,
          variant_label: variantLabel,
          country_scope: countryScope,
          notes,
          supplier_message: supplierMessageText,
          variant_mappings: selectedVariants.map((variant) => ({
            shopify_variant_id: variant.shopify_variant_id,
            ...(supplierVariantDrafts[variant.shopify_variant_id] || {}),
          })),
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.error || "Mapping impossible.")
        return
      }

      setMessage("Mapping fournisseur enregistré.")
      setSupplierUrl("")
      setSupplierTitle("")
      setVariantLabel("")
      setNotes("")
      setSupplierVariantDrafts({})
      setSupplierVariants([])
      setSupplierVariantSource("none")
      await loadData()
    } catch {
      setMessage("Mapping impossible.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setSupplierVariants([])
    setSupplierVariantDrafts({})
    setSupplierVariantSource("none")
    setSupplierPreviewBlocked(false)
    setSupplierConnectorNote("")
  }, [selectedProductId])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>Retour Boost</Link>

      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Fournisseurs</span>
          <h1 style={styles.title}>Mapping AliExpress & fournisseurs</h1>
          <p style={styles.lead}>
            Associe chaque produit Shopify à un ou plusieurs fournisseurs. Boost
            pourra ensuite gérer le fournisseur principal, le secours, les
            variantes, les BOGO, les Bundles et les messages dropshipping.
          </p>
        </div>
        <img src="/logo.png" alt="Boost" style={styles.logo} />
      </div>

      <section style={styles.workflow}>
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <h2>1. Produit de ta boutique</h2>
            <span style={styles.badge}>{shopifyProducts.length} produit(s)</span>
          </div>

          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            style={styles.input}
          >
            {shopifyProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>

          {selectedProduct ? (
            <div style={styles.productMini}>
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.title} style={styles.productImage} />
              ) : (
                <div style={styles.emptyImage}>Image</div>
              )}
              <div>
                <strong>{selectedProduct.title}</strong>
                <p style={styles.muted}>{selectedProduct.handle}</p>
                <p style={styles.muted}>Prix boutique : {selectedProduct.price || "N/A"}</p>
              </div>
            </div>
          ) : (
            <p style={styles.muted}>Aucun produit synchronisé.</p>
          )}

          <button onClick={syncProducts} disabled={syncing} style={styles.secondaryButton}>
            {syncing ? "Synchronisation..." : "Synchroniser les produits Shopify"}
          </button>
        </div>

        <div style={styles.card}>
          <h2>2. Fournisseur</h2>
          <input
            style={styles.input}
            placeholder="Lien AliExpress ou fournisseur"
            value={supplierUrl}
            onChange={(event) => setSupplierUrl(event.target.value)}
          />
          <div style={styles.connectorBox}>
            <strong>Deux modes possibles</strong>
            <span>
              Import détaillé = Boost essaie de lire les vraies variantes
              AliExpress avec Oxylabs puis Apify. Import express = secours
              rapide : Boost garde le lien et prépare le mapping depuis Shopify,
              mais ce n'est pas une vraie lecture AliExpress complète.
            </span>
          </div>
          <input
            style={styles.input}
            placeholder="Nom fournisseur"
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Titre fournisseur ou note interne"
            value={supplierTitle}
            onChange={(event) => setSupplierTitle(event.target.value)}
          />
          <button onClick={fastImportSupplier} disabled={saving} style={styles.greenButton}>
            {saving ? "Import..." : "Import express + mapping automatique"}
          </button>
          <button onClick={previewSupplier} disabled={saving} style={styles.secondaryButton}>
            Import détaillé AliExpress avec vraies variantes
          </button>
        </div>

        <div style={styles.card}>
          <h2>3. Type de mapping</h2>
          <select value={mappingType} onChange={(event) => setMappingType(event.target.value)} style={styles.input}>
            <option value="standard">Produit simple</option>
            <option value="backup">Fournisseur de secours</option>
            <option value="bogo">BOGO / 2e offert</option>
            <option value="bundle">Bundle / Pack</option>
          </select>
          <input
            style={styles.input}
            placeholder="Variante concernée : Bleu, Rose, 2 pièces..."
            value={variantLabel}
            onChange={(event) => setVariantLabel(event.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Pays/région : France, Europe, Monde..."
            value={countryScope}
            onChange={(event) => setCountryScope(event.target.value)}
          />
          <textarea
            style={styles.textarea}
            placeholder="Notes internes : couleur, taille, consigne spéciale..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button onClick={saveMapping} disabled={saving} style={styles.button}>
            {saving ? "Enregistrement..." : "Enregistrer le produit fournisseur"}
          </button>
        </div>
      </section>

      {message && <p style={styles.message}>{message}</p>}

      <section style={styles.expressCard}>
        <div style={styles.sectionHeader}>
          <div>
            <span style={styles.eyebrow}>Mapping simple</span>
            <h2>
              {supplierVariantSource === "aliexpress"
                ? "Vraies variantes AliExpress récupérées"
                : supplierVariantSource === "shopify_fallback"
                  ? "Mode secours Shopify"
                  : "En attente des variantes AliExpress"}
            </h2>
            <p style={styles.muted}>
              {supplierVariantSource === "aliexpress"
                ? "Ces variantes viennent du connecteur AliExpress. Tu peux les relier à tes variantes Shopify."
                : supplierVariantSource === "shopify_fallback"
                  ? "Ces variantes viennent de Shopify. Elles servent uniquement de secours, pas d'import AliExpress réel."
                  : "Lance l'import détaillé. Boost affichera ici les variantes seulement si elles viennent réellement du fournisseur."}
            </p>
          </div>
          <span style={styles.badge}>
            {readyVariantCount}/{selectedVariants.length || 0} prête(s)
          </span>
        </div>

        {selectedVariants.length === 0 ? (
          <div style={styles.warningBox}>
            <strong>Aucune variante Shopify trouvée.</strong>
            <p>
              Clique sur “Synchroniser les produits Shopify” en haut de la
              page. Ensuite Boost pourra préparer les variantes automatiquement.
            </p>
          </div>
        ) : supplierVariantSource === "none" || supplierVariants.length === 0 ? (
          <div style={styles.warningBox}>
            <strong>Aucune vraie variante AliExpress récupérée.</strong>
            <p>
              Pour ce lien, le connecteur actuel n'a retourné aucune variante
              fournisseur. Boost ne remplace plus ça par les variantes Shopify :
              il faut connecter un fournisseur de scraping plus fiable
              comme Oxylabs, puis relancer l'import détaillé.
            </p>
            {supplierConnectorNote && <code style={styles.inlineCode}>{supplierConnectorNote}</code>}
          </div>
        ) : (
          <div style={styles.simpleMappingGrid}>
            {selectedVariants.map((variant, index) => {
              const draft =
                supplierVariantDrafts[variant.shopify_variant_id] ||
                supplierVariants[index] ||
                {
                  supplier_variant_label: "",
                  supplier_color: "",
                  supplier_size: "",
                  supplier_shape: "",
                  supplier_sku: "",
                  supplier_price: "",
                  supplier_image_url: "",
                  supplier_note: "",
                }

              return (
                <article key={variant.shopify_variant_id} style={styles.simpleMappingCard}>
                  <div style={styles.simpleMappingSide}>
                    <span style={styles.sideLabel}>Ta boutique</span>
                    <div style={styles.shopifyVariant}>
                      {variant.image_url ? (
                        <img src={variant.image_url} alt={variant.variant_title} style={styles.variantImage} />
                      ) : (
                        <div style={styles.variantImageEmpty}>Var.</div>
                      )}
                      <div>
                        <strong>{optionsLabel(variant)}</strong>
                        <p style={styles.muted}>SKU : {variant.sku || "N/A"} · Prix : {variant.price || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div style={styles.arrowBox}>→</div>

                  <div style={styles.simpleMappingSide}>
                    <span style={styles.sideLabel}>Fournisseur utilisé</span>
                    <div style={styles.linkedSupplierPreview}>
                      {draft.supplier_image_url ? (
                        <img
                          src={draft.supplier_image_url}
                          alt={draft.supplier_variant_label}
                          style={styles.linkedSupplierImage}
                        />
                      ) : (
                        <div style={styles.linkedSupplierImageEmpty}>Ali</div>
                      )}
                      <div>
                        <strong>{draft.supplier_variant_label || optionsLabel(variant)}</strong>
                        <p style={styles.muted}>
                          {supplierVariantSource === "aliexpress"
                            ? draft.supplier_sku
                              ? `SKU AliExpress : ${draft.supplier_sku}`
                              : "Variante AliExpress"
                            : draft.supplier_sku
                              ? `SKU Shopify : ${draft.supplier_sku}`
                              : "Secours Shopify"}
                        </p>
                      </div>
                    </div>

                    <select
                      style={styles.compactInput}
                      value={
                        supplierVariants.find((supplierVariant) =>
                          supplierVariantName(supplierVariant) === draft.supplier_variant_label
                        )?.id || ""
                      }
                      onChange={(event) =>
                        applySupplierVariant(variant.shopify_variant_id, event.target.value)
                      }
                    >
                      <option value="">Changer la variante fournisseur</option>
                      {supplierVariants.map((supplierVariant) => (
                        <option key={supplierVariant.id} value={supplierVariant.id}>
                          {supplierVariantName(supplierVariant)}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div style={styles.actionRow}>
          {supplierVariantSource !== "none" && supplierVariants.length > 0 && (
            <button onClick={autoLinkSupplierVariants} style={styles.greenSmallButton}>
              Refaire le lien automatique
            </button>
          )}
          <button onClick={() => setShowAdvancedMapping((value) => !value)} style={styles.smallButton}>
            {showAdvancedMapping ? "Masquer les réglages avancés" : "Afficher les réglages avancés"}
          </button>
        </div>

        {supplierVariantSource !== "none" && supplierVariants.length > 0 && (
          <button onClick={saveMapping} disabled={saving} style={styles.button}>
            {saving ? "Enregistrement..." : "Valider ce mapping fournisseur"}
          </button>
        )}
      </section>

      {showAdvancedMapping && (
        <>
      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <div>
            <h2>Commandes fournisseur à traiter</h2>
            <p style={styles.muted}>
              Quand une commande Shopify arrive, Boost prépare ici ce qu’il faut
              commander chez le fournisseur : produit, variante, quantité et
              message dropshipping à envoyer.
            </p>
          </div>
          <div style={styles.actionRow}>
            <span style={styles.badge}>{pendingSupplierOrders.length} à traiter</span>
            <button onClick={syncSupplierOrders} disabled={syncingOrders} style={styles.smallButton}>
              {syncingOrders ? "Lecture..." : "Récupérer les dernières commandes"}
            </button>
          </div>
        </div>

        {supplierOrders.length === 0 ? (
          <div style={styles.helpBox}>
            <strong>Aucune commande fournisseur pour le moment.</strong>
            <span>
              Dès qu’une commande Shopify arrive, elle apparaîtra ici. Tu peux
              aussi cliquer sur “Récupérer les dernières commandes”.
            </span>
          </div>
        ) : (
          <div style={styles.orderGrid}>
            {supplierOrders.map((order) => (
              <article key={order.id} style={styles.orderCard}>
                <div>
                  <span style={order.status === "needs_mapping" ? styles.orangeBadge : styles.statusBadge}>
                    {order.status === "needs_mapping"
                      ? "Mapping manquant"
                      : order.status === "ordered"
                        ? "Commandée"
                        : order.status === "cancelled"
                          ? "Annulée"
                          : "À commander"}
                  </span>
                  <h3>{order.order_name || "Commande Shopify"}</h3>
                  <p style={styles.muted}>{order.customer_name || order.customer_email}</p>
                  <pre style={styles.addressBox}>{formatAddress(order) || "Adresse non disponible"}</pre>
                </div>

                <div>
                  <strong>{order.product_title}</strong>
                  <p style={styles.muted}>
                    Variante : {order.supplier_variant_label || order.shopify_variant_title || "N/A"}
                  </p>
                  <p style={styles.muted}>Quantité : {order.quantity}</p>
                </div>

                <div>
                  <strong>{order.supplier_name || "Fournisseur à choisir"}</strong>
                  <p style={styles.muted}>
                    SKU : {order.supplier_sku || "N/A"} · Prix : {order.supplier_price || "N/A"}
                  </p>
                  {order.supplier_url ? (
                    <a href={order.supplier_url} target="_blank" style={styles.link}>
                      Ouvrir le fournisseur
                    </a>
                  ) : (
                    <p style={styles.muted}>Aucun fournisseur lié.</p>
                  )}
                  {order.status === "needs_mapping" && (
                    <div style={styles.mappingSelectBox}>
                      <select
                        style={styles.compactInput}
                        value={orderMappingSelections[order.id] || ""}
                        onChange={(event) =>
                          setOrderMappingSelections((current) => ({
                            ...current,
                            [order.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Choisir un fournisseur existant</option>
                        {mappingsForOrder(order).map((mapping) => (
                          <option key={mapping.id} value={mapping.id}>
                            {mapping.product_title} · {mapping.supplier_name} · {mapping.variant_label || "Toutes variantes"}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => assignMappingToOrder(order)} style={styles.greenSmallButton}>
                        Relier
                      </button>
                    </div>
                  )}
                </div>

                <pre style={styles.smallMessage}>{order.supplier_message || order.internal_note}</pre>

                <div style={styles.actionRow}>
                  <button onClick={() => copySupplierMessage(order)} style={styles.smallButton}>
                    Copier message
                  </button>
                  <button onClick={() => updateSupplierOrder(order.id, "ordered")} style={styles.greenSmallButton}>
                    Marquer commandée
                  </button>
                  <button onClick={() => updateSupplierOrder(order.id, "cancelled")} style={styles.dangerSmallButton}>
                    Annuler
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <div>
            <h2>Variantes fournisseur</h2>
            <p style={styles.muted}>
              Colle le lien AliExpress puis clique sur “Tester / enregistrer le
              lien”. Si AliExpress laisse lire la fiche, Boost affiche ici les
              variantes réelles avec leurs photos. Ensuite tu relies simplement
              chaque variante Shopify à la bonne variante fournisseur.
            </p>
          </div>
          <div style={styles.actionRow}>
            <button onClick={generateSupplierVariantsFromShopify} style={styles.smallButton}>
              Générer les variantes
            </button>
            <button onClick={autoLinkSupplierVariants} style={styles.greenSmallButton}>
              Relier automatiquement
            </button>
          </div>
        </div>

        <div style={styles.helpBox}>
          <strong>Le fonctionnement simple :</strong>
          <span>1. Choisis ton produit Shopify.</span>
          <span>2. Colle le lien AliExpress ou fournisseur.</span>
          <span>3. Clique d'abord sur Import détaillé pour récupérer les vraies variantes AliExpress.</span>
          <span>4. Utilise Import express seulement si AliExpress bloque la lecture ou si tu veux avancer vite.</span>
        </div>

        {supplierPreviewBlocked && (
          <div style={styles.warningBox}>
            <strong>Variantes non récupérées pour ce lien.</strong>
            <span>
              Si le connecteur Apify produit n’est pas encore configuré, ou si
              l’acteur choisi ne lit pas les variantes, Boost garde le lien mais
              ne peut pas afficher les photos/couleurs. Il faudra choisir un
              acteur Apify AliExpress produit compatible avec les variantes.
            </span>
            {supplierConnectorNote && <code style={styles.inlineCode}>{supplierConnectorNote}</code>}
          </div>
        )}

        <div style={styles.supplierVariantGrid}>
          {supplierVariants.map((variant, index) => (
            <div key={variant.id} style={styles.supplierVariantCard}>
              <div style={styles.supplierVariantTop}>
                {variant.supplier_image_url ? (
                  <img
                    src={variant.supplier_image_url}
                    alt={supplierVariantName(variant)}
                    style={styles.supplierVariantImage}
                  />
                ) : (
                  <div style={styles.supplierVariantImageEmpty}>Ali</div>
                )}
                <div>
                  <strong>{supplierVariantName(variant)}</strong>
                  <p style={styles.muted}>Variante fournisseur #{index + 1}</p>
                </div>
              </div>
              <input
                style={styles.compactInput}
                placeholder="Nom exact : Blue / 2pcs / 26x26..."
                value={variant.supplier_variant_label}
                onChange={(event) =>
                  updateSupplierVariantOption(variant.id, "supplier_variant_label", event.target.value)
                }
              />
              <div style={styles.twoColumns}>
                <input
                  style={styles.compactInput}
                  placeholder="Couleur"
                  value={variant.supplier_color}
                  onChange={(event) =>
                    updateSupplierVariantOption(variant.id, "supplier_color", event.target.value)
                  }
                />
                <input
                  style={styles.compactInput}
                  placeholder="Taille"
                  value={variant.supplier_size}
                  onChange={(event) =>
                    updateSupplierVariantOption(variant.id, "supplier_size", event.target.value)
                  }
                />
              </div>
              <div style={styles.twoColumns}>
                <input
                  style={styles.compactInput}
                  placeholder="Forme / Pack"
                  value={variant.supplier_shape}
                  onChange={(event) =>
                    updateSupplierVariantOption(variant.id, "supplier_shape", event.target.value)
                  }
                />
                <input
                  style={styles.compactInput}
                  placeholder="Prix fournisseur"
                  value={variant.supplier_price}
                  onChange={(event) =>
                    updateSupplierVariantOption(variant.id, "supplier_price", event.target.value)
                  }
                />
              </div>
              <input
                style={styles.compactInput}
                placeholder="URL image variante AliExpress"
                value={variant.supplier_image_url}
                onChange={(event) =>
                  updateSupplierVariantOption(variant.id, "supplier_image_url", event.target.value)
                }
              />
              <input
                style={styles.compactInput}
                placeholder="SKU fournisseur"
                value={variant.supplier_sku}
                onChange={(event) =>
                  updateSupplierVariantOption(variant.id, "supplier_sku", event.target.value)
                }
              />
            </div>
          ))}
        </div>

        <button onClick={addSupplierVariant} style={styles.secondaryButton}>
          Ajouter une variante fournisseur manuellement seulement si besoin
        </button>
      </section>

      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <div>
            <h2>Mapping des variantes</h2>
            <p style={styles.muted}>
              Choisis une variante fournisseur pour chaque variante de ta
              boutique. Exemple : “Couleur Bleu” côté Shopify = “Blue / 4 cars”
              côté AliExpress.
            </p>
          </div>
          <span style={styles.badge}>{mappedVariantCount} liée(s)</span>
        </div>

        {loading ? (
          <p style={styles.muted}>Chargement des variantes...</p>
        ) : selectedVariants.length === 0 ? (
          <div style={styles.warningBox}>
            <strong>Variantes non synchronisées.</strong>
            <p>
              Clique sur “Synchroniser les produits Shopify”. Boost récupérera
              les couleurs, tailles, formes et prix disponibles dans Shopify.
            </p>
          </div>
        ) : (
          <div style={styles.variantTable}>
            <div style={styles.variantHeader}>Variante boutique</div>
            <div style={styles.variantHeader}>Variante fournisseur liée</div>
            <div style={styles.variantHeader}>Ajustement si besoin</div>
            {selectedVariants.map((variant) => {
              const draft = supplierVariantDrafts[variant.shopify_variant_id] || {
                supplier_variant_label: "",
                supplier_color: "",
                supplier_size: "",
                supplier_shape: "",
                supplier_sku: "",
                supplier_price: "",
                supplier_image_url: "",
                supplier_note: "",
              }

              return (
                <div key={variant.shopify_variant_id} style={styles.variantRow}>
                  <div style={styles.shopifyVariant}>
                    {variant.image_url ? (
                      <img src={variant.image_url} alt={variant.variant_title} style={styles.variantImage} />
                    ) : (
                      <div style={styles.variantImageEmpty}>Var.</div>
                    )}
                    <div>
                      <strong>{optionsLabel(variant)}</strong>
                      <p style={styles.muted}>SKU : {variant.sku || "N/A"} · Prix : {variant.price || "N/A"}</p>
                    </div>
                  </div>

                  <div style={styles.variantInputs}>
                    <select
                      style={styles.compactInput}
                      value={
                        supplierVariants.find((supplierVariant) =>
                          supplierVariantName(supplierVariant) === draft.supplier_variant_label
                        )?.id || ""
                      }
                      onChange={(event) =>
                        applySupplierVariant(variant.shopify_variant_id, event.target.value)
                      }
                    >
                      <option value="">Choisir la variante fournisseur</option>
                      {supplierVariants.map((supplierVariant) => (
                        <option key={supplierVariant.id} value={supplierVariant.id}>
                          {supplierVariantName(supplierVariant)}
                        </option>
                      ))}
                    </select>
                    <input
                      style={styles.compactInput}
                      placeholder="ou écris directement : Blue / 2pcs..."
                      value={draft.supplier_variant_label}
                      onChange={(event) =>
                        updateSupplierVariantDraft(variant.shopify_variant_id, "supplier_variant_label", event.target.value)
                      }
                    />
                  </div>

                  <div style={styles.variantInputs}>
                    <div style={styles.linkedSupplierPreview}>
                      {draft.supplier_image_url ? (
                        <img
                          src={draft.supplier_image_url}
                          alt={draft.supplier_variant_label}
                          style={styles.linkedSupplierImage}
                        />
                      ) : (
                        <div style={styles.linkedSupplierImageEmpty}>Ali</div>
                      )}
                      <strong>{draft.supplier_variant_label || "Pas encore reliée"}</strong>
                    </div>
                    <input
                      style={styles.compactInput}
                      placeholder="Couleur"
                      value={draft.supplier_color}
                      onChange={(event) =>
                        updateSupplierVariantDraft(variant.shopify_variant_id, "supplier_color", event.target.value)
                      }
                    />
                    <input
                      style={styles.compactInput}
                      placeholder="Taille"
                      value={draft.supplier_size}
                      onChange={(event) =>
                        updateSupplierVariantDraft(variant.shopify_variant_id, "supplier_size", event.target.value)
                      }
                    />
                    <input
                      style={styles.compactInput}
                      placeholder="Forme / Pack"
                      value={draft.supplier_shape}
                      onChange={(event) =>
                        updateSupplierVariantDraft(variant.shopify_variant_id, "supplier_shape", event.target.value)
                      }
                    />
                    <input
                      style={styles.compactInput}
                      placeholder="Prix fournisseur"
                      value={draft.supplier_price}
                      onChange={(event) =>
                        updateSupplierVariantDraft(variant.shopify_variant_id, "supplier_price", event.target.value)
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button onClick={saveMapping} disabled={saving} style={styles.button}>
          {saving ? "Enregistrement..." : "Enregistrer le produit et ses variantes"}
        </button>
      </section>
        </>
      )}

      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <h2>Message fournisseur automatique</h2>
          <span style={styles.badge}>unique et modifiable</span>
        </div>
        <textarea
          style={styles.messageTextarea}
          value={supplierPreviewMessage}
          onChange={(event) => setSupplierMessageText(event.target.value)}
        />
      </section>

      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <h2>Mappings actifs</h2>
          <span style={styles.badge}>{mappings.length} mapping(s)</span>
        </div>

        {mappings.length === 0 ? (
          <p style={styles.muted}>Aucun mapping fournisseur pour le moment.</p>
        ) : (
          <div style={styles.mappingGrid}>
            {mappings.map((mapping) => (
              <article key={mapping.id} style={styles.mappingCard}>
                <div>
                  <span style={styles.source}>{mappingLabels[mapping.mapping_type] || mapping.mapping_type}</span>
                  <h3>{mapping.product_title}</h3>
                  <p style={styles.muted}>{mapping.product_handle}</p>
                </div>
                <div>
                  <strong>{mapping.supplier_name}</strong>
                  <p style={styles.muted}>{mapping.variant_label || "Toutes variantes"} · {mapping.country_scope}</p>
                  <a href={mapping.supplier_url} target="_blank" style={styles.link}>Ouvrir le fournisseur</a>
                </div>
                <pre style={styles.smallMessage}>{mapping.supplier_message}</pre>
                <div style={styles.actionRow}>
                  <button onClick={() => updateMapping(mapping.id, mapping.status === "active" ? "disable" : "enable")} style={styles.smallButton}>
                    {mapping.status === "active" ? "Désactiver" : "Réactiver"}
                  </button>
                  <button
                    onClick={() => {
                      const nextUrl = prompt("Nouveau lien fournisseur", mapping.supplier_url)
                      if (nextUrl) updateMapping(mapping.id, "replace", { supplier_url: nextUrl, supplier_name: mapping.supplier_name })
                    }}
                    style={styles.greenSmallButton}
                  >
                    Remplacer
                  </button>
                  <button onClick={() => deleteMapping(mapping.id)} style={styles.dangerSmallButton}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <h2>Liens fournisseurs enregistrés</h2>
          <span style={styles.badge}>{supplierProducts.length} lien(s)</span>
        </div>
        <p style={styles.muted}>
          Même quand AliExpress bloque la lecture automatique, Boost garde le
          lien pour que tu puisses l'associer à un produit.
        </p>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050816",
    color: "white",
    padding: 40,
    fontFamily: "Arial, sans-serif",
  },
  back: { color: "#a78bfa", fontWeight: 900, textDecoration: "none" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    maxWidth: 1380,
    margin: "28px 0",
    padding: 28,
    borderRadius: 28,
    background: "linear-gradient(135deg, #111827, #1e1b4b)",
    border: "1px solid #312e81",
  },
  eyebrow: { color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1.8, fontSize: 12, fontWeight: 900 },
  title: { margin: "10px 0", fontSize: 46 },
  lead: { margin: 0, color: "#cbd5e1", lineHeight: 1.55, maxWidth: 980 },
  logo: { width: 82, height: 82, borderRadius: 22 },
  workflow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
    maxWidth: 1380,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    background: "#111827",
    border: "1px solid #1f2937",
  },
  cardWide: {
    maxWidth: 1380,
    marginTop: 22,
    padding: 24,
    borderRadius: 24,
    background: "#111827",
    border: "1px solid #1f2937",
  },
  expressCard: {
    maxWidth: 1380,
    marginTop: 22,
    padding: 24,
    borderRadius: 28,
    background: "linear-gradient(135deg, rgba(22, 163, 74, .14), rgba(30, 27, 75, .9))",
    border: "1px solid rgba(74, 222, 128, .45)",
    boxShadow: "0 18px 50px rgba(0, 0, 0, .22)",
  },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 },
  badge: { borderRadius: 999, padding: "8px 11px", background: "#172554", color: "#bfdbfe", fontSize: 12, fontWeight: 900 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: "14px 15px",
    marginTop: 12,
    background: "#020617",
    color: "white",
    font: "inherit",
  },
  textarea: {
    width: "100%",
    minHeight: 86,
    boxSizing: "border-box",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: "14px 15px",
    marginTop: 12,
    background: "#020617",
    color: "white",
    font: "inherit",
  },
  button: {
    width: "100%",
    border: 0,
    borderRadius: 14,
    padding: "15px 20px",
    marginTop: 12,
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  greenButton: {
    width: "100%",
    border: 0,
    borderRadius: 14,
    padding: "15px 20px",
    marginTop: 12,
    background: "#16a34a",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: "14px 18px",
    marginTop: 12,
    background: "#020617",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  smallButton: {
    border: "none",
    borderRadius: 14,
    padding: "12px 15px",
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  greenSmallButton: {
    border: "none",
    borderRadius: 14,
    padding: "12px 15px",
    background: "#16a34a",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dangerSmallButton: {
    border: "none",
    borderRadius: 14,
    padding: "12px 15px",
    background: "#dc2626",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
  },
  helpBox: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    background: "rgba(124, 58, 237, .12)",
    border: "1px solid #4c1d95",
    color: "#ddd6fe",
    fontSize: 14,
  },
  connectorBox: {
    display: "grid",
    gap: 6,
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    background: "rgba(34, 211, 238, .08)",
    border: "1px solid rgba(34, 211, 238, .35)",
    color: "#cffafe",
    fontSize: 14,
    lineHeight: 1.45,
  },
  message: { maxWidth: 1380, color: "#bbf7d0", fontWeight: 900 },
  muted: { color: "#94a3b8", lineHeight: 1.5 },
  productMini: {
    display: "grid",
    gridTemplateColumns: "80px minmax(0, 1fr)",
    gap: 14,
    alignItems: "center",
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    background: "#020617",
  },
  productImage: { width: 80, height: 80, objectFit: "cover", borderRadius: 14 },
  emptyImage: { display: "grid", placeItems: "center", width: 80, height: 80, borderRadius: 14, background: "#111827", color: "#94a3b8" },
  messageBox: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
    color: "#dbeafe",
    background: "#020617",
    border: "1px solid #1f2937",
    borderRadius: 18,
    padding: 18,
    fontFamily: "Arial, sans-serif",
  },
  messageTextarea: {
    width: "100%",
    minHeight: 190,
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
    color: "#dbeafe",
    background: "#020617",
    border: "1px solid #1f2937",
    borderRadius: 18,
    padding: 18,
    fontFamily: "Arial, sans-serif",
    fontSize: 15,
  },
  mappingGrid: { display: "grid", gap: 16 },
  orderGrid: { display: "grid", gap: 16, marginTop: 16 },
  orderCard: {
    display: "grid",
    gridTemplateColumns: "minmax(190px, .7fr) minmax(220px, 1fr) minmax(220px, .8fr) minmax(260px, 1.1fr)",
    gap: 16,
    padding: 18,
    borderRadius: 20,
    background: "#020617",
    border: "1px solid #1f2937",
    alignItems: "start",
  },
  addressBox: {
    margin: "10px 0 0",
    padding: 10,
    borderRadius: 12,
    background: "#0f172a",
    border: "1px solid #1f2937",
    color: "#cbd5e1",
    whiteSpace: "pre-wrap",
    fontFamily: "Arial, sans-serif",
    fontSize: 12,
    lineHeight: 1.45,
  },
  mappingSelectBox: {
    display: "grid",
    gap: 8,
    marginTop: 12,
  },
  statusBadge: {
    display: "inline-flex",
    width: "fit-content",
    borderRadius: 999,
    padding: "7px 10px",
    background: "rgba(22, 163, 74, .15)",
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: 900,
  },
  orangeBadge: {
    display: "inline-flex",
    width: "fit-content",
    borderRadius: 999,
    padding: "7px 10px",
    background: "rgba(245, 158, 11, .16)",
    color: "#fde68a",
    fontSize: 12,
    fontWeight: 900,
  },
  supplierVariantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginTop: 16,
  },
  supplierVariantCard: {
    display: "grid",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    background: "#020617",
    border: "1px solid #1f2937",
  },
  supplierVariantTop: {
    display: "grid",
    gridTemplateColumns: "76px minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
  },
  supplierVariantImage: {
    width: 76,
    height: 76,
    objectFit: "cover",
    borderRadius: 14,
    background: "#111827",
  },
  supplierVariantImageEmpty: {
    display: "grid",
    placeItems: "center",
    width: 76,
    height: 76,
    borderRadius: 14,
    background: "#111827",
    color: "#a78bfa",
    fontWeight: 900,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  warningBox: {
    border: "1px solid #f59e0b",
    borderRadius: 18,
    padding: 18,
    background: "rgba(245, 158, 11, .08)",
    color: "#fde68a",
  },
  inlineCode: {
    display: "block",
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    background: "rgba(15, 23, 42, .8)",
    color: "#e2e8f0",
    whiteSpace: "pre-wrap",
    fontSize: 12,
  },
  variantTable: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr) minmax(280px, 1.1fr)",
    gap: 10,
    marginTop: 16,
  },
  variantHeader: {
    color: "#a78bfa",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
  },
  variantRow: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr) minmax(280px, 1.1fr)",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    background: "#020617",
    border: "1px solid #1f2937",
  },
  shopifyVariant: {
    display: "grid",
    gridTemplateColumns: "58px minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
  },
  variantImage: { width: 58, height: 58, objectFit: "cover", borderRadius: 12 },
  variantImageEmpty: {
    display: "grid",
    placeItems: "center",
    width: 58,
    height: 58,
    borderRadius: 12,
    background: "#111827",
    color: "#94a3b8",
    fontWeight: 900,
  },
  variantInputs: {
    display: "grid",
    gap: 8,
  },
  simpleMappingGrid: {
    display: "grid",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  simpleMappingCard: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1fr) 54px minmax(300px, 1.15fr)",
    gap: 14,
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    background: "rgba(2, 6, 23, .82)",
    border: "1px solid rgba(148, 163, 184, .18)",
  },
  simpleMappingSide: {
    display: "grid",
    gap: 8,
  },
  sideLabel: {
    color: "#a78bfa",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  arrowBox: {
    display: "grid",
    placeItems: "center",
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "rgba(22, 163, 74, .2)",
    color: "#bbf7d0",
    fontWeight: 900,
    fontSize: 22,
  },
  linkedSupplierPreview: {
    display: "grid",
    gridTemplateColumns: "48px minmax(0, 1fr)",
    gap: 10,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    background: "#0f172a",
    border: "1px solid #1f2937",
  },
  linkedSupplierImage: {
    width: 48,
    height: 48,
    objectFit: "cover",
    borderRadius: 10,
  },
  linkedSupplierImageEmpty: {
    display: "grid",
    placeItems: "center",
    width: 48,
    height: 48,
    borderRadius: 10,
    background: "#020617",
    color: "#a78bfa",
    fontWeight: 900,
    fontSize: 12,
  },
  compactInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "10px 11px",
    background: "#0f172a",
    color: "white",
    font: "inherit",
    fontSize: 13,
  },
  mappingCard: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, .8fr) minmax(220px, .7fr) minmax(260px, 1.2fr)",
    gap: 16,
    padding: 18,
    borderRadius: 20,
    background: "#020617",
    border: "1px solid #1f2937",
  },
  source: { color: "#a78bfa", fontWeight: 900, textTransform: "uppercase", fontSize: 12, letterSpacing: 1.4 },
  link: { color: "#60a5fa", fontWeight: 900 },
  smallMessage: {
    margin: 0,
    whiteSpace: "pre-wrap",
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 1.45,
    fontFamily: "Arial, sans-serif",
  },
}
