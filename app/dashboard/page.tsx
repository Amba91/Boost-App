"use client"

import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"

export default function DashboardPage() {
  const [store, setStore] = useState<any>(null)

  useEffect(() => {
    fetch("/api/shopify/store")
      .then((res) => res.json())
      .then((data) => {
        setStore(data)
      })
  }, [])

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
      }}
    >
      <Sidebar />

      <div style={{ flex: 1 }}>
        <Topbar />

        <div style={{ padding: "40px" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            Dashboard
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: "40px",
            }}
          >
            Boutique :
            {" "}
            {store?.shop || "Chargement..."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
            }}
          >
            <Card
              title="Revenue"
              value={store?.revenue || "0€"}
            />

            <Card
              title="Commandes"
              value={store?.orders || "0"}
            />

            <Card
              title="Conversion"
              value={store?.conversion || "0%"}
            />

            <Card
              title="AOV"
              value={store?.aov || "0€"}
            />
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
    <div
      style={{
        background: "#0f172a",
        padding: "30px",
        borderRadius: "24px",
        border: "1px solid #1e293b",
      }}
    >
      <p style={{ color: "#94a3b8" }}>{title}</p>

      <h2
        style={{
          fontSize: "42px",
          marginTop: "10px",
        }}
      >
        {value}
      </h2>
    </div>
  )
}