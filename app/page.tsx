"use client"

import { useState } from "react"

export default function HomePage() {
  const [loading, setLoading] = useState(false)

  async function installStickyCart() {
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
            shop: "kiidiiz.myshopify.com",
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        alert("✅ Sticky Cart installé sur Shopify")
      } else {
        alert("❌ Impossible d’installer le Sticky Cart")
      }
    } catch (error) {
      console.error(error)
      alert("❌ Erreur serveur")
    } finally {
      setLoading(false)
    }
  }

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
      <h1 style={{ fontSize: "42px", marginBottom: "40px" }}>
        🚀 BOOST
      </h1>

      <div
        style={{
          background: "#111827",
          padding: "30px",
          borderRadius: "20px",
          maxWidth: "400px",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>
          Sticky Cart
        </h2>

        <button
          onClick={installStickyCart}
          disabled={loading}
          style={{
            background: "#7c3aed",
            border: "none",
            padding: "14px 20px",
            borderRadius: "12px",
            color: "white",
            cursor: "pointer",
            width: "100%",
            fontSize: "16px",
          }}
        >
          {loading ? "Installation..." : "Installer Sticky Cart"}
        </button>
      </div>
    </main>
  )
}