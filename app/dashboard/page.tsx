"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const API_URL =
  "https://boost-app-9e6w.vercel.app/api/widgets/sticky-cart"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)

  async function loadState() {
    const res = await fetch(API_URL)
    const data = await res.json()

    if (data.success) {
      setActive(data.active)
    }
  }

  async function toggleStickyCart() {
    setLoading(true)

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        active: !active,
      }),
    })

    const data = await res.json()

    if (data.success) {
      setActive(data.active)
      alert(data.active ? "✅ Sticky Cart activé" : "❌ Sticky Cart désactivé")
    } else {
      alert("Erreur : " + data.error)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadState()
  }, [])

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "white",
        padding: "60px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "48px", marginBottom: "40px" }}>🚀 BOOST</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          maxWidth: "1000px",
        }}
      >
        <div
          style={{
            background: "#111827",
            padding: "32px",
            borderRadius: "24px",
          }}
        >
          <h2>Sticky Cart</h2>

          <p style={{ color: "#94a3b8" }}>
            Widget panier flottant intelligent.
          </p>

          <p>
            Statut :{" "}
            <strong style={{ color: active ? "#22c55e" : "#ef4444" }}>
              {active ? "ACTIF" : "INACTIF"}
            </strong>
          </p>

          <button
            onClick={toggleStickyCart}
            disabled={loading}
            style={{
              width: "100%",
              background: active ? "#dc2626" : "#7c3aed",
              color: "white",
              border: "none",
              padding: "14px 20px",
              borderRadius: "14px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {loading
              ? "Chargement..."
              : active
              ? "Désactiver Sticky Cart"
              : "Activer Sticky Cart"}
          </button>
        </div>

        <div
          style={{
            background: "#111827",
            padding: "32px",
            borderRadius: "24px",
          }}
        >
          <h2>Produits Shopify</h2>

          <p style={{ color: "#94a3b8" }}>
            Synchronise les produits Shopify dans Boost pour les utiliser dans
            Reviews, Bundles, Upsell et Social AutoPilot.
          </p>

          <Link
            href="/products"
            style={{
              display: "block",
              width: "100%",
              background: "#16a34a",
              color: "white",
              textAlign: "center",
              textDecoration: "none",
              padding: "14px 20px",
              borderRadius: "14px",
              fontWeight: "bold",
              boxSizing: "border-box",
              marginTop: "22px",
            }}
          >
            Voir les produits
          </Link>
        </div>
      </div>
    </main>
  )
}