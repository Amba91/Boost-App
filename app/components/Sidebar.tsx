"use client"

const items = [
  ["dashboard", "Dashboard", "📊"],
  ["widgets", "Widgets", "🧩"],
  ["analytics", "Analytics", "📈"],
  ["ai", "Boost AI", "🤖"],
  ["shopify", "Shopify", "🛒"],
  ["owner", "Owner", "👑"],
  ["billing", "Billing", "💳"],
]

export default function Sidebar({
  page,
  setPage,
}: {
  page: string
  setPage: (page: string) => void
}) {
  return (
    <aside style={styles.sidebar}>
      <h1 style={styles.logo}>🚀 BOOST</h1>
      <p style={styles.sub}>Shopify SaaS</p>

      <nav style={styles.nav}>
        {items.map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            style={{
              ...styles.item,
              background: page === id ? "#7c3aed" : "transparent",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "260px",
    background: "#020617",
    borderRight: "1px solid #1e293b",
    padding: "24px",
  },
  logo: { color: "white", margin: 0 },
  sub: { color: "#94a3b8", marginBottom: "34px" },
  nav: { display: "grid", gap: "12px" },
  item: {
    color: "white",
    border: "1px solid #1e293b",
    padding: "14px",
    borderRadius: "14px",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: "bold",
  },
}