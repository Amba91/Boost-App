"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function SalesPopupsPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)

  async function loadWidget() {
    try {
      const res = await fetch("/api/widgets/sales-popups")
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

      await fetch("/api/widgets/sales-popups", {
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
      alert("Erreur pendant l’activation")
    } finally {
      setLoading(false)
    }
  }

  async function installOnShopify() {
    try {
      setInstalling(true)

      const res = await fetch("/api/shopify/inject-sales-popups", {
        method: "POST",
      })

      const data = await res.json()

      if (data.success) {
        alert("✅ Sales Popups installé sur Shopify")
      } else {
        alert("❌ Erreur installation Shopify")
      }
    } catch (error) {
      console.error(error)
      alert("❌ Impossible d’installer Sales Popups")
    } finally {
      setInstalling(false)
    }
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
          Affiche des notifications d’achat pour rassurer les visiteurs.
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
            marginTop: "14px",
          }}
        >
          {installing
            ? "Installation..."
            : "Installer Sales Popups sur Shopify"}
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
    lineHeight: 1.6,
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