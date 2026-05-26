"use client"

import Link from "next/link"

export default function BundlesPage() {
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
      <Link
        href="/"
        style={{
          color: "#a78bfa",
          textDecoration: "none",
        }}
      >
        ← Retour aux widgets
      </Link>

      <h1
        style={{
          fontSize: "48px",
          marginTop: "30px",
        }}
      >
        Bundles
      </h1>

      <div
        style={{
          background: "#111827",
          padding: "32px",
          borderRadius: "24px",
          maxWidth: "500px",
          marginTop: "30px",
        }}
      >
        <p style={{ color: "#94a3b8" }}>
          Configuration du widget Bundles
        </p>

        <button
          style={{
            width: "100%",
            marginTop: "24px",
            background: "#7c3aed",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "14px",
            fontWeight: "bold",
          }}
        >
          Bientôt disponible
        </button>
      </div>
    </main>
  )
}