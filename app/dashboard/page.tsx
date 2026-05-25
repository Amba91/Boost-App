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
  const [page, setPage] = useState("dashboard")

  const [widgets, setWidgets] = useState({
    stickyCart: true,
    salesPopup: true,
    wishlist: true,
    reviews: true,
    orderTracking: true,
  })

  useEffect(() => {
    fetch("/api/shopify/store")
      .then((res) => res.json())
      .then((data) => setStore(data))
      .catch(() => setStore({ connected: false }))
  }, [])

  function toggleWidget(key: keyof typeof widgets) {
    setWidgets((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <main style={styles.app}>
      <Sidebar page={page} setPage={setPage} />

      <div style={styles.main}>
        <Topbar title={getPageTitle(page)} />

        <div style={styles.content}>
          {page === "dashboard" && (
            <>
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
                <h2>Boost AI</h2>
                <p style={styles.muted}>
                  Votre boutique pourrait générer plus de revenus avec des optimisations automatiques.
                </p>
                <button style={styles.buttonAsButton} onClick={() => setPage("boost-ai")}>
                  Voir les insights IA
                </button>
              </div>
            </>
          )}

          {page === "widgets" && (
            <Panel title="Widgets Shopify">
              <WidgetRow title="Sticky Add To Cart" active={widgets.stickyCart} onClick={() => toggleWidget("stickyCart")} />
              <WidgetRow title="Sales Popups" active={widgets.salesPopup} onClick={() => toggleWidget("salesPopup")} />
              <WidgetRow title="Wishlist" active={widgets.wishlist} onClick={() => toggleWidget("wishlist")} />
              <WidgetRow title="Reviews" active={widgets.reviews} onClick={() => toggleWidget("reviews")} />
              <WidgetRow title="Order Tracking" active={widgets.orderTracking} onClick={() => toggleWidget("orderTracking")} />
            </Panel>
          )}

          {page === "analytics" && (
            <Panel title="Analytics">
              <div style={styles.grid}>
                <Card title="Revenue" value={store?.revenue || "0€"} />
                <Card title="Commandes" value={String(store?.orders || 0)} />
                <Card title="Conversion" value={store?.conversion || "0%"} />
                <Card title="Panier moyen" value={store?.aov || "0€"} />
              </div>
            </Panel>
          )}

          {page === "boost-ai" && (
            <Panel title="Boost AI">
              <p style={styles.muted}>
                Analyse IA de votre boutique Kiidiiz.
              </p>

              <div style={styles.aiBox}>
                <h3>Recommandation IA</h3>
                <p>
                  Activez les widgets Sticky Add To Cart, Sales Popups et Reviews pour améliorer la conversion.
                </p>
              </div>

              <button style={styles.buttonAsButton}>
                Générer une nouvelle recommandation
              </button>
            </Panel>
          )}

          {page === "shopify-connect" && (
            <Panel title="Shopify Connect">
              <p style={styles.muted}>
                Statut : {store?.connected ? "✅ Connecté" : "❌ Non connecté"}
              </p>

              <a
                href="/api/auth/shopify?shop=kiidiiz.myshopify.com"
                style={styles.button}
              >
                Connecter Shopify
              </a>
            </Panel>
          )}

          {page === "billing" && (
            <Panel title="Billing">
              <p style={styles.muted}>Plan actuel : Lifetime Access Kiidiiz</p>
              <button style={styles.greenButton}>
                Préparer l’abonnement Premium
              </button>
            </Panel>
          )}

          {page === "settings" && (
            <Panel title="Settings">
              <p style={styles.muted}>
                Paramètres de l’application Boost.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </main>
  )
}

function getPageTitle(page: string) {
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    widgets: "Widgets",
    analytics: "Analytics",
    "boost-ai": "Boost AI",
    "shopify-connect": "Shopify Connect",
    billing: "Billing",
    settings: "Settings",
  }

  return titles[page] || "Dashboard"
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.card}>
      <p style={styles.muted}>{title}</p>
      <h2 style={styles.value}>{value}</h2>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.panel}>
      <h1 style={styles.title}>{title}</h1>
      {children}
    </div>
  )
}

function WidgetRow({
  title,
  active,
  onClick,
}: {
  title: string
  active: boolean
  onClick: () => void
}) {
  return (
    <div style={styles.widgetRow}>
      <span>{title}</span>
      <button
        style={active ? styles.greenButton : styles.secondaryButton}
        onClick={onClick}
      >
        {active ? "Actif" : "Inactif"}
      </button>
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
    fontSize: "42px",
    fontWeight: "bold",
    marginBottom: "20px",
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
  buttonAsButton: {
    marginTop: "16px",
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "14px 20px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#334155",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  greenButton: {
    background: "#22c55e",
    color: "black",
    border: "none",
    padding: "10px 16px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  widgetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1e293b",
    padding: "18px 0",
  },
  aiBox: {
    background: "#020617",
    border: "1px solid #1e293b",
    padding: "24px",
    borderRadius: "20px",
    marginTop: "20px",
  },
}