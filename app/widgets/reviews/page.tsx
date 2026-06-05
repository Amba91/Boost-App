"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Review = {
  id: number
  shop: string
  product_handle: string
  customer_first_name: string
  customer_last_name: string
  rating: number
  review: string
  image_url: string
  video_url: string
  verified: boolean
  verified_parent: boolean
  verified_purchase: boolean
  visible: boolean
  merchant_reply: string
}

type ShopifyProduct = {
  id: string
  title: string
  handle: string
  status?: string
  image_url?: string
  price?: string
}

export default function ReviewsPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [smartImporting, setSmartImporting] = useState(false)
  const [urlImporting, setUrlImporting] = useState(false)
  const [importMessage, setImportMessage] = useState("")
  const [smartImportMessage, setSmartImportMessage] = useState("")
  const [urlImportMessage, setUrlImportMessage] = useState("")
  const [reviewUrl, setReviewUrl] = useState("")
  const [search, setSearch] = useState("")
  const [reviews, setReviews] = useState<Review[]>([])
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [targetProductHandle, setTargetProductHandle] = useState("")
  const [targetProductTitle, setTargetProductTitle] = useState("")

  const [form, setForm] = useState({
    product_handle: "",
    customer_first_name: "",
    customer_last_name: "",
    rating: 5,
    review: "",
    merchant_reply: "",
    image_url: "",
    video_url: "",
    verified: true,
    verified_parent: true,
    verified_purchase: true,
  })

  const selectedProduct = products.find(
    (product) => product.handle === targetProductHandle
  )

  const displayedProductTitle =
    selectedProduct?.title || targetProductTitle || targetProductHandle

  const filteredReviews = reviews.filter((item) => {
    const query = search.toLowerCase()

    const normalizeHandle = (value: string = "") =>
      value
        .toLowerCase()
        .replace(/™/g, "")
        .replace(/â„¢/g, "")
        .trim()

    const matchesSelectedProduct = targetProductHandle
      ? normalizeHandle(item.product_handle) ===
        normalizeHandle(targetProductHandle)
      : true

    const matchesSearch =
      String(item.id).includes(query) ||
      item.product_handle?.toLowerCase().includes(query) ||
      item.customer_first_name?.toLowerCase().includes(query) ||
      item.customer_last_name?.toLowerCase().includes(query) ||
      item.review?.toLowerCase().includes(query)

    return matchesSelectedProduct && matchesSearch
  })

  function selectTargetProduct(handle: string) {
    const product = products.find((item) => item.handle === handle)

    setTargetProductHandle(handle)
    setTargetProductTitle(product?.title || "")
    setForm((current) => ({
      ...current,
      product_handle: handle,
    }))
  }

  async function loadWidget() {
    const res = await fetch("/api/widgets/reviews")
    const data = await res.json()
    setActive(data.active)
  }

  async function loadReviews() {
    const res = await fetch("/api/reviews/admin")
    const data = await res.json()
    setReviews(data.reviews || [])
  }

  async function loadProducts() {
    setProductsLoading(true)

    try {
      const res = await fetch("/api/products/list")
      const data = await res.json()

      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error("LOAD PRODUCTS ERROR:", error)
      setProducts([])
    }

    setProductsLoading(false)
  }

  async function toggleWidget() {
    setLoading(true)
    const newState = !active

    await fetch("/api/widgets/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newState }),
    })

    setActive(newState)
    setLoading(false)
  }

  async function uploadImage(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/reviews/upload-image", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    if (!data.success) {
      alert("Erreur upload image")
      return ""
    }

    return data.url
  }

  async function handleNewImageUpload(file?: File) {
    if (!file) return
    setUploading(true)

    const url = await uploadImage(file)

    if (url) {
      setForm({ ...form, image_url: url })
    }

    setUploading(false)
  }

  async function handleExistingImageUpload(id: number, file?: File) {
    if (!file) return
    setUploading(true)

    const url = await uploadImage(file)

    if (url) {
      updateLocalReview(id, "image_url", url)
    }

    setUploading(false)
  }

  async function importCSV(file?: File) {
    if (!file) return

    if (!targetProductHandle.trim()) {
      alert("Choisis un produit depuis la page Produits avant d’importer les avis.")
      return
    }

    setImporting(true)
    setImportMessage("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("target_product_handle", targetProductHandle.trim())

    const res = await fetch("/api/reviews/import", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    if (data.success) {
      setImportMessage(
        `${data.imported} avis importé(s) avec succès. ${data.skipped || 0} avis ignoré(s).`
      )
      await loadReviews()
    } else {
      setImportMessage("Erreur pendant l’import CSV.")
    }

    setImporting(false)
  }

  async function importSmartJSON(file?: File) {
    if (!file) return

    if (!targetProductHandle.trim()) {
      alert("Choisis un produit depuis la page Produits avant d’importer les avis.")
      return
    }

    setSmartImporting(true)
    setSmartImportMessage("")

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      const reviewsToImport = Array.isArray(parsed) ? parsed : parsed.reviews

      if (!Array.isArray(reviewsToImport)) {
        setSmartImportMessage(
          "Format invalide. Le fichier doit contenir un tableau d’avis ou un objet { reviews: [...] }."
        )
        setSmartImporting(false)
        return
      }

      const reviewsWithTargetProduct = reviewsToImport.map((review: any) => ({
        ...review,
        product_handle: review.product_handle || targetProductHandle,
      }))

      const res = await fetch("/api/reviews/import-smart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviews: reviewsWithTargetProduct,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSmartImportMessage(
          `${data.imported} avis importé(s) avec succès. ${data.skipped || 0} avis ignoré(s).`
        )
        await loadReviews()
      } else {
        setSmartImportMessage(
          data.error || "Erreur pendant l’import intelligent."
        )
      }
    } catch (error) {
      console.error("SMART IMPORT JSON ERROR:", error)
      setSmartImportMessage("Erreur : le fichier JSON est invalide.")
    }

    setSmartImporting(false)
  }

  async function importFromUrl() {
    if (!targetProductHandle.trim()) {
      alert("Choisis un produit depuis la page Produits avant d’importer les avis.")
      return
    }

    if (!reviewUrl.trim()) {
      alert("Colle d’abord un lien Amazon, AliExpress ou autre.")
      return
    }

    setUrlImporting(true)
    setUrlImportMessage("")

    try {
      const res = await fetch("/api/reviews/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_handle: targetProductHandle,
          url: reviewUrl,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setUrlImportMessage(data.message || "Lien analysé avec succès.")
      } else {
        setUrlImportMessage(data.error || "Erreur pendant l’analyse du lien.")
      }
    } catch (error) {
      console.error("IMPORT URL ERROR:", error)
      setUrlImportMessage("Erreur pendant l’import par lien.")
    }

    setUrlImporting(false)
  }

  async function createReview() {
    const productHandle = targetProductHandle || form.product_handle

    if (!productHandle || !form.review) {
      alert("Produit et avis obligatoires")
      return
    }

    await fetch("/api/reviews/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: "kiidiiz.com",
        ...form,
        product_handle: productHandle,
      }),
    })

    setForm({
      product_handle: productHandle,
      customer_first_name: "",
      customer_last_name: "",
      rating: 5,
      review: "",
      merchant_reply: "",
      image_url: "",
      video_url: "",
      verified: true,
      verified_parent: true,
      verified_purchase: true,
    })

    loadReviews()
  }

  async function updateReview(review: Review) {
    await fetch("/api/reviews/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    })

    loadReviews()
  }

  async function deleteReview(id: number) {
    if (!confirm("Supprimer cet avis définitivement ?")) return

    await fetch("/api/reviews/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    })

    loadReviews()
  }

  function updateLocalReview(id: number, field: keyof Review, value: any) {
    setReviews((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search)
      const productHandle = params.get("product_handle") || ""
      const productTitle = params.get("product_title") || ""

      if (productHandle) {
        setTargetProductHandle(productHandle)
        setTargetProductTitle(productTitle)
        setForm((current) => ({
          ...current,
          product_handle: productHandle,
        }))
      }

      await loadWidget()
      await loadReviews()
      await loadProducts()
      setLoading(false)
    }

    init()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/products" style={styles.back}>
        ← Retour aux produits
      </Link>

      <h1 style={styles.title}>Avis clients</h1>

      {targetProductHandle && (
        <div style={styles.selectedProductCard}>
          <p style={styles.selectedLabel}>Produit sélectionné</p>
          <h2 style={styles.selectedTitle}>{displayedProductTitle}</h2>
          <p style={styles.handle}>{targetProductHandle}</p>
          <p style={styles.muted}>
            Avis associés à ce produit :{" "}
            <strong>{filteredReviews.length}</strong>
          </p>
        </div>
      )}

      <div style={styles.card}>
        <p style={styles.muted}>
          Active ou désactive l’affichage des avis sur les fiches produits.
        </p>

        <p style={{ ...styles.status, color: active ? "#22c55e" : "#ef4444" }}>
          Statut : {active ? "ACTIF" : "INACTIF"}
        </p>

        <button
          onClick={toggleWidget}
          disabled={loading}
          style={{
            ...styles.button,
            background: active ? "#dc2626" : "#7c3aed",
          }}
        >
          {loading
            ? "Chargement..."
            : active
            ? "Désactiver Reviews"
            : "Activer Reviews"}
        </button>
      </div>

      <div style={styles.card}>
        <h2>Import / Export CSV</h2>

        <p style={styles.muted}>
          Les avis importés seront associés automatiquement au produit
          sélectionné.
        </p>

        {products.length > 0 ? (
          <select
            value={targetProductHandle}
            onChange={(e) => selectTargetProduct(e.target.value)}
            style={styles.input}
          >
            <option value="">Choisir un produit Shopify</option>
            {products.map((product) => (
              <option key={product.id} value={product.handle}>
                {product.title} — {product.handle}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder={
              productsLoading
                ? "Chargement des produits Shopify..."
                : "Handle du produit cible"
            }
            value={targetProductHandle}
            onChange={(e) => selectTargetProduct(e.target.value)}
            style={styles.input}
          />
        )}

        <p style={styles.helper}>
          Produit cible actuel :{" "}
          <strong>{targetProductHandle || "aucun produit sélectionné"}</strong>
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => importCSV(e.target.files?.[0])}
          style={styles.file}
        />

        {importMessage && (
          <p
            style={
              importMessage.toLowerCase().includes("erreur")
                ? styles.error
                : styles.success
            }
          >
            {importMessage}
          </p>
        )}

        <a href="/api/reviews/export" style={styles.exportLink}>
          Télécharger les avis en CSV
        </a>

        {importing && <p style={styles.muted}>Import en cours...</p>}
      </div>

      <div style={styles.card}>
        <h2>Import intelligent JSON</h2>

        <p style={styles.muted}>
          Importe des avis venant d’Amazon, AliExpress, Loox, Judge.me ou Ryviu
          à partir d’un fichier JSON normalisé.
        </p>

        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => importSmartJSON(e.target.files?.[0])}
          style={styles.file}
        />

        {smartImportMessage && (
          <p
            style={
              smartImportMessage.toLowerCase().includes("erreur") ||
              smartImportMessage.toLowerCase().includes("invalide")
                ? styles.error
                : styles.success
            }
          >
            {smartImportMessage}
          </p>
        )}

        {smartImporting && (
          <p style={styles.muted}>Import intelligent en cours...</p>
        )}
      </div>

      <div style={styles.card}>
        <h2>Import par lien</h2>

        <p style={styles.muted}>
          Colle un lien Amazon, AliExpress, Loox, Judge.me, Ryviu ou autre.
          Boost détectera la plateforme et préparera l’import des avis pour le
          produit sélectionné.
        </p>

        <input
          placeholder="Colle ici le lien du produit ou des avis..."
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={importFromUrl}
          disabled={urlImporting}
          style={styles.button}
        >
          {urlImporting ? "Analyse du lien..." : "Importer depuis ce lien"}
        </button>

        {urlImportMessage && (
          <p
            style={
              urlImportMessage.toLowerCase().includes("erreur")
                ? styles.error
                : styles.success
            }
          >
            {urlImportMessage}
          </p>
        )}
      </div>

      <div style={styles.card}>
        <h2>Ajouter un avis</h2>

        <input
          placeholder="Produit sélectionné automatiquement"
          value={targetProductHandle || form.product_handle}
          onChange={(e) =>
            setForm({ ...form, product_handle: e.target.value })
          }
          disabled={Boolean(targetProductHandle)}
          style={styles.input}
        />

        <input
          placeholder="Prénom"
          value={form.customer_first_name}
          onChange={(e) =>
            setForm({ ...form, customer_first_name: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="Nom"
          value={form.customer_last_name}
          onChange={(e) =>
            setForm({ ...form, customer_last_name: e.target.value })
          }
          style={styles.input}
        />

        <select
          value={form.rating}
          onChange={(e) =>
            setForm({ ...form, rating: Number(e.target.value) })
          }
          style={styles.input}
        >
          <option value={5}>5 étoiles</option>
          <option value={4}>4 étoiles</option>
          <option value={3}>3 étoiles</option>
          <option value={2}>2 étoiles</option>
          <option value={1}>1 étoile</option>
        </select>

        <textarea
          placeholder="Texte de l’avis"
          value={form.review}
          onChange={(e) => setForm({ ...form, review: e.target.value })}
          style={styles.textarea}
        />

        <textarea
          placeholder="Réponse du marchand"
          value={form.merchant_reply}
          onChange={(e) =>
            setForm({ ...form, merchant_reply: e.target.value })
          }
          style={styles.textarea}
        />

        <input
          placeholder="URL image client"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          style={styles.input}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleNewImageUpload(e.target.files?.[0])}
          style={styles.file}
        />

        {form.image_url && (
          <img src={form.image_url} alt="Aperçu" style={styles.preview} />
        )}

        <button onClick={createReview} style={styles.button}>
          {uploading ? "Upload en cours..." : "Ajouter l’avis"}
        </button>
      </div>

      <div style={styles.cardWide}>
        <h2>
          Avis existants{" "}
          {targetProductHandle && `— ${filteredReviews.length} avis`}
        </h2>

        <input
          placeholder="Rechercher par numéro, prénom, nom, produit ou texte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        {filteredReviews.length === 0 && (
          <p style={styles.muted}>Aucun avis trouvé pour ce produit.</p>
        )}

        {filteredReviews.map((item) => (
          <div key={item.id} style={styles.reviewCard}>
            <div style={styles.reviewHeader}>
              <span>Avis #{item.id}</span>
              <span>
                {item.visible ? "Visible" : "Masqué"} ·{" "}
                {item.customer_first_name} {item.customer_last_name}
              </span>
            </div>

            <input
              value={item.product_handle || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "product_handle", e.target.value)
              }
              style={styles.input}
            />

            <div style={styles.row}>
              <input
                value={item.customer_first_name || ""}
                onChange={(e) =>
                  updateLocalReview(
                    item.id,
                    "customer_first_name",
                    e.target.value
                  )
                }
                style={styles.input}
              />

              <input
                value={item.customer_last_name || ""}
                onChange={(e) =>
                  updateLocalReview(
                    item.id,
                    "customer_last_name",
                    e.target.value
                  )
                }
                style={styles.input}
              />
            </div>

            <select
              value={item.rating || 5}
              onChange={(e) =>
                updateLocalReview(item.id, "rating", Number(e.target.value))
              }
              style={styles.input}
            >
              <option value={5}>5 étoiles</option>
              <option value={4}>4 étoiles</option>
              <option value={3}>3 étoiles</option>
              <option value={2}>2 étoiles</option>
              <option value={1}>1 étoile</option>
            </select>

            <textarea
              value={item.review || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "review", e.target.value)
              }
              style={styles.textarea}
            />

            <textarea
              placeholder="Réponse du marchand"
              value={item.merchant_reply || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "merchant_reply", e.target.value)
              }
              style={styles.textarea}
            />

            <input
              placeholder="URL image"
              value={item.image_url || ""}
              onChange={(e) =>
                updateLocalReview(item.id, "image_url", e.target.value)
              }
              style={styles.input}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleExistingImageUpload(item.id, e.target.files?.[0])
              }
              style={styles.file}
            />

            {item.image_url && (
              <img
                src={item.image_url}
                alt="Avis client"
                style={styles.preview}
              />
            )}

            <div style={styles.checkboxRow}>
              <label>
                <input
                  type="checkbox"
                  checked={item.verified}
                  onChange={(e) =>
                    updateLocalReview(item.id, "verified", e.target.checked)
                  }
                />{" "}
                Vérifié
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={item.verified_parent}
                  onChange={(e) =>
                    updateLocalReview(
                      item.id,
                      "verified_parent",
                      e.target.checked
                    )
                  }
                />{" "}
                Parent vérifié
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={item.verified_purchase}
                  onChange={(e) =>
                    updateLocalReview(
                      item.id,
                      "verified_purchase",
                      e.target.checked
                    )
                  }
                />{" "}
                Achat confirmé
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(e) =>
                    updateLocalReview(item.id, "visible", e.target.checked)
                  }
                />{" "}
                Visible
              </label>
            </div>

            <button onClick={() => updateReview(item)} style={styles.button}>
              Enregistrer les modifications
            </button>

            <button
              onClick={() => deleteReview(item.id)}
              style={{
                ...styles.button,
                background: "#dc2626",
                marginTop: "10px",
              }}
            >
              Supprimer l’avis
            </button>
          </div>
        ))}
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
  selectedProductCard: {
    background: "linear-gradient(135deg, #111827, #064e3b)",
    border: "1px solid #16a34a",
    padding: "28px",
    borderRadius: "24px",
    maxWidth: "650px",
    marginTop: "30px",
  },
  selectedLabel: {
    color: "#22c55e",
    fontWeight: "bold",
    margin: 0,
  },
  selectedTitle: {
    fontSize: "26px",
    marginTop: "10px",
    marginBottom: "8px",
  },
  card: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "650px",
    marginTop: "30px",
  },
  cardWide: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "900px",
    marginTop: "30px",
  },
  muted: {
    color: "#94a3b8",
  },
  helper: {
    color: "#cbd5e1",
    fontSize: "13px",
    marginTop: "10px",
  },
  handle: {
    color: "#a78bfa",
    fontSize: "13px",
    marginTop: "6px",
  },
  status: {
    marginTop: "20px",
    fontSize: "22px",
    fontWeight: "bold",
  },
  success: {
    color: "#22c55e",
    fontWeight: "bold",
    marginTop: "12px",
  },
  error: {
    color: "#ef4444",
    fontWeight: "bold",
    marginTop: "12px",
  },
  exportLink: {
    display: "block",
    width: "100%",
    marginTop: "18px",
    background: "#16a34a",
    color: "white",
    textAlign: "center",
    textDecoration: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    marginTop: "18px",
    background: "#7c3aed",
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
  textarea: {
    width: "100%",
    marginTop: "12px",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    fontSize: "15px",
    minHeight: "100px",
  },
  file: {
    width: "100%",
    marginTop: "12px",
    color: "#cbd5e1",
  },
  preview: {
    width: "90px",
    height: "90px",
    objectFit: "cover",
    borderRadius: "12px",
    marginTop: "12px",
  },
  reviewCard: {
    background: "#050816",
    padding: "24px",
    borderRadius: "18px",
    marginTop: "18px",
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #1e293b",
    color: "#a78bfa",
    fontWeight: "bold",
    fontSize: "15px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  checkboxRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "16px",
    color: "#cbd5e1",
  },
}