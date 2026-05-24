"use client"

import { useState } from "react"

export default function LoginPage() {
  const [shop, setShop] = useState("kiidiiz.myshopify.com")

  function connectShopify() {
    if (!shop.includes(".myshopify.com")) {
      alert("Entre une boutique valide, exemple : kiidiiz.myshopify.com")
      return
    }

    window.location.href = `/api/shopify/install?shop=${shop}`
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #7c3aed 0, transparent 35%), #020617",
        color: "white",
        fontFamily: "Arial, sans-serif",
        display: "grid",
        placeItems: "center",
        padding: "32px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(15,23,42,0.92)",
          border: "1px solid #1e293b",
          borderRadius: "32px",
          padding: "36px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "42px", margin: 0 }}>🚀 BOOST</h1>
          <p style={{ color: "#94a3b8", marginTop: "10px" }}>
            Connecte ta boutique Shopify
          </p>
        </div>

        <div style={{ marginBottom: "22px" }}>
          <label style={{ fontWeight: "bold" }}>Boutique Shopify</label>
          <input
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            placeholder="votre-boutique.myshopify.com"
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "15px",
              borderRadius: "16px",
              border: "1px solid #334155",
              background: "#020617",
              color: "white",
              fontSize: "15px",
            }}
          />
        </div>

        <button
          onClick={connectShopify}
          style={{
            width: "100%",
            background: "linear-gradient(135deg,#7c3aed,#2563eb)",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "16px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Continuer avec Shopify
        </button>

        <div
          style={{
            marginTop: "28px",
            background: "#111827",
            border: "1px solid #1e293b",
            borderRadius: "20px",
            padding: "18px",
          }}
        >
          <p style={{ margin: 0, color: "#22c55e", fontWeight: "bold" }}>
            ● Sécurisé avec Shopify OAuth
          </p>
          <p style={{ color: "#94a3b8", marginBottom: 0 }}>
            Boost demandera uniquement les permissions nécessaires.
          </p>
        </div>
      </section>
    </main>
  )
}