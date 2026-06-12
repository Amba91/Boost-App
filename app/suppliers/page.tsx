"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type SupplierProduct = {
  id: number
  source: string
  source_url: string
  title: string
  description: string
  image_urls: string[] | string
  price: string
  currency: string
  supplier_name: string
  status: string
  updated_at?: string
}

function imagesFor(product: SupplierProduct) {
  if (Array.isArray(product.image_urls)) return product.image_urls
  try {
    const parsed = JSON.parse(String(product.image_urls || "[]"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function SuppliersPage() {
  const [url, setUrl] = useState("")
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function loadProducts() {
    try {
      const res = await fetch("/api/suppliers/preview", { cache: "no-store" })
      const data = await res.json()
      if (data.success) setProducts(data.products || [])
    } catch (error) {
      console.error(error)
    }
  }

  async function previewProduct() {
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/suppliers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.error || "Prévisualisation impossible.")
        return
      }
      setUrl("")
      setMessage("Produit fournisseur récupéré. Prochaine étape : création Shopify.")
      await loadProducts()
    } catch {
      setMessage("Prévisualisation impossible.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>Retour Boost</Link>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Fournisseurs</span>
          <h1 style={styles.title}>AliExpress produits</h1>
          <p style={styles.lead}>
            Colle un lien produit AliExpress pour récupérer une fiche fournisseur.
            Ensuite Boost pourra créer le produit dans Shopify avec images, prix
            et variantes.
          </p>
        </div>
        <img src="/logo.png" alt="Boost" style={styles.logo} />
      </div>

      <section style={styles.card}>
        <h2>Importer un produit fournisseur</h2>
        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="https://www.aliexpress.com/item/..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button onClick={previewProduct} disabled={loading} style={styles.button}>
            {loading ? "Lecture..." : "Prévisualiser"}
          </button>
        </div>
        {message && <p style={styles.message}>{message}</p>}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2>Produits fournisseurs</h2>
          <span style={styles.badge}>{products.length} fiche(s)</span>
        </div>

        {products.length === 0 ? (
          <p style={styles.muted}>Aucun produit fournisseur pour le moment.</p>
        ) : (
          <div style={styles.grid}>
            {products.map((product) => {
              const images = imagesFor(product)
              return (
                <article key={product.id} style={styles.productCard}>
                  {images[0] ? (
                    <img src={images[0]} alt={product.title} style={styles.productImage} />
                  ) : (
                    <div style={styles.emptyImage}>Image à vérifier</div>
                  )}
                  <div style={styles.productBody}>
                    <span style={styles.source}>{product.supplier_name || product.source}</span>
                    <h3>{product.title}</h3>
                    <p style={styles.muted}>{product.description || "Description à compléter dans Boost."}</p>
                    <div style={styles.productMeta}>
                      <span>Prix fournisseur : {product.price || "à vérifier"} {product.currency || ""}</span>
                      <span>Images : {images.length}</span>
                      <span>Statut : {product.status}</span>
                    </div>
                    <a href={product.source_url} target="_blank" style={styles.link}>
                      Ouvrir le lien source
                    </a>
                    <button disabled style={styles.disabledButton}>
                      Créer dans Shopify bientôt
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
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
    maxWidth: 1180,
    margin: "28px 0",
    padding: 28,
    borderRadius: 28,
    background: "linear-gradient(135deg, #111827, #1e1b4b)",
    border: "1px solid #312e81",
  },
  eyebrow: { color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1.8, fontSize: 12, fontWeight: 900 },
  title: { margin: "10px 0", fontSize: 46 },
  lead: { margin: 0, color: "#cbd5e1", lineHeight: 1.55, maxWidth: 820 },
  logo: { width: 82, height: 82, borderRadius: 22 },
  card: {
    maxWidth: 1180,
    marginBottom: 24,
    padding: 24,
    borderRadius: 24,
    background: "#111827",
    border: "1px solid #1f2937",
  },
  formRow: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12 },
  input: {
    width: "100%",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: "15px 16px",
    background: "#020617",
    color: "white",
    font: "inherit",
  },
  button: {
    border: 0,
    borderRadius: 14,
    padding: "15px 20px",
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  message: { color: "#bbf7d0", fontWeight: 900 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 },
  badge: { borderRadius: 999, padding: "8px 11px", background: "#172554", color: "#bfdbfe", fontSize: 12, fontWeight: 900 },
  muted: { color: "#94a3b8", lineHeight: 1.5 },
  grid: { display: "grid", gap: 18 },
  productCard: {
    display: "grid",
    gridTemplateColumns: "190px minmax(0, 1fr)",
    gap: 18,
    padding: 18,
    borderRadius: 20,
    background: "#020617",
    border: "1px solid #1f2937",
  },
  productImage: { width: "100%", height: 190, objectFit: "cover", borderRadius: 16, background: "#111827" },
  emptyImage: { display: "grid", placeItems: "center", height: 190, borderRadius: 16, background: "#111827", color: "#94a3b8" },
  productBody: { display: "grid", gap: 10 },
  source: { color: "#a78bfa", fontWeight: 900, textTransform: "uppercase", fontSize: 12, letterSpacing: 1.4 },
  productMeta: { display: "flex", flexWrap: "wrap", gap: 10, color: "#cbd5e1", fontSize: 14 },
  link: { color: "#60a5fa", fontWeight: 900 },
  disabledButton: {
    width: "fit-content",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#111827",
    color: "#94a3b8",
    fontWeight: 900,
    cursor: "not-allowed",
  },
}
