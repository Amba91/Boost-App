"use client"

import { useState } from "react"

export default function HomePage() {
  const [page, setPage] = useState("dashboard")

  const menu = [
    ["dashboard", "Dashboard", "📊"],
    ["widgets", "Widgets", "🧩"],
    ["analytics", "Analytics", "📈"],
    ["ai", "Boost AI", "🤖"],
    ["shopify", "Shopify Connect", "🛒"],
    ["owner", "Owner", "👑"],
    ["billing", "Billing", "💳"],
    ["settings", "Settings", "⚙️"],
  ]

  return (
    <main style={styles.app}>
      <aside style={styles.sidebar}>
        <h1 style={styles.logo}>🚀 BOOST</h1>
        <p style={styles.muted}>Shopify AI Suite</p>

        <nav style={styles.nav}>
          {menu.map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              style={{
                ...styles.navButton,
                background: page === id ? "#7c3aed" : "transparent",
                borderColor: page === id ? "#7c3aed" : "#1e293b",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </nav>

        <div style={styles.proBox}>
          <p style={{ margin: 0, fontWeight: "bold" }}>Boost Pro</p>
          <p style={{ margin: "8px 0 0", color: "#ddd6fe" }}>
            Accès lifetime pour Kiidiiz
          </p>
        </div>
      </aside>

      <section style={styles.content}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>{getPageTitle(page)}</h2>
            <p style={styles.muted}>Boutique : hy4nf1-dt.myshopify.com</p>
          </div>

          <div style={styles.topActions}>
            <div style={styles.connectedBadge}>● Kiidiiz connected</div>
            <button style={styles.iconButton}>🔔</button>
            <div style={styles.profile}>
              <div style={styles.avatar}>A</div>
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>Amadou</p>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px" }}>
                  Owner
                </p>
              </div>
            </div>
          </div>
        </div>

        {page === "dashboard" && <Dashboard />}
        {page === "widgets" && <Widgets />}
        {page === "analytics" && <Analytics />}
        {page === "ai" && <AI />}
        {page === "shopify" && <ShopifyConnect />}
        {page === "owner" && <Owner />}
        {page === "billing" && <Billing />}
        {page === "settings" && <Settings />}
      </section>
    </main>
  )
}

function getPageTitle(page: string) {
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    widgets: "Widgets",
    analytics: "Analytics",
    ai: "Boost AI",
    shopify: "Shopify Connect",
    owner: "Owner",
    billing: "Billing",
    settings: "Settings",
  }

  return titles[page] || "Dashboard"
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={styles.card}>{children}</div>
}

function Dashboard() {
  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <div style={styles.statsGrid}>
        {[
          ["Revenus", "18 945€", "+28%"],
          ["Commandes", "1 259", "+22%"],
          ["Conversion", "3.62%", "+18%"],
          ["AOV", "65€", "+7%"],
        ].map(([label, value, growth]) => (
          <Card key={label}>
            <p style={styles.muted}>{label}</p>
            <h3 style={styles.statValue}>{value}</h3>
            <p style={styles.green}>{growth}</p>
          </Card>
        ))}
      </div>

      <div style={styles.twoColumns}>
        <Card>
          <h3>Widgets actifs</h3>
          {[
            "Sticky Add To Cart",
            "Sales Popups",
            "Wishlist",
            "Reviews",
            "Order Tracking",
          ].map((item) => (
            <Row key={item} label={item} value="Actif" />
          ))}
        </Card>

        <Card>
          <h3>🤖 Boost AI</h3>
          <p style={styles.paragraph}>
            Votre boutique pourrait générer entre 2 156€ et 3 421€ de revenus
            supplémentaires avec les optimisations recommandées.
          </p>
          <button style={styles.secondaryButton}>Voir les insights IA</button>
        </Card>
      </div>
    </div>
  )
}

async function installStickyCart() {
  try {
    const response = await fetch("/api/widgets/sticky-cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shop: "hy4nf1-dt.myshopify.com",
      }),
    })

    const data = await response.json()

    if (data.success) {
      alert("✅ Sticky Cart installé sur Shopify")
    } else {
      alert("❌ " + (data.error || "installation impossible"))
    }
  } catch (error) {
    console.error(error)
    alert("❌ Impossible d’installer le Sticky Cart")
  }
}

function Widgets() {
  return (
    <div style={styles.threeColumns}>
      <Card>
        <h3>Sticky Cart</h3>
        <p style={styles.muted}>Widget actif et personnalisable.</p>
        <button style={styles.primaryButton} onClick={installStickyCart}>
          Installer Sticky Cart
        </button>
      </Card>

      {["Sales Popups", "Wishlist", "Reviews", "Bundles", "Tracking"].map(
        (item) => (
          <Card key={item}>
            <h3>{item}</h3>
            <p style={styles.muted}>Widget actif et personnalisable.</p>
            <button style={styles.primaryButton}>Configurer</button>
          </Card>
        )
      )}
    </div>
  )
}

