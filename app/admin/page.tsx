"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type OwnerStats = {
  stores: number
  mrr: number
  arr: number
  trials: number
  lifetimeDeals: number
}

type ShopConnection = {
  shop: string
  created_at?: string
  updated_at?: string
}

const menu = [
  { label: "Accueil admin", href: "#overview" },
  { label: "Boutiques", href: "#stores" },
  { label: "Abonnements", href: "#plans" },
  { label: "Revenus", href: "#revenue" },
  { label: "Widgets", href: "#widgets" },
  { label: "Paramètres", href: "#settings" },
]

const widgetGroups = [
  { label: "Prêts", value: 3, color: "#22c55e", items: "Reviews, Tracking, Boost Mail" },
  { label: "À finaliser", value: 5, color: "#f59e0b", items: "Upsell, Sales Popups, Sticky Cart, Free Shipping, Recently Viewed" },
  { label: "Bientôt", value: 6, color: "#94a3b8", items: "Bundles, Wishlist, Trust Badges, Announcement, Countdown, Related Products" },
]

const planRows = [
  { name: "Free", stores: 0, mrr: 0, note: "Pour tester Boost" },
  { name: "Starter", stores: 0, mrr: 0, note: "Offre de lancement recommandée" },
  { name: "Pro", stores: 0, mrr: 0, note: "Quand Boost sera multi-boutique" },
]

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function guessLocation(shop: string) {
  if (shop.includes("kiidiiz") || shop.includes("hy4nf1")) return "France"
  return "À détecter"
}

