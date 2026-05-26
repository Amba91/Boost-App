"use client"

import { useEffect, useState } from "react"

const API_URL =
  "https://boost-app-9e6w.vercel.app/api/widgets/sticky-cart"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)

  async function loadState() {
    try {
      const res = await fetch(API_URL)
      const data = await res.json()

      if (data.success && data.data) {
        setActive(data.data.active)
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function toggleStickyCart() {
    try {
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
        setActive(!active)

        alert(
          !active
            ? "✅ Sticky Cart activé"
            : "❌ Sticky Cart désactivé"
        )
      } else {
        alert("Erreur : " + data.error)
      }
    } catch (error) {
      alert("Erreur serveur")
      console.error(error)
    } finally {
      setLoading(false)
    }
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
      <h1
        style={{
          fontSize: "56px",
          fontWeight: "bold",
          marginBottom: "50px",
        }}
      >
        🚀 BOOST
      </h1>

      <div
        style={{
          background: "#111827",
          padding: "40px",
          borderRadius: "24px",
          maxWidth: "460px",
          boxShadow: "0 0 30px rgba(0,0,0,0.3)",
        }}
      >
        <h2
          style={{
            fontSize: "32px",
            marginBottom: "12px",
          }}
        >
          Sticky Cart
        </h2>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: "20px",
          }}
        >
          Widget panier flottant intelligent Shopify.
        </p>

        <div
          style={{
            marginBottom: "24px",
            fontSize: "18px",
          }}
        >
          Statut :{" "}
          <strong
            style={{
              color: active ? "#22c55e" : "#ef4444",
            }}
          >
            {active ? "ACTIF" : "INACTIF"}
          </strong>
        </div>

        <button
          onClick={toggleStickyCart}
          disabled={loading}
          style={{
            width: "100%",
            background: active ? "#dc2626" : "#7c3aed",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "0.2s",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? "Chargement..."
            : active
            ? "Désactiver Sticky Cart"
            : "Activer Sticky Cart"}
        </button>
      </div>
    </main>
  )
}