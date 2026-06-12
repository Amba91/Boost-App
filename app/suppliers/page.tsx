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
  supplier_note: string
}

const mappingLabels: Record<string, string> = {
  standard: "Produit simple",
  backup: "Fournisseur de secours",
  bogo: "BOGO / 2e offert",
  bundle: "Bundle / Pack",
}

function defaultSupplierMessage(productTitle: string, mappingType: string, notes: string) {
  const offer =
    mappingType === "bogo"
      ? "une offre BOGO"
      : mappingType === "bundle"
        ? "un pack bundle"
        : "une commande dropshipping"

  return [
    `Bonjour, je souhaite passer ${offer} pour le produit : ${productTitle || "[produit]"}.`,
    "Merci d'expédier la commande sans facture, sans publicité, sans carte fournisseur et sans information indiquant l'origine de la plateforme.",
    "Merci d'utiliser un emballage neutre et propre. Le client final doit recevoir uniquement le produit.",
    notes ? `Instructions complémentaires : ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

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
  const [supplierVariantDrafts, setSupplierVariantDrafts] = useState<Record<string, SupplierVariantDraft>>({})

  const selectedProduct = useMemo(
    () => shopifyProducts.find((product) => String(product.id) === selectedProductId),
    [selectedProductId, shopifyProducts]
  )

  const supplierPreviewMessage = defaultSupplierMessage(
    selectedProduct?.title || "",
    mappingType,
    notes
  )

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
        setMessage(
          data.product?.image_urls?.length
            ? "Fiche fournisseur récupérée."
            : "Lien enregistré. AliExpress bloque parfois la lecture automatique, mais le mapping peut continuer."
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
            {saving ? "Enregistrement..." : "Enregistrer le mapping"}
          </button>
        </div>
      </section>

      {message && <p style={styles.message}>{message}</p>}

      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <div>
            <h2>Mapping des variantes</h2>
            <p style={styles.muted}>
              À gauche : les variantes réelles de ta boutique. À droite : ce
              qu'il faut choisir chez le fournisseur pour envoyer la bonne
              couleur, taille ou forme au client.
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
            <div style={styles.variantHeader}>Variante fournisseur</div>
            <div style={styles.variantHeader}>Infos fournisseur</div>
            {selectedVariants.map((variant) => {
              const draft = supplierVariantDrafts[variant.shopify_variant_id] || {
                supplier_variant_label: "",
                supplier_color: "",
                supplier_size: "",
                supplier_shape: "",
                supplier_sku: "",
                supplier_price: "",
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
                    <input
                      style={styles.compactInput}
                      placeholder="Nom fournisseur : Blue / 2pcs..."
                      value={draft.supplier_variant_label}
                      onChange={(event) =>
                        updateSupplierVariantDraft(variant.shopify_variant_id, "supplier_variant_label", event.target.value)
                      }
                    />
                    <input
                      style={styles.compactInput}
                      placeholder="SKU fournisseur"
                      value={draft.supplier_sku}
                      onChange={(event) =>
                        updateSupplierVariantDraft(variant.shopify_variant_id, "supplier_sku", event.target.value)
                      }
                    />
                  </div>

                  <div style={styles.variantInputs}>
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
      </section>

      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <h2>Message fournisseur automatique</h2>
          <span style={styles.badge}>copiable</span>
        </div>
        <pre style={styles.messageBox}>{supplierPreviewMessage}</pre>
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
  mappingGrid: { display: "grid", gap: 16 },
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