export default function BoostAdminPage() {
  const [stats, setStats] = useState<OwnerStats>({
    stores: 0,
    mrr: 0,
    arr: 0,
    trials: 0,
    lifetimeDeals: 0,
  })
  const [connections, setConnections] = useState<ShopConnection[]>([])

  const connectedStores = connections.length
  const expectedMrr = useMemo(() => {
    const starterPrice = 29
    return Math.max(connectedStores, stats.stores || 0) * starterPrice
  }, [connectedStores, stats.stores])

  async function loadAdminData() {
    try {
      const [statsRes, shopsRes] = await Promise.all([
        fetch("/api/owner/stats", { cache: "no-store" }),
        fetch("/api/debug/shop-connections", { cache: "no-store" }),
      ])
      const statsData = await statsRes.json()
      const shopsData = await shopsRes.json()

      if (statsData.stats) setStats(statsData.stats)
      if (shopsData.success) setConnections(shopsData.connections || [])
    } catch (error) {
      console.error("BOOST ADMIN LOAD ERROR:", error)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  return (
    <main style={styles.shell}>
      <aside style={styles.sidebar}>
        <Link href="/" style={styles.brand}>
          <img src="/logo.png" alt="Boost" style={styles.logo} />
          <div>
            <strong>Boost Admin</strong>
            <span>Owner cockpit</span>
          </div>
        </Link>

        <nav style={styles.nav}>
          {menu.map((item) => (
            <a key={item.href} href={item.href} style={styles.navItem}>
              {item.label}
            </a>
          ))}
        </nav>

        <div style={styles.sidebarNote}>
          <strong>Mode MVP</strong>
          <span>À sécuriser avec un vrai login owner avant commercialisation.</span>
        </div>
      </aside>

      <section style={styles.content}>
        <header style={styles.header} id="overview">
          <div>
            <span style={styles.eyebrow}>Pilotage Boost</span>
            <h1 style={styles.title}>Tableau de bord propriétaire</h1>
            <p style={styles.lead}>
              Suis l’évolution de Boost : boutiques connectées, widgets prêts,
              abonnements, revenus attendus et prochaines priorités produit.
            </p>
          </div>
          <Link href="/" style={styles.headerButton}>
            Voir l’espace marchand
          </Link>
        </header>

        <section style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <span>Boutiques connectées</span>
            <strong>{connectedStores || stats.stores}</strong>
            <small>Installations connues par Boost</small>
          </div>
          <div style={styles.kpiCard}>
            <span>Essais actifs</span>
            <strong>{stats.trials}</strong>
            <small>À brancher sur Stripe/Shopify Billing</small>
          </div>
          <div style={styles.kpiCard}>
            <span>MRR attendu</span>
            <strong>{formatEuro(expectedMrr || stats.mrr)}</strong>
            <small>Simulation à 29 €/mois par boutique</small>
          </div>
          <div style={styles.kpiCard}>
            <span>ARR potentiel</span>
            <strong>{formatEuro((expectedMrr || stats.mrr) * 12)}</strong>
            <small>Projection annuelle simple</small>
          </div>
        </section>

        <section style={styles.twoColumns}>
          <div style={styles.card} id="stores">
            <div style={styles.cardHeader}>
              <div>
                <span style={styles.eyebrow}>Boutiques</span>
                <h2>Boutiques qui utilisent Boost</h2>
              </div>
              <span style={styles.badge}>{connectedStores} détectée(s)</span>
            </div>

            {connections.length === 0 ? (
              <p style={styles.muted}>
                Aucune boutique détectée dans la base pour le moment.
              </p>
            ) : (
              <div style={styles.storeList}>
                {connections.map((store) => (
                  <div key={store.shop} style={styles.storeRow}>
                    <div>
                      <strong>{store.shop}</strong>
                      <span>{guessLocation(store.shop)} · dernière activité {store.updated_at ? new Date(store.updated_at).toLocaleDateString("fr-FR") : "N/A"}</span>
                    </div>
                    <span style={styles.liveBadge}>Live</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.card} id="plans">
            <div style={styles.cardHeader}>
              <div>
                <span style={styles.eyebrow}>Abonnements</span>
                <h2>Plans à suivre</h2>
              </div>
              <span style={styles.badge}>À connecter</span>
            </div>

            <div style={styles.table}>
              {planRows.map((plan) => (
                <div key={plan.name} style={styles.tableRow}>
                  <strong>{plan.name}</strong>
                  <span>{plan.stores} boutique(s)</span>
                  <span>{formatEuro(plan.mrr)}/mois</span>
                  <small>{plan.note}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.twoColumns}>
          <div style={styles.card} id="widgets">
            <div style={styles.cardHeader}>
              <div>
                <span style={styles.eyebrow}>Produit</span>
                <h2>État des widgets</h2>
              </div>
            </div>

            <div style={styles.widgetGrid}>
              {widgetGroups.map((group) => (
                <div key={group.label} style={styles.widgetCard}>
                  <strong style={{ color: group.color }}>{group.value}</strong>
                  <span>{group.label}</span>
                  <small>{group.items}</small>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card} id="revenue">
            <div style={styles.cardHeader}>
              <div>
                <span style={styles.eyebrow}>Revenus</span>
                <h2>Prévision simple</h2>
              </div>
            </div>
            <div style={styles.revenueBox}>
              <span>Si 100 boutiques activent Starter à 29 €/mois :</span>
              <strong>{formatEuro(2900)}/mois</strong>
              <small>{formatEuro(34800)} par an, avant frais et churn.</small>
            </div>
          </div>
        </section>

        <section style={styles.card} id="settings">
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.eyebrow}>Paramètres</span>
              <h2>Réglages Boost</h2>
            </div>
            <span style={styles.badge}>Préparé</span>
          </div>

          <div style={styles.settingsGrid}>
            <label style={styles.label}>
              Langue de l’interface
              <select style={styles.input} defaultValue="fr">
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
            </label>
            <label style={styles.label}>
              Devise par défaut
              <select style={styles.input} defaultValue="EUR">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label style={styles.label}>
              Mode commercial
              <select style={styles.input} defaultValue="private">
                <option value="private">Privé / Kiidiiz</option>
                <option value="beta">Bêta marchands</option>
                <option value="public">Public Shopify App Store</option>
              </select>
            </label>
          </div>
        </section>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    background: "#050816",
    color: "white",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    position: "sticky",
    top: 0,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    padding: 24,
    background: "#020617",
    borderRight: "1px solid #1f2937",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "white",
    textDecoration: "none",
  },
  logo: { width: 54, height: 54, borderRadius: 14 },
  nav: { display: "grid", gap: 10 },
  navItem: {
    color: "#cbd5e1",
    textDecoration: "none",
    padding: "13px 14px",
    borderRadius: 14,
    background: "#0f172a",
    border: "1px solid #1f2937",
    fontWeight: 800,
  },
  sidebarNote: {
    marginTop: "auto",
    display: "grid",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    background: "#111827",
    color: "#94a3b8",
    lineHeight: 1.45,
  },
  content: { padding: 36, display: "grid", gap: 22 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    padding: 28,
    borderRadius: 28,
    background: "linear-gradient(135deg, #111827, #1e1b4b)",
    border: "1px solid #312e81",
  },
  eyebrow: {
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: 1.7,
    fontSize: 12,
    fontWeight: 900,
  },
  title: { margin: "10px 0", fontSize: 42 },
  lead: { margin: 0, color: "#cbd5e1", lineHeight: 1.55, maxWidth: 820 },
  headerButton: {
    flexShrink: 0,
    color: "white",
    textDecoration: "none",
    background: "#7c3aed",
    padding: "14px 18px",
    borderRadius: 14,
    fontWeight: 900,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 16,
  },
  kpiCard: {
    display: "grid",
    gap: 8,
    padding: 22,
    borderRadius: 22,
    background: "#111827",
    border: "1px solid #1f2937",
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 22,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    background: "#111827",
    border: "1px solid #1f2937",
  },
  cardHeader: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  badge: {
    borderRadius: 999,
    padding: "8px 11px",
    background: "#172554",
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 900,
  },
  muted: { color: "#94a3b8", lineHeight: 1.5 },
  storeList: { display: "grid", gap: 12 },
  storeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    background: "#020617",
    border: "1px solid #1f2937",
  },
  liveBadge: {
    borderRadius: 999,
    padding: "6px 10px",
    background: "#052e16",
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: 900,
  },
  table: { display: "grid", gap: 10 },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    background: "#020617",
    color: "#cbd5e1",
  },
  widgetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },
  widgetCard: {
    display: "grid",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    background: "#020617",
    border: "1px solid #1f2937",
  },
  revenueBox: {
    display: "grid",
    gap: 10,
    padding: 18,
    borderRadius: 18,
    background: "#020617",
    border: "1px solid #1f2937",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  label: { display: "grid", gap: 8, color: "#e5e7eb", fontWeight: 800 },
  input: {
    width: "100%",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "13px 14px",
    background: "#020617",
    color: "white",
    font: "inherit",
  },
}
