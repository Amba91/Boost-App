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
}

export default function ReviewsPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState("")
  const [reviews, setReviews] = useState<Review[]>([])

  const [form, setForm] = useState({
    product_handle: "",
    customer_first_name: "",
    customer_last_name: "",
    rating: 5,
    review: "",
    image_url: "",
    video_url: "",
    verified: true,
    verified_parent: true,
    verified_purchase: true,
  })

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

    setImporting(true)
    setImportMessage("")

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/reviews/import", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    if (data.success) {
      setImportMessage(`${data.imported} avis importé(s) avec succès.`)
      await loadReviews()
    } else {
      setImportMessage("Erreur pendant l’import CSV.")
    }

    setImporting(false)
  }

  async function createReview() {
    if (!form.product_handle || !form.review) {
      alert("Produit handle et avis obligatoires")
      return
    }

    await fetch("/api/reviews/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop: "kiidiiz.com", ...form }),
    })

    setForm({
      product_handle: "",
      customer_first_name: "",
      customer_last_name: "",
      rating: 5,
      review: "",
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
      await loadWidget()
      await loadReviews()
      setLoading(false)
    }

    init()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>
        ← Retour aux widgets
      </Link>

      <h1 style={styles.title}>Avis clients</h1>

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
          Importe ou exporte les avis au format CSV compatible Boost.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => importCSV(e.target.files?.[0])}
          style={styles.file}
        />

        {importMessage && <p style={styles.success}>{importMessage}</p>}

        <a href="/api/reviews/export" style={styles.exportLink}>
          Télécharger les avis en CSV
        </a>

        {importing && <p style={styles.muted}>Import en cours...</p>}
      </div>

      <div style={styles.card}>
        <h2>Ajouter un avis</h2>

        <input
          placeholder="Handle produit, ex : appareil-photo-enfant-kidcam-ludique"
          value={form.product_handle}
          onChange={(e) =>
            setForm({ ...form, product_handle: e.target.value })
          }
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
        <h2>Avis existants</h2>

        {reviews.length === 0 && (
          <p style={styles.muted}>Aucun avis pour le moment.</p>
        )}

        {reviews.map((item) => (
          <div key={item.id} style={styles.reviewCard}>
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