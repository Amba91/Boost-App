"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function AnnouncementBarPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadWidget() {
    try {
      const res = await fetch("/api/widgets/announcement-bar")
      const data = await res.json()
      setActive(data.active)
    } finally {
      setLoading(false)
    }
  }

  async function toggleWidget() {
    setLoading(true)
    const newState = !active

    const res = await fetch("/api/widgets/announcement-bar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newState }),
    })

    const data = await res.json()
    setActive(data.active)
    setLoading(false)
  }

  useEffect(() => {
    loadWidget()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>← Retour aux widgets</Link>
      <h1 style={styles.title}>Announcement Bar</h1>

      <div style={styles.card}>
        <p style={styles.muted}>Barre d’annonce pour afficher une promo ou un message important.</p>

        <p style={{ ...styles.status, color: active ? "#22c55e" : "#ef4444" }}>
          Statut : {active ? "ACTIF" : "INACTIF"}
        </p>

        <button
          onClick={toggleWidget}
          disabled={loading}
          style={{ ...styles.button, background: active ? "#dc2626" : "#7c3aed" }}
        >
          {loading ? "Chargement..." : active ? "Désactiver Announcement Bar" : "Activer Announcement Bar"}
        </button>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: "100vh", background: "#050816", color: "white", padding: "40px", fontFamily: "Arial" },
  back: { color: "#a78bfa", textDecoration: "none" },
  title: { fontSize: "48px", marginTop: "30px" },
  card: { background: "#111827", padding: "32px", borderRadius: "24px", maxWidth: "520px", marginTop: "30px" },
  muted: { color: "#94a3b8", lineHeight: 1.6 },
  status: { marginTop: "20px", fontSize: "22px", fontWeight: "bold" },
  button: { width: "100%", marginTop: "24px", color: "white", border: "none", padding: "16px", borderRadius: "14px", fontWeight: "bold", cursor: "pointer", fontSize: "18px" },
}