"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function SalesPopupsPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)

  async function loadWidget() {
    const res = await fetch("/api/widgets/sales-popups")
    const data = await res.json()
    setActive(data.active)
    setLoading(false)
  }

  async function toggleWidget() {
    setLoading(true)
    const newState = !active

    await fetch("/api/widgets/sales-popups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ active: newState }),
    })

    setActive(newState)
    setLoading(false)
  }

  async function installOnShopify() {
    setInstalling(true)

    const res = await fetch("/api/shopify/inject-sales-popups", {
      method: "POST",
    })

    const data = await res.json()

    if (data.success) {
      alert("✅ Sales Popups installé sur la boutique client")
    } else {
      alert("❌ Erreur : " + JSON.stringify(data.error))
    }

    setInstalling(false)
  }

  useEffect(() => {
    loadWidget()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>
        ← Retour aux widgets
      </Link>

      <h1 style={styles.title}>Sales Popups</h1>

      <div style={styles.card}>
        <p style={styles.muted}>
          Notifications d’achat visibles sur la boutique client.
        </p>

        <p
          style={{
            ...styles.status,
            color: active ? "#22c55e" : "#ef4444",
          }}
        >
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
            ? "Désactiver Sales Popups"
            : "Activer Sales Popups"}
        </button>

        <button
          onClick={installOnShopify}
          disabled={installing}
          style={{
            ...styles.button,
            background: "#22c55e",
            color: "#020617",
          }}
        >
          {installing
            ? "Installation..."
            : "Installer sur la boutique client"}
        </button>
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
    maxWidth: "520px",
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
  button: {
    width: "100%",
    marginTop: "24px",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "18px",
  },
}