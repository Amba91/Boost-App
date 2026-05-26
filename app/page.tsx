"use client"

import Link from "next/link"

const widgets = [
  {
    name: "Sticky Cart",
    slug: "sticky-cart",
  },
  {
    name: "Sales Popups",
    slug: "sales-popups",
  },
  {
    name: "Wishlist",
    slug: "wishlist",
  },
  {
    name: "Reviews",
    slug: "reviews",
  },
  {
    name: "Bundles",
    slug: "bundles",
  },
  {
    name: "Tracking",
    slug: "tracking",
  },
]

export default function HomePage() {
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
          fontSize: "58px",
          fontWeight: "bold",
          marginBottom: "50px",
        }}
      >
        🚀 BOOST
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: "24px",
        }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.slug}
            style={{
              background: "#111827",
              borderRadius: "24px",
              padding: "30px",
            }}
          >
            <h2
              style={{
                fontSize: "30px",
                marginBottom: "12px",
              }}
            >
              {widget.name}
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: "24px",
              }}
            >
              Widget Shopify intelligent.
            </p>

            <Link href={`/widgets/${widget.slug}`}>
              <button
                style={{
                  width: "100%",
                  background: "#7c3aed",
                  color: "white",
                  border: "none",
                  padding: "16px",
                  borderRadius: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Configurer
              </button>
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}