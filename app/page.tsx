"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const widgets = [
  { name: "Sticky Cart", slug: "sticky-cart" },
  { name: "Sales Popups", slug: "sales-popups" },
  { name: "Wishlist", slug: "wishlist" },
  { name: "Reviews", slug: "reviews" },
  { name: "Bundles", slug: "bundles" },
  { name: "Tracking", slug: "tracking" },
]

export default function HomePage() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({})

  async function loadStatuses() {
    const results: Record<string, boolean> = {}

    for (const widget of widgets) {
      try {
        const res = await fetch(`/api/widgets/${widget.slug}`)
        const data = await res.json()
        results[widget.slug] = data.active || false
      } catch {
        results[widget.slug] = false
      }
    }

    setStatuses(results)
  }

  useEffect(() => {
    loadStatuses()
  }, [])

  return (
    <main style={styles.main}>
      <h1 style={styles.logo}>🚀 BOOST</h1>

      <div style={styles.grid}>
        {widgets.map((widget) => {
          const active = statuses[widget.slug] || false

          return (
            <div key={widget.slug} style={styles.card}>
              <h2 style={styles.title}>{widget.name}</h2>

              <p style={styles.text}>Widget Shopify intelligent.</p>

              <p
                style={{
                  ...styles.status,
                  color: active ? "#22c55e" : "#ef4444",
                }}
              >
                {active ? "ACTIF" : "INACTIF"}
              </p>

              <Link href={`/widgets/${widget.slug}`}>
                <button style={styles.button}>Configurer</button>
              </Link>
            </div>
          )
        })}
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
  logo: {
    fontSize: "58px",
    fontWeight: "bold",
    marginBottom: "50px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: "24px",
  },
  card: {
    background: "#111827",
    borderRadius: "24px",
    padding: "30px",
  },
  title: {
    fontSize: "30px",
    marginBottom: "12px",
  },
  text: {
    color: "#94a3b8",
    marginBottom: "18px",
  },
  status: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "24px",
  },
  button: {
    width: "100%",
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
}