function Analytics() {
  return (
    <Card>
      <h3>📈 Analytics</h3>
      <p style={styles.muted}>Suivi des clics, conversions et revenus générés.</p>

      <div style={styles.chart}>
        {[40, 70, 55, 90, 75, 110, 130].map((height, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height,
              borderRadius: "14px 14px 0 0",
              background: "linear-gradient(180deg,#8b5cf6,#2563eb)",
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
      <h3>🤖 Assistant Boost AI</h3>
      <p style={styles.muted}>
        Recommandations intelligentes pour augmenter les ventes.
      </p>

      {[
        "Active Sticky Cart sur toutes les pages produits.",
        "Ajoute un bundle sur tes 3 produits les plus vendus.",
        "Affiche les avis clients au-dessus du bouton achat.",
      ].map((item) => (
        <div key={item} style={styles.aiItem}>
          ✨ {item}
        </div>
      ))}
    </Card>
  )
}

function ShopifyConnect() {
  function connectShopify() {
    const url =
      "https://boost-app-9e6w.vercel.app/api/shopify/install?shop=hy4nf1-dt.myshopify.com"

    if (window.top) {
      window.top.location.href = url
    } else {
      window.location.href = url
    }
  }

  return (
    <div style={styles.twoColumns}>
      <Card>
        <h3>🛒 Shopify Connect</h3>
        <p style={styles.paragraph}>
          Connecte Boost à ta boutique Shopify pour activer les widgets, les
          analytics, les webhooks et le billing.
        </p>

        <div style={{ marginTop: "24px" }}>
          <label>Nom de la boutique Shopify</label>
          <input defaultValue="hy4nf1-dt.myshopify.com" style={styles.input} />
        </div>

        <button
          onClick={connectShopify}
          style={{ ...styles.primaryButton, marginTop: "24px" }}
        >
          Connecter Shopify
        </button>
      </Card>

      <Card>
        <h3>✅ Statut de connexion</h3>
        {[
          ["OAuth Shopify", "Prêt"],
          ["API Key", "Configurée"],
          ["Redirect URL", "Configurée"],
          ["Webhooks", "À connecter"],
          ["Kiidiiz", "Lifetime Access"],
        ].map(([label, status]) => (
          <Row key={label} label={label} value={status} />
        ))}
      </Card>
    </div>
  )
}

function Owner() {
  return (
    <div style={styles.twoColumns}>
      <Card>
        <h3>👑 Owner Dashboard</h3>
        <p style={styles.muted}>Espace réservé au propriétaire de Boost.</p>

        <div style={styles.ownerStats}>
          {[
            ["MRR", "8 920€"],
            ["Stores", "284"],
            ["Lifetime Deals", "12"],
            ["Trials", "62"],
          ].map(([label, value]) => (
            <div key={label} style={styles.miniCard}>
              <p style={styles.muted}>{label}</p>
              <h3>{value}</h3>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3>🎁 Lifetime Access Manager</h3>
        <p style={styles.paragraph}>
          Tu peux offrir un accès Pro à vie à n’importe quelle boutique Shopify.
        </p>

        <div style={{ marginTop: "24px" }}>
          <label>Boutique Shopify</label>
          <input placeholder="exemple.myshopify.com" style={styles.input} />
        </div>

        <button style={styles.greenButton}>Offrir accès à vie</button>
      </Card>
    </div>
  )
}

function Billing() {
  return (
    <div style={styles.threeColumns}>
      {[
        ["Starter", "19€"],
        ["Pro", "49€"],
        ["Lifetime", "299€"],
      ].map(([plan, price]) => (
        <Card key={plan}>
          <h3>{plan}</h3>
          <h2>{price}</h2>
          <p style={styles.muted}>Plan Boost</p>
        </Card>
      ))}
    </div>
  )
}

function Settings() {
  return (
    <Card>
      <h3>⚙️ Settings</h3>
      <p style={styles.muted}>Configuration globale de Boost.</p>

      <div style={{ marginTop: "24px" }}>
        <label>Nom de l’application</label>
        <input value="Boost" readOnly style={styles.input} />
      </div>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span>{label}</span>
      <span style={styles.green}>{value}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    fontFamily: "Arial, sans-serif",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
  },
  sidebar: {
    background: "#0f172a",
    borderRight: "1px solid #1e293b",
    padding: "28px",
  },
  logo: {
    fontSize: "32px",
    margin: 0,
  },
  muted: {
    color: "#94a3b8",
    margin: 0,
  },
  nav: {
    display: "grid",
    gap: "12px",
  },
  navButton: {
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
  proBox: {
    marginTop: "40px",
    background: "linear-gradient(135deg,#7c3aed,#2563eb)",
    padding: "20px",
    borderRadius: "20px",
  },
  content: {
    padding: "32px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "24px",
    padding: "20px 24px",
    marginBottom: "32px",
  },
  topActions: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  connectedBadge: {
    background: "rgba(34,197,94,0.12)",
    color: "#22c55e",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "14px",
  },
  iconButton: {
    background: "#111827",
    color: "white",
    border: "1px solid #1e293b",
    padding: "12px 14px",
    borderRadius: "14px",
    cursor: "pointer",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "10px 14px",
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#7c3aed,#2563eb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  title: {
    fontSize: "36px",
    margin: 0,
  },
  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "24px",
    padding: "24px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  statValue: {
    fontSize: "30px",
    margin: "12px 0",
  },
  green: {
    color: "#22c55e",
    margin: 0,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: "24px",
  },
  threeColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },
  paragraph: {
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  primaryButton: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#8b5cf6",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  greenButton: {
    marginTop: "24px",
    background: "#22c55e",
    color: "black",
    border: "none",
    padding: "14px 20px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 0",
    borderBottom: "1px solid #1e293b",
  },
  chart: {
    height: "260px",
    display: "flex",
    alignItems: "end",
    gap: "14px",
    marginTop: "24px",
  },
  aiItem: {
    background: "#111827",
    padding: "16px",
    borderRadius: "16px",
    marginTop: "14px",
  },
  input: {
    display: "block",
    marginTop: "10px",
    width: "100%",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
  },
  ownerStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginTop: "24px",
  },
  miniCard: {
    background: "#111827",
    padding: "20px",
    borderRadius: "18px",
    border: "1px solid #1e293b",
  },
}