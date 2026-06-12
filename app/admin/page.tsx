"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type AdminSection = "overview" | "stores" | "plans" | "revenue" | "widgets" | "settings"

type OwnerStats = {
  stores: number
  mrr: number
  arr: number
  trials: number
  lifetimeDeals: number
}

type StoreAccess = {
  shop: string
  created_at?: string
  updated_at?: string
  plan: string
  subscription_status: string
  monthly_price: string | number
  lifetime_access: boolean
  billing_active: boolean
  note: string
}

const menu: Array<{ id: AdminSection; label: string; hint: string }> = [
  { id: "overview", label: "Accueil admin", hint: "Vue globale" },
  { id: "stores", label: "Boutiques", hint: "Accès par boutique" },
  { id: "plans", label: "Abonnements", hint: "Prix et statuts" },
  { id: "revenue", label: "Revenus", hint: "MRR, ARR, projections" },
  { id: "widgets", label: "Widgets", hint: "Prêt, à finaliser, bientôt" },
  { id: "settings", label: "Paramètres", hint: "Langue et mode Boost" },
]

const widgetGroups = [
  { label: "Prêts", value: 3, color: "#22c55e", items: "Reviews, Tracking, Boost Mail" },
  { label: "À finaliser", value: 5, color: "#f59e0b", items: "Upsell, Sales Popups, Sticky Cart, Free Shipping, Recently Viewed" },
  { label: "Bientôt", value: 6, color: "#94a3b8", items: "Bundles, Wishlist, Trust Badges, Announcement, Countdown, Related Products" },
]

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatDate(value?: string) {
  if (!value) return "N/A"
  return new Date(value).toLocaleDateString("fr-FR")
}

function guessLocation(shop: string) {
  if (shop.includes("kiidiiz") || shop.includes("hy4nf1")) return "France"
  return "À détecter"
}

function statusLabel(store: StoreAccess) {
  if (store.lifetime_access) return "Accès à vie"
  if (!store.billing_active) return "Suspendu"
  if (store.subscription_status === "trial") return "Essai"
  return "Actif"
}

