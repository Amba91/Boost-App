"use client"

import { useEffect, useState } from "react"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)

  async function loadWidgetState() {
    try {
      const response = await fetch(
        "https://boost-app-9e6w.vercel.app/api/widgets/sticky-cart"
      )

      const data = await response.json()

      if (data.success) {
        setActive(data.active)
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function toggleStickyCart() {
    try {
      setLoading(true)

      const response = await fetch(
        "https://boost-app-9e6w.vercel.app/api/widgets/sticky-cart",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active: !active,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        setActive(data.active)

        alert(
          data.active
            ? "✅ Sticky Cart activé"
            : "❌ Sticky Cart désactivé"
        )
      }
    } catch (error) {
      console.error(error)
      alert("Erreur serveur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWidgetState()
  }, [])

  return (
    <main
      style={{
        background: "#050816",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
        fontFamily: "sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          marginBottom: "40px",
        }}
      >
        🚀 BOOST
      </h1>

      <div
        style={{
          background: "#111827",
          padding: "30px",
          borderRadius: "20px",
          width: "400px",
        }}
      >
        <h2
          style={{
            fontSize: "28px",
            marginBottom: "10px",
          }}
        >
          Sticky Cart
        </h2>

        <p
          style={{
            opacity: 0.7,
            marginBottom: "20px",
          }}
        >
          Widget panier flottant intelligent.
        </p>

        <div
          style={{
            marginBottom: "20px",
            fontSize: "18px",
          }}
        >
          Status :
          <span
            style={{
              color: active ? "#22c55e" : "#ef4444",
              marginLeft: "10px",
              fontWeight: "bold",
            }}
          >
            {active ? "ACTIF" : "INACTIF"}
          </span>
        </div>

        <button
          onClick={toggleStickyCart}
          disabled={loading}
          style={{
            background: active ? "#dc2626" : "#7c3aed",
            border: "none",
            padding: "14px 20px",
            borderRadius: "12px",
            color: "white",
            cursor: "pointer",
            width: "100%",
            fontSize: "16px",
            fontWeight: "bold",
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