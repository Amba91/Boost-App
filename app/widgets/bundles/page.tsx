"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function BundlesPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadWidget() {
    try {
      const res = await fetch("/api/widgets/bundles")
      const data = await res.json()

      setActive(data.active)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleWidget() {
    try {
      setLoading(true)

      const newState = !active

      await fetch("/api/widgets/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: newState,
        }),
      })

      setActive(newState)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWidget()
  }, [])

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "white",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <Link
        href="/"
        style={{
          color: "#a78bfa",
          textDecoration: "none",
        }}
      >
        ← Retour aux widgets
      </Link>

      <h1
        style={{
          fontSize: "48px",
          marginTop: "30px",
        }}
      >
        Bundles
      </h1>

      <div
        style={{
          background: "#111827",
          padding: "32px",
          borderRadius: "24px",
          maxWidth: "500px",
          marginTop: "30px",
        }}
      >
        <p style={{ color: "#94a3b8" }}>
          Widget Shopify intelligent.
        </p>

        <p
          style={{
            marginTop: "20px",
            fontSize: "22px",
            fontWeight: "bold",
            color: active ? "#22c55e" : "#ef4444",
          }}
        >
          Statut : {active ? "ACTIF" : "INACTIF"}
        </p>

        <button
          onClick={toggleWidget}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "24px",
            background: active ? "#dc2626" : "#7c3aed",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          {loading
            ? "Chargement..."
            : active
            ? "Désactiver Bundles"
            : "Activer Bundles"}
        </button>
      </div>
    </main>
  )
}