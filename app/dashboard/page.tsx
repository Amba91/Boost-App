"use client"

import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"

export default function WidgetsPage() {
  return (
    <main style={styles.app}>
      <Sidebar />

      <div style={styles.main}>
        <Topbar title="Widgets" />

        <div style={styles.content}>
          <h1 style={styles.title}>Widgets</h1>

          <p style={styles.subtitle}>
            Boutique : hy4nf1-dt.myshopify.com
          </p>

          <div style={styles.panel}>
            <h2>Connexion Shopify</h2>

            <a
              href="/api/shopify/install?shop=hy4nf1-dt.myshopify.com"
              style={styles.button}
            >
              Connecter Shopify
            </a>
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
    fontSize: "48px",
    fontWeight: "bold",
    marginBottom: "10px",
  },

  subtitle: {
    color: "#94a3b8",
    marginBottom: "30px",
  },

  panel: {
    background: "#0f172a",
    padding: "30px",
    borderRadius: "24px",
    border: "1px solid #1e293b",
    marginTop: "20px",
  },

  button: {
    display: "inline-block",
    marginTop: "20px",
    background: "#7c3aed",
    color: "white",
    padding: "14px 20px",
    borderRadius: "14px",
    textDecoration: "none",
    fontWeight: "bold",
  },
}