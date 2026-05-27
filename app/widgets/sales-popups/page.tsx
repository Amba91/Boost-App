"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function SalesPopupsPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadWidget() {
    try {
      const res = await fetch("/api/widgets/sales-popups")
      const data = await res.json()

      if (data.data?.active) {
        setActive(true)
      } else {
        setActive(false)
      }
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

      if (newState) {
        const script = document.createElement("script")
        script.src =
          "https://boost-app-9e6w.vercel.app/api/widgets/sales-popups/script"
        script.async = true
        script.id = "boost-sales-popups-script"

        document.body.appendChild(script)
      } else {
        const existing = document.getElementById(
          "boost-sales-popups-script"
        )

        if (existing) {
          existing.remove()
        }

        const popup = document.getElementById("boost-sales-popup")

        if (popup) {
          popup.remove()
        }
      }

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
    <main style={styles.main}>
      <Link href="/" style={styles.back}>
        ← Retour aux widgets
      </Link>

      <h1 style={styles.title}>Sales Popups</h1>

      <div style={styles.card}>
        <p style={styles.muted}>
          Notifications intelligentes Shopify.
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
    maxWidth: "500px",
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