"use client"

import { useState } from "react"
import Sidebar from "./components/Sidebar"
import Topbar from "./components/Topbar"

export default function DashboardPage() {
  const [page, setPage] = useState("dashboard")

  return (
    <main style={styles.app}>
      <Sidebar page={page} setPage={setPage} />

      <div style={styles.main}>
        <Topbar title="Dashboard" />

        <div style={styles.content}>
          <h1 style={styles.title}>Dashboard</h1>

          <p style={styles.subtitle}>
            Boutique : hy4nf1-dt.myshopify.com
          </p>

          <div style={styles.statsGrid}>
            <div style={styles.card}>
              <p style={styles.cardLabel}>Revenus</p>
              <h2 style={styles.cardValue}>18 945€</h2>
              <span style={styles.green}>+28%</span>
            </div>

            <div style={styles.card}>
              <p style={styles.cardLabel}>Commandes</p>
              <h2 style={styles.cardValue}>1 259</h2>
              <span style={styles.green}>+22%</span>
            </div>

            <div style={styles.card}>
              <p style={styles.cardLabel}>Conversion</p>
              <h2 style={styles.cardValue}>3.62%</h2>
              <span style={styles.green}>+18%</span>
            </div>

            <div style={styles.card}>
              <p style={styles.cardLabel}>AOV</p>
              <h2 style={styles.cardValue}>65€</h2>
              <span style={styles.green}>+7%</span>
            </div>
          </div>

          <div style={styles.largeGrid}>
            <div style={styles.largeCard}>
              <h2 style={styles.largeTitle}>Widgets actifs</h2>

              <div style={styles.widgetRow}>
                <span>Sticky Add To Cart</span>
                <span style={styles.green}>Actif</span>
              </div>

              <div style={styles.widgetRow}>
                <span>Sales Popups</span>
                <span style={styles.green}>Actif</span>
              </div>

              <div style={styles.widgetRow}>
                <span>Wishlist</span>
                <span style={styles.green}>Actif</span>
              </div>

              <div style={styles.widgetRow}>
                <span>Reviews</span>
                <span style={styles.green}>Actif</span>
              </div>

              <div style={styles.widgetRow}>
                <span>Order Tracking</span>
                <span style={styles.green}>Actif</span>
              </div>
            </div>

            <div style={styles.largeCard}>
              <h2 style={styles.largeTitle}>🤖 Boost AI</h2>

              <p style={styles.aiText}>
                Votre boutique pourrait générer entre 2 156€ et 3 421€
                de revenus supplémentaires avec les optimisations
                recommandées.
              </p>

              <a
                href="https://boost-app-9e6w.vercel.app/api/shopify/install?shop=hy4nf1-dt.myshopify.com"
                style={styles.button}
              >
                Connecter Shopify
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
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
    fontSize: "52px",
    fontWeight: "bold",
    marginBottom: "8px",
  },

  subtitle: {
    color: "#94a3b8",
    marginBottom: "40px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
  },

  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "24px",
    padding: "28px",
  },

  cardLabel: {
    color: "#94a3b8",
    marginBottom: "12px",
  },

  cardValue: {
    fontSize: "42px",
    fontWeight: "bold",
    marginBottom: "10px",
  },

  green: {
    color: "#22c55e",
    fontWeight: "bold",
  },

  largeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginTop: "24px",
  },

  largeCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "24px",
    padding: "32px",
  },

  largeTitle: {
    fontSize: "34px",
    marginBottom: "24px",
    fontWeight: "bold",
  },

  widgetRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 0",
    borderBottom: "1px solid #1e293b",
  },

  aiText: {
    color: "#cbd5e1",
    lineHeight: 1.8,
    marginBottom: "24px",
  },

  button: {
    display: "inline-block",
    background: "#7c3aed",
    color: "white",
    padding: "14px 22px",
    borderRadius: "14px",
    textDecoration: "none",
    fontWeight: "bold",
  },
}