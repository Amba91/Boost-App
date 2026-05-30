"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function UpsellPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sourceProduct, setSourceProduct] = useState("")
  const [targetProduct, setTargetProduct] = useState("")
  const [rules, setRules] = useState<any[]>([])

  async function loadWidget() {
    const res = await fetch("/api/widgets/upsell")
    const data = await res.json()
    setActive(data.active || false)
  }

  async function loadRules() {
    const res = await fetch("/api/upsell-rules")
    const data = await res.json()
    setRules(data.rules || [])
  }

  async function toggleWidget() {
    setLoading(true)

    const res = await fetch("/api/widgets/upsell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        active: !active,
      }),
    })

    const data = await res.json()
    setActive(data.active)
    setLoading(false)
  }

  async function saveRule() {
    if (!sourceProduct || !targetProduct) return

    await fetch("/api/upsell-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceProduct,
        targetProduct,
      }),
    })

    setSourceProduct("")
    setTargetProduct("")
    loadRules()
  }

  useEffect(() => {
    async function init() {
      await loadWidget()
      await loadRules()
      setLoading(false)
    }

    init()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>
        ← Retour aux widgets
      </Link>

      <h1 style={styles.title}>Upsell</h1>

      <div style={styles.card}>
        <p style={styles.muted}>
          Propose un produit complémentaire après l’ajout au panier.
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
          {loading ? "Chargement..." : active ? "Désactiver Upsell" : "Activer Upsell"}
        </button>
      </div>

      <div style={styles.card}>
        <h2>Règle d’upsell</h2>

        <input
          placeholder="Produit principal"
          value={sourceProduct}
          onChange={(e) => setSourceProduct(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Produit recommandé"
          value={targetProduct}
          onChange={(e) => setTargetProduct(e.target.value)}
          style={styles.input}
        />

        <button onClick={saveRule} style={styles.button}>
          Ajouter une règle
        </button>
      </div>

      <div style={styles.card}>
        <h2>Règles existantes</h2>

        {rules.length === 0 && (
          <p style={styles.muted}>Aucune règle configurée.</p>
        )}

        {rules.map((rule) => (
          <div key={rule.id} style={styles.rule}>
            <strong>{rule.source_product}</strong>
            <br />
            ↓
            <br />
            <strong>{rule.target_product}</strong>
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
    padding: "28px",
    borderRadius: "24px",
    maxWidth: "720px",
    marginTop: "28px",
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
    marginTop: "16px",
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
    padding: "14px",
    marginTop: "12px",
    borderRadius: "12px",
    border: "none",
    fontSize: "16px",
  },
  rule: {
    background: "#050816",
    padding: "18px",
    borderRadius: "16px",
    marginTop: "12px",
    lineHeight: 1.8,
  },
}