"use client"

import { useEffect, useState } from "react"

const API_URL =
  "https://boost-app-9e6w.vercel.app/api/widgets/sticky-cart"

export default function StickyCartPage() {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)

  async function loadState() {
    const res = await fetch(API_URL)
    const data = await res.json()

    if (data.success && data.data) {
      setActive(data.data.active)
    }
  }

  async function toggleWidget() {
    setLoading(true)

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        active: !active,
      }),
    })

    const data = await res.json()

    if (data.success) {
      setActive(!active)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadState()
  }, [])

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "white",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          marginBottom: "40px",
        }}
      >
        Sticky Cart
      </h1>

      <div
        style={{
          background: "#111827",
          padding: "32px",
          borderRadius: "24px",
          maxWidth: "450px",
        }}
      >
        <p>
          Statut :
          <strong
            style={{
              color: active ? "#22c55e" : "#ef4444",
              marginLeft: "10px",
            }}
          >
            {active ? "ACTIF" : "INACTIF"}
          </strong>
        </p>

        <button
          onClick={toggleWidget}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "20px",
            background: active ? "#dc2626" : "#7c3aed",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "14px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading
            ? "Chargement..."
            : active
            ? "Désactiver"
            : "Activer"}
        </button>
      </div>
    </main>
  )
}