"use client"

import { useState } from "react"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"

export default function DashboardPage() {
  const [page, setPage] = useState("dashboard")

  return (
    <main style={styles.app}>
      <Sidebar page={page} setPage={setPage} />

      <section style={styles.main}>
        <Topbar title={title(page)} />

        <div style={styles.content}>
          {page === "dashboard" && <Dashboard />}
          {page === "widgets" && <Widgets />}
          {page === "analytics" && <Analytics />}
          {page === "ai" && <AI />}
          {page === "shopify" && <Shopify />}
          {page === "owner" && <Owner />}
          {page === "billing" && <Billing />}
        </div>
      </section>
    </main>
  )
}

function title(page: string) {
  return (
    {
      dashboard: "Dashboard",
      widgets: "Widgets",
      analytics: "Analytics",
      ai: "Boost AI",
      shopify: "Shopify Connect",
      owner: "Owner Center",
      billing: "Billing",
    }[page] || "Dashboard"
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={styles.card}>{children}</div>
}

function Dashboard() {
  return (
    <div style={styles.grid}>
      {["18 945€ Revenus", "1 259 Commandes", "3.62% Conversion", "65€ AOV"].map(
        (item) => (
          <Card key={item}>
            <p style={styles.muted}>{item.split(" ").slice(1).join(" ")}</p>
            <h2>{item.split(" ")[0]}</h2>
            <p style={styles.green}>+18%</p>
          </Card>
        )
      )}

      <Card>
        <h3>Widgets actifs</h3>

        {[
          "Sticky Cart",
          "Sales Popups",
          "Wishlist",
          "Reviews",
          "Tracking",
        ].map((w) => (
          <p key={w} style={styles.row}>
            {w}
            <span style={styles.green}>Actif</span>
          </p>
        ))}
      </Card>

      <Card>
        <h3>🤖 Boost AI</h3>

        <p style={styles.muted}>
          3 optimisations peuvent augmenter tes ventes cette semaine.
        </p>

        <button style={styles.button}>Voir les insights</button>
      </Card>
    </div>
  )
}

function Widgets() {
  return (
    <div style={styles.grid3}>
      {[
        "Sticky Cart",
        "Sales Popup",
        "Wishlist",
        "Reviews",
        "Bundles",
        "Tracking",
      ].map((w) => (
        <Card key={w}>
          <h3>{w}</h3>

          <p style={styles.muted}>
            Widget configurable pour Shopify.
          </p>

          <button style={styles.button}>Configurer</button>
        </Card>
      ))}
    </div>
  )
}

function Analytics() {
  return (
    <Card>
      <h3>📈 Revenus générés</h3>

      <div style={styles.chart}>
        {[70, 120, 90, 160, 130, 180, 220].map((h, i) => (
          <div
            key={i}
            style={{
              ...styles.bar,
              height: h,
            }}
          />
        ))}
      </div>
    </Card>
  )
}

function AI() {
  return (
    <Card>
      <h3>🤖 Recommandations IA</h3>

      {[
        "Active Sticky Cart sur toutes les pages produits.",
        "Crée un bundle avec tes 3 meilleurs produits.",
        "Ajoute les avis clients près du bouton achat.",
      ].map((x) => (
        <div key={x} style={styles.aiItem}>
          ✨ {x}
        </div>
      ))}
    </Card>
  )
}

function Shopify() {
  return (
    <Card>
      <h3>🛒 Connexion Shopify</h3>

      <p style={styles.muted}>
        OAuth prêt pour installation réelle.
      </p>

      <input
        defaultValue="kiidiiz.myshopify.com"
        style={styles.input}
      />

      <a
        href="/login"
        style={{
          ...styles.button,
          display: "inline-block",
          textDecoration: "none",
        }}
      >
        Connecter Shopify
      </a>
    </Card>
  )
}

function Owner() {
  return (
    <div style={styles.grid}>
      {[
        "MRR 8 920€",
        "Stores 284",
        "Lifetime 12",
        "Trials 62",
      ].map((s) => (
        <Card key={s}>
          <p style={styles.muted}>{s.split(" ")[0]}</p>

          <h2>{s.split(" ").slice(1).join(" ")}</h2>
        </Card>
      ))}

      <Card>
        <h3>🎁 Offrir accès à vie</h3>

        <input
          placeholder="boutique.myshopify.com"
          style={styles.input}
        />

        <button style={styles.greenButton}>
          Activer Lifetime
        </button>
      </Card>
    </div>
  )
}

function Billing() {
  return (
    <div style={styles.grid3}>
      {[
        "Starter 19€",
        "Pro 49€",
        "Lifetime 299€",
      ].map((p) => (
        <Card key={p}>
          <h3>{p.split(" ")[0]}</h3>

          <h2>{p.split(" ")[1]}</h2>

          <button style={styles.button}>
            Choisir
          </button>
        </Card>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#020617",
  },

  main: {
    flex: 1,
  },

  content: {
    padding: 30,
  },

  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 24,
    padding: 24,
    color: "white",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 20,
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 20,
  },

  muted: {
    color: "#94a3b8",
  },

  green: {
    color: "#22c55e",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #1e293b",
    paddingBottom: 12,
  },

  button: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  greenButton: {
    background: "#22c55e",
    color: "black",
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 12,
  },

  input: {
    display: "block",
    width: "100%",
    margin: "16px 0",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
  },

  chart: {
    height: 280,
    display: "flex",
    alignItems: "end",
    gap: 14,
  },

  bar: {
    flex: 1,
    background: "linear-gradient(180deg,#8b5cf6,#2563eb)",
    borderRadius: "14px 14px 0 0",
  },

  aiItem: {
    background: "#111827",
    padding: 16,
    borderRadius: 16,
    marginTop: 14,
  },
}