export default function BoostAdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview")
  const [stats, setStats] = useState<OwnerStats>({
    stores: 0,
    mrr: 0,
    arr: 0,
    trials: 0,
    lifetimeDeals: 0,
  })
  const [stores, setStores] = useState<StoreAccess[]>([])
  const [manualShop, setManualShop] = useState("")
  const [manualPrice, setManualPrice] = useState("29")
  const [savingShop, setSavingShop] = useState("")
  const [message, setMessage] = useState("")

  const connectedStores = stores.length
  const activeStores = stores.filter((store) => store.billing_active || store.lifetime_access)
  const lifetimeStores = stores.filter((store) => store.lifetime_access)
  const expectedMrr = useMemo(
    () =>
      stores.reduce((total, store) => {
        if (!store.billing_active || store.lifetime_access) return total
        return total + Number(store.monthly_price || 0)
      }, 0),
    [stores]
  )

  async function loadAdminData() {
    try {
      const [statsRes, storesRes] = await Promise.all([
        fetch("/api/owner/stats", { cache: "no-store" }),
        fetch("/api/owner/store-access", { cache: "no-store" }),
      ])
      const statsData = await statsRes.json()
      const storesData = await storesRes.json()

      if (statsData.stats) setStats(statsData.stats)
      if (storesData.success) setStores(storesData.stores || [])
    } catch (error) {
      console.error("BOOST ADMIN LOAD ERROR:", error)
    }
  }

  async function updateStoreAccess(shop: string, patch: Partial<StoreAccess>) {
    const current = stores.find((store) => store.shop === shop)
    if (!current) return
    setSavingShop(shop)
    setMessage("")
    try {
      const res = await fetch("/api/owner/store-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, ...patch }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.error || "Action impossible.")
        return
      }
      setStores((rows) =>
        rows.map((store) => (store.shop === shop ? { ...store, ...data.store } : store))
      )
      setMessage("Boutique mise à jour.")
    } catch {
      setMessage("Action impossible.")
    } finally {
      setSavingShop("")
    }
  }

  async function addManualStore() {
    if (!manualShop.trim()) return
    setSavingShop(manualShop)
    setMessage("")
    try {
      const res = await fetch("/api/owner/store-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: manualShop,
          plan: "Starter",
          subscription_status: "active",
          monthly_price: Number(manualPrice || 0),
          lifetime_access: Number(manualPrice || 0) === 0,
          billing_active: true,
          note: "Ajout manuel depuis Admin Boost",
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.error || "Ajout impossible.")
        return
      }
      setManualShop("")
      setStores((rows) => {
        const withoutDuplicate = rows.filter((store) => store.shop !== data.store.shop)
        return [data.store, ...withoutDuplicate]
      })
      setMessage("Boutique ajoutée.")
    } catch {
      setMessage("Ajout impossible.")
    } finally {
      setSavingShop("")
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
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                ...styles.navItem,
                ...(activeSection === item.id ? styles.navItemActive : {}),
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </nav>

        <div style={styles.sidebarNote}>
          <strong>Admin uniquement</strong>
          <span>
            Ces contrôles sont pour toi. Le marchand garde un espace simple avec
            seulement ses widgets et réglages.
          </span>
        </div>
      </aside>

      <section style={styles.content}>
        {activeSection === "overview" && (
          <>
            <Header
              eyebrow="Pilotage Boost"
              title="Tableau de bord propriétaire"
              lead="Suis l’évolution de Boost : boutiques connectées, abonnements, revenus attendus et prochaines priorités produit."
            />

            <section style={styles.kpiGrid}>
              <Kpi title="Boutiques suivies" value={String(connectedStores || stats.stores)} note="Installations et accès manuels" />
              <Kpi title="Boutiques actives" value={String(activeStores.length)} note="Actives ou accès à vie" />
              <Kpi title="Accès à vie" value={String(lifetimeStores.length)} note="Offerts par l’admin" />
              <Kpi title="MRR attendu" value={formatEuro(expectedMrr || stats.mrr)} note="Hors accès à vie" />
            </section>

            <section style={styles.twoColumns}>
              <div style={styles.card}>
                <h2>Prochaines priorités</h2>
                <div style={styles.timeline}>
                  <Step number="1" title="AliExpress produits" text="Importer un produit fournisseur puis préparer la création Shopify." />
                  <Step number="2" title="Factures pro" text="Générer des PDF personnalisables pour les commandes." />
                  <Step number="3" title="Multi-boutiques propre" text="Isoler chaque marchand : réglages, avis, mails, abonnements." />
                </div>
              </div>
              <div style={styles.card}>
                <h2>Résumé commercial</h2>
                <div style={styles.revenueBox}>
                  <span>Si 100 boutiques activent Starter à 29 €/mois :</span>
                  <strong>{formatEuro(2900)}/mois</strong>
                  <small>{formatEuro(34800)} par an, avant frais et churn.</small>
                </div>
              </div>
            </section>
          </>
        )}

        {activeSection === "stores" && (
          <>
            <Header
              eyebrow="Boutiques"
              title="Accès par boutique"
              lead="Ajoute une boutique, offre un accès à vie, suspend un abonnement ou applique un prix spécial."
            />
            <StoreControls
              manualShop={manualShop}
              manualPrice={manualPrice}
              setManualShop={setManualShop}
              setManualPrice={setManualPrice}
              addManualStore={addManualStore}
              saving={Boolean(savingShop)}
            />
            <StoreList
              stores={stores}
              savingShop={savingShop}
              updateStoreAccess={updateStoreAccess}
            />
          </>
        )}

        {activeSection === "plans" && (
          <>
            <Header
              eyebrow="Abonnements"
              title="Plans, prix et accès"
              lead="Gère les abonnements sans compliquer l’espace marchand. Plus tard, cette zone sera reliée à Shopify Billing ou Stripe."
            />
            <section style={styles.kpiGrid}>
              <Kpi title="Starter conseillé" value="29 €" note="Prix de lancement simple" />
              <Kpi title="Pro conseillé" value="49 €" note="Quand factures + fournisseurs seront prêts" />
              <Kpi title="Lifetime" value="0 €" note="Accès offert par toi" />
              <Kpi title="Prix custom" value="Libre" note="Par boutique" />
            </section>
            <StoreList
              stores={stores}
              savingShop={savingShop}
              updateStoreAccess={updateStoreAccess}
            />
          </>
        )}

        {activeSection === "revenue" && (
          <>
            <Header
              eyebrow="Revenus"
              title="CA attendu et prévisions"
              lead="Ce tableau te donne une lecture simple du potentiel. Les vrais chiffres viendront ensuite de Shopify Billing ou Stripe."
            />
            <section style={styles.kpiGrid}>
              <Kpi title="MRR calculé" value={formatEuro(expectedMrr)} note="Somme des abonnements actifs" />
              <Kpi title="ARR calculé" value={formatEuro(expectedMrr * 12)} note="Projection annuelle" />
              <Kpi title="Objectif 100 boutiques" value={formatEuro(2900)} note="À 29 €/mois" />
              <Kpi title="Objectif 500 boutiques" value={formatEuro(14500)} note="À 29 €/mois" />
            </section>
          </>
        )}

        {activeSection === "widgets" && (
          <>
            <Header
              eyebrow="Produit"
              title="État des widgets"
              lead="Garde en avant les fonctions vendables et évite de montrer aux marchands ce qui n’est pas encore prêt."
            />
            <section style={styles.widgetGrid}>
              {widgetGroups.map((group) => (
                <div key={group.label} style={styles.widgetCard}>
                  <strong style={{ color: group.color }}>{group.value}</strong>
                  <span>{group.label}</span>
                  <small>{group.items}</small>
                </div>
              ))}
            </section>
          </>
        )}

        {activeSection === "settings" && (
          <>
            <Header
              eyebrow="Paramètres"
              title="Réglages Boost"
              lead="Préparation des préférences owner : langue, devise, mode commercial et sécurité."
            />
            <section style={styles.card}>
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
              <p style={styles.warning}>
                Important : avant commercialisation, on ajoutera un vrai login owner
                pour protéger cette page admin.
              </p>
            </section>
          </>
        )}

        {message && <p style={styles.message}>{message}</p>}
      </section>
    </main>
  )
}

function Header({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: string
  lead: string
}) {
  return (
    <header style={styles.header}>
      <div>
        <span style={styles.eyebrow}>{eyebrow}</span>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.lead}>{lead}</p>
      </div>
      <Link href="/" style={styles.headerButton}>
        Espace marchand
      </Link>
    </header>
  )
}

function Kpi({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div style={styles.kpiCard}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div style={styles.step}>
      <span style={styles.stepNumber}>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

function StoreControls({
  manualShop,
  manualPrice,
  setManualShop,
  setManualPrice,
  addManualStore,
  saving,
}: {
  manualShop: string
  manualPrice: string
  setManualShop: (value: string) => void
  setManualPrice: (value: string) => void
  addManualStore: () => void
  saving: boolean
}) {
  return (
    <section style={styles.card}>
      <h2>Ajouter ou offrir un accès</h2>
      <div style={styles.settingsGrid}>
        <label style={styles.label}>
          Domaine boutique
          <input
            style={styles.input}
            placeholder="ex. boutique.myshopify.com"
            value={manualShop}
            onChange={(event) => setManualShop(event.target.value)}
          />
        </label>
        <label style={styles.label}>
          Prix mensuel
          <input
            style={styles.input}
            type="number"
            min={0}
            value={manualPrice}
            onChange={(event) => setManualPrice(event.target.value)}
          />
        </label>
      </div>
      <button onClick={addManualStore} disabled={saving} style={styles.primaryButton}>
        {saving ? "Enregistrement..." : "Ajouter / mettre à jour"}
      </button>
      <p style={styles.muted}>
        Mets 0 € pour offrir un accès à vie. Cette action reste dans Boost Admin
        et ne complique pas l’espace marchand.
      </p>
    </section>
  )
}

function StoreList({
  stores,
  savingShop,
  updateStoreAccess,
}: {
  stores: StoreAccess[]
  savingShop: string
  updateStoreAccess: (shop: string, patch: Partial<StoreAccess>) => void
}) {
  if (!stores.length) {
    return (
      <section style={styles.card}>
        <p style={styles.muted}>Aucune boutique détectée pour le moment.</p>
      </section>
    )
  }

  return (
    <section style={styles.storeList}>
      {stores.map((store) => {
        const saving = savingShop === store.shop
        return (
          <div key={store.shop} style={styles.storeCard}>
            <div style={styles.storeTop}>
              <div>
                <strong>{store.shop}</strong>
                <span>
                  {guessLocation(store.shop)} · dernière activité {formatDate(store.updated_at)}
                </span>
              </div>
              <span
                style={{
                  ...styles.statusBadge,
                  background: store.lifetime_access
                    ? "#172554"
                    : store.billing_active
                    ? "#052e16"
                    : "#451a03",
                  color: store.lifetime_access
                    ? "#bfdbfe"
                    : store.billing_active
                    ? "#bbf7d0"
                    : "#fde68a",
                }}
              >
                {statusLabel(store)}
              </span>
            </div>

            <div style={styles.storeMeta}>
              <span>Plan : {store.plan}</span>
              <span>Prix : {formatEuro(Number(store.monthly_price || 0))}/mois</span>
              <span>Note : {store.note || "Aucune"}</span>
            </div>

            <div style={styles.actionsRow}>
              <button
                disabled={saving}
                onClick={() =>
                  updateStoreAccess(store.shop, {
                    plan: "Pro",
                    monthly_price: 0,
                    lifetime_access: true,
                    billing_active: true,
                    subscription_status: "lifetime",
                    note: "Accès à vie offert par l’admin",
                  })
                }
                style={styles.smallButton}
              >
                Offrir accès à vie
              </button>
              <button
                disabled={saving}
                onClick={() =>
                  updateStoreAccess(store.shop, {
                    billing_active: !store.billing_active,
                    lifetime_access: false,
                    subscription_status: store.billing_active ? "paused" : "active",
                    note: store.billing_active ? "Abonnement suspendu" : "Abonnement réactivé",
                  })
                }
                style={styles.smallButton}
              >
                {store.billing_active ? "Suspendre" : "Réactiver"}
              </button>
              <button
                disabled={saving}
                onClick={() =>
                  updateStoreAccess(store.shop, {
                    plan: "Starter",
                    monthly_price: 29,
                    lifetime_access: false,
                    billing_active: true,
                    subscription_status: "active",
                    note: "Prix Starter appliqué",
                  })
                }
                style={styles.smallButton}
              >
                Starter 29 €
              </button>
              <button
                disabled={saving}
                onClick={() =>
                  updateStoreAccess(store.shop, {
                    plan: "Pro",
                    monthly_price: 49,
                    lifetime_access: false,
                    billing_active: true,
                    subscription_status: "active",
                    note: "Prix Pro appliqué",
                  })
                }
                style={styles.smallButton}
              >
                Pro 49 €
              </button>
            </div>
          </div>
        )
      })}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "290px minmax(0, 1fr)",
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
    display: "grid",
    gap: 4,
    width: "100%",
    color: "#cbd5e1",
    textAlign: "left",
    padding: "13px 14px",
    borderRadius: 14,
    background: "#0f172a",
    border: "1px solid #1f2937",
    cursor: "pointer",
  },
  navItemActive: {
    color: "white",
    background: "#1e1b4b",
    borderColor: "#7c3aed",
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
  muted: { color: "#94a3b8", lineHeight: 1.5 },
  storeList: { display: "grid", gap: 14 },
  storeCard: {
    display: "grid",
    gap: 14,
    padding: 18,
    borderRadius: 20,
    background: "#111827",
    border: "1px solid #1f2937",
  },
  storeTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  storeMeta: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    color: "#cbd5e1",
  },
  statusBadge: {
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 900,
  },
  actionsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
  },
  smallButton: {
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "12px 10px",
    background: "#020617",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  primaryButton: {
    marginTop: 16,
    border: 0,
    borderRadius: 14,
    padding: "15px 18px",
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  widgetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
  },
  widgetCard: {
    display: "grid",
    gap: 8,
    padding: 18,
    borderRadius: 18,
    background: "#111827",
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
  timeline: { display: "grid", gap: 14 },
  step: { display: "flex", gap: 12, color: "#cbd5e1" },
  stepNumber: {
    display: "grid",
    placeItems: "center",
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    flexShrink: 0,
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
  warning: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    color: "#fde68a",
    background: "#451a03",
    border: "1px solid #f59e0b",
  },
  message: {
    position: "fixed",
    right: 24,
    bottom: 24,
    padding: "14px 16px",
    borderRadius: 14,
    background: "#052e16",
    color: "#bbf7d0",
    fontWeight: 900,
  },
}
