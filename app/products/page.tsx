"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Product = {
  id: string
  title: string
  handle: string
  status?: string
  image_url?: string
  price?: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")

  const filteredProducts = products.filter((product) => {
    const query = search.toLowerCase()

    return (
      product.title?.toLowerCase().includes(query) ||
      product.handle?.toLowerCase().includes(query)
    )
  })

  async function loadProducts() {
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/products/list")
      const data = await res.json()

      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products)
      } else {
        setProducts([])
        setMessage(data.error || "Aucun produit Shopify trouvé.")
      }
    } catch (error) {
      console.error("LOAD PRODUCTS ERROR:", error)
      setMessage("Erreur pendant le chargement des produits.")
    }

    setLoading(false)
  }

  async function syncProducts() {
    setSyncing(true)
    setMessage("")

    try {
      const res = await fetch("/api/shopify/sync-products", {
        method: "POST",
      })

      const data = await res.json()

      if (data.success) {
        setMessage(`${data.synced} produit(s) synchronisé(s) avec succès.`)
        await loadProducts()
      } else {
        setMessage(data.error || "Erreur pendant la synchronisation.")
      }
    } catch (error) {
      console.error("SYNC PRODUCTS ERROR:", error)
      setMessage("Erreur pendant la synchronisation des produits.")
    }

    setSyncing(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>
        ← Retour à Boost
      </Link>

      <h1 style={styles.title}>Produits Shopify</h1>

      <div style={styles.card}>
        <p style={styles.muted}>
          Synchronise les produits de la boutique Shopify dans Boost. Cette base
          servira ensuite aux Reviews, Bundles, Upsell, Related Products et
          Social AutoPilot.
        </p>

        <div style={styles.statsBox}>
          <div>
            <p style={styles.statNumber}>{products.length}</p>
            <p style={styles.statLabel}>produit(s) importé(s)</p>
          </div>

          <div>
            <p style={styles.statNumber}>{filteredProducts.length}</p>
            <p style={styles.statLabel}>résultat(s) affiché(s)</p>
          </div>
        </div>

        <button onClick={syncProducts} disabled={syncing} style={styles.button}>
          {syncing ? "Synchronisation..." : "Synchroniser les produits"}
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </div>

      <div style={styles.cardWide}>
        <div style={styles.listHeader}>
          <h2 style={styles.sectionTitle}>Liste des produits</h2>

          <span style={styles.badge}>
            {filteredProducts.length} / {products.length}
          </span>
        </div>

        <input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        {loading && <p style={styles.muted}>Chargement des produits...</p>}

        {!loading && filteredProducts.length === 0 && (
          <p style={styles.muted}>Aucun produit trouvé.</p>
        )}

        <div style={styles.grid}>
          {filteredProducts.map((product, index) => (
            <div key={product.id} style={styles.productCard}>
              <div style={styles.numberBadge}>#{index + 1}</div>

              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  style={styles.image}
                />
              ) : (
                <div style={styles.emptyImage}>Aucune image</div>
              )}

              <div>
                <h3 style={styles.productTitle}>{product.title}</h3>

                <p style={styles.handle}>{product.handle}</p>

                <p style={styles.muted}>
                  Statut : <strong>{product.status || "N/A"}</strong>
                </p>

                <p style={styles.muted}>
                  Prix : <strong>{product.price || "N/A"}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050816",
    color: "white",
    padding: "40px",
    fontFamily: "Arial",
  },
  back: {
    color: "#a78bfa",
    textDecoration: "none",
  },
  title: {
    fontSize: "48px",
    marginTop: "30px",
  },
  card: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "700px",
    marginTop: "30px",
  },
  cardWide: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "1000px",
    marginTop: "30px",
  },
  muted: {
    color: "#94a3b8",
  },
  message: {
    color: "#cbd5e1",
    marginTop: "16px",
    fontWeight: "bold",
  },
  statsBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginTop: "22px",
  },
  statNumber: {
    fontSize: "34px",
    fontWeight: "bold",
    margin: 0,
    color: "#22c55e",
  },
  statLabel: {
    color: "#94a3b8",
    marginTop: "6px",
    marginBottom: 0,
  },
  button: {
    width: "100%",
    marginTop: "18px",
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
  input: {
    width: "100%",
    marginTop: "12px",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    fontSize: "15px",
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  sectionTitle: {
    margin: 0,
  },
  badge: {
    background: "#16a34a",
    color: "white",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gap: "16px",
    marginTop: "22px",
  },
  productCard: {
    display: "grid",
    gridTemplateColumns: "60px 90px 1fr",
    gap: "18px",
    background: "#050816",
    padding: "18px",
    borderRadius: "18px",
    alignItems: "center",
  },
  numberBadge: {
    background: "#7c3aed",
    color: "white",
    padding: "10px",
    borderRadius: "12px",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: "15px",
  },
  image: {
    width: "90px",
    height: "90px",
    objectFit: "cover",
    borderRadius: "14px",
  },
  emptyImage: {
    width: "90px",
    height: "90px",
    borderRadius: "14px",
    background: "#1f2937",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontSize: "12px",
    textAlign: "center",
  },
  productTitle: {
    margin: 0,
    fontSize: "18px",
  },
  handle: {
    color: "#a78bfa",
    fontSize: "13px",
    marginTop: "6px",
  },
}