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
  const [supplierPreviewBlocked, setSupplierPreviewBlocked] = useState(false)
  const [supplierVariantDrafts, setSupplierVariantDrafts] = useState<Record<string, SupplierVariantDraft>>({})
  const [supplierVariants, setSupplierVariants] = useState<SupplierVariantOption[]>([
    {
      id: "supplier-1",
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
    setMessage("Variantes fournisseur générées automatiquement. Tu peux les modifier si AliExpress affiche un nom différent.")
  }

  function autoLinkSupplierVariants() {
    if (selectedVariants.length === 0) return

    const variantsToUse =
      supplierVariants.some((variant) => supplierVariantName(variant) !== "Variante fournisseur")
        ? supplierVariants
        : selectedVariants.map((variant, index) =>
            supplierVariantFromShopifyVariant(variant, index)
          )

    const nextDrafts: Record<string, SupplierVariantDraft> = {}
    selectedVariants.forEach((variant, index) => {
      const supplierVariant = variantsToUse[index] || supplierVariantFromShopifyVariant(variant, index)
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
    setMessage("Variantes reliées automatiquement. Vérifie seulement les exceptions, puis enregistre.")
  }

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/suppliers/mappings", { cache: "no-store" })
      const data = await res.json()
      if (data.success) {
        setShopifyProducts(data.products || [])
        setShopifyVariants(data.variants || [])
        setSupplierProducts(data.supplier_products || [])
        setMappings(data.mappings || [])
        setSavedVariantMappings(data.variant_mappings || [])
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
    try {
      const res = await fetch("/api/suppliers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: supplierUrl }),
      })
      const data = await res.json()
      if (data.success) {
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
          setSupplierPreviewBlocked(false)
        } else {
          setSupplierPreviewBlocked(true)
        }
        setMessage(
          data.variants?.length
            ? `${data.variants.length} variante(s) AliExpress récupérée(s) avec images.`
            : data.product?.image_urls?.length
              ? "Fiche fournisseur récupérée."
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
      setSupplierVariants([
        {
          id: "supplier-1",
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
    if (selectedVariants.length === 0) return

    setSupplierVariants(
      selectedVariants.map((variant, index) =>
        supplierVariantFromShopifyVariant(variant, index)
      )
    )
    setSupplierVariantDrafts({})
  }, [selectedProductId, shopifyVariants])

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
          <button onClick={previewSupplier} disabled={saving} style={styles.secondaryButton}>
            Tester / enregistrer le lien
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
          <span>2. Colle le lien AliExpress.</span>
          <span>3. Boost récupère les variantes AliExpress avec leurs images quand elles sont accessibles.</span>
          <span>4. Tu sélectionnes la bonne variante fournisseur pour chaque variante Shopify.</span>
        </div>

        {supplierPreviewBlocked && (
          <div style={styles.warningBox}>
            <strong>AliExpress a masqué les variantes pour ce lien.</strong>
            <span>
              Boost ne peut pas inventer les photos ou couleurs si AliExpress ne
              les envoie pas au serveur. La prochaine étape propre sera de
              brancher un vrai connecteur AliExpress/DSers-like ou un moteur
              navigateur sécurisé pour récupérer les variantes visibles comme
              sur la page AliExpress.
            </span>
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
