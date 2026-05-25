"use client"

import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"

type StoreData = {
  shop?: string
  revenue?: string
  orders?: number
  conversion?: string
  aov?: string
  connected?: boolean
}

export default function DashboardPage() {
  const [store, setStore] = useState<StoreData | null>(null)

  useEffect(() => {
    fetch("/api/shopify/store")
      .then((res) => res.json())
      .then((data) => setStore(data))
      .catch(() => setStore({ connected: false }))
  }, [])

  return (
    <main style={styles.app}>
      <Sidebar />

      <div style={styles.main}>
        <Topbar />

        <div style={styles.content}>
          <h1 style={styles.title}>Dashboard</h1>

          <p style={styles.subtitle}>
            Boutique : {store?.shop || "kiidiiz.myshopify.com"}
          </p>

          <div style={styles.grid}>
            <Card title="Revenue" value={store?.revenue || "0€"} />
            <Card title="Commandes" value={String(store?.orders || 0)} />
            <Card title="Conversion" value={store?.conversion || "0%"} />
            <Card title="AOV" value={store?.aov || "0€"} />
          </div>

          <div style={styles.panel}>
            <h2>Connexion Shopify</h2>

            <p style={styles.muted}>
              Statut : {store?.connected ? "✅ Connecté" : "❌ Non connecté"}
            </p>

            <a
              href="/api/shopify/install?shop=kiidiiz.myshopify.com"
              style={styles.button}
            >
              Connecter Shopify
            </a>
          </div>

          <div style={styles.panel}>
            <h2>Actions rapides</h2>

            <div style={styles.actions}>
              <button
                style={styles.secondaryButton}
                onClick={() => alert("Configuration des widgets bientôt disponible")}
              >
                Configurer les widgets
              </button>

              <button
                style={styles.secondaryButton}
                onClick={() => alert("Insights IA bientôt disponibles")}
              >
                Voir les insights IA
              </button>

              <button
                style={styles.greenButton}
                onClick={() => alert("Accès Lifetime bientôt disponible")}
              >
                Activer Lifetime
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function Card({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div style={styles.card}>
      <p style={styles.muted}>{title}</p>
      <h2 style={styles.value}>{value}</h2>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    display: "flex",
  },
  main: {
    flex: 1,
  },
  content: {
    padding: "40px",
  },
  title: {
    fontSize: "48px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: "40px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
  },
  card: {
    background: "#0f172a",
    padding: "30px",
    borderRadius: "24px",
    border: "1px solid #1e293b",
  },
  muted: {
    color: "#94a3b8",
  },
  value: {
    fontSize: "42px",
    marginTop: "10px",
  },
  panel: {
    marginTop: "30px",
    background: "#0f172a",
    padding: "30px",
    borderRadius: "24px",
    border: "1px solid #1e293b",
  },
  button: {
    marginTop: "16px",
    background: "#7c3aed",
    color: "white",
    padding: "14px 20px",
    borderRadius: "14px",
    textDecoration: "none",
    fontWeight: "bold",
    display: "inline-block",
  },
  actions: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  secondaryButton: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "14px 20px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  greenButton: {
    background: "#22c55e",
    color: "black",
    border: "none",
    padding: "14px 20px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
}