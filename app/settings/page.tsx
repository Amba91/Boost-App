"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type MerchantSettings = {
  language: string
  shop_name: string
  support_email: string
  plan: string
  notifications_email: boolean
  notifications_reviews: boolean
  notifications_orders: boolean
}

const defaultSettings: MerchantSettings = {
  language: "fr",
  shop_name: "Kiidiiz",
  support_email: "contact@kiidiiz.com",
  plan: "Boost Starter",
  notifications_email: true,
  notifications_reviews: true,
  notifications_orders: true,
}

export default function MerchantSettingsPage() {
  const [settings, setSettings] = useState<MerchantSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await fetch("/api/merchant/settings", { cache: "no-store" })
      const data = await res.json()
      if (data.success && data.settings) {
        setSettings({ ...defaultSettings, ...data.settings })
      } else {
        setMessage(data.error || "Impossible de charger les réglages.")
      }
    } catch {
      setMessage("Impossible de charger les réglages.")
    } finally {
      setLoading(false)
    }
  }

  function updateSetting<K extends keyof MerchantSettings>(
    key: K,
    value: MerchantSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }))
    setMessage("")
  }

  async function saveSettings() {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!data.success) {
        setMessage(data.error || "Sauvegarde impossible.")
        return
      }
      setSettings({ ...defaultSettings, ...data.settings })
      setMessage("Réglages enregistrés dans Boost pour cette boutique.")
    } catch {
      setMessage("Sauvegarde impossible.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.header}>
        <Link href="/" style={styles.backLink}>Retour Boost</Link>
        <div style={styles.brand}>
          <img src="/logo.png" alt="Boost" style={styles.logo} />
          <div>
            <span style={styles.eyebrow}>Espace marchand</span>
            <h1 style={styles.title}>Paramètres Boost</h1>
            <p style={styles.lead}>
              Les réglages importants de la boutique, sans les options admin propriétaire.
            </p>
          </div>
        </div>
      </div>

      <section style={styles.grid}>
        <div style={styles.card}>
          <span style={styles.cardEyebrow}>Identité boutique</span>
          <h2 style={styles.cardTitle}>Informations principales</h2>
          <p style={styles.cardText}>
            Ces informations servent à personnaliser les widgets, les e-mails et les factures.
          </p>

          <label style={styles.label}>
            Nom boutique
            <input
              value={settings.shop_name}
              onChange={(event) => updateSetting("shop_name", event.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            E-mail support
            <input
              value={settings.support_email}
              onChange={(event) => updateSetting("support_email", event.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Langue de Boost
            <select
              value={settings.language}
              onChange={(event) => updateSetting("language", event.target.value)}
              style={styles.input}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
          </label>
        </div>

        <div style={styles.card}>
          <span style={styles.cardEyebrow}>Abonnement</span>
          <h2 style={styles.cardTitle}>Plan actuel</h2>
          <p style={styles.cardText}>
            Cette zone affichera le plan Shopify Billing quand la facturation sera activée.
          </p>

          <div style={styles.planBox}>
            <strong>{settings.plan}</strong>
            <span>Mode lancement</span>
          </div>

          <div style={styles.statusList}>
            <StatusLine label="Reviews" value="Prêt" ready />
            <StatusLine label="Tracking" value="Prêt" ready />
            <StatusLine label="Boost Mail" value="Prêt" ready />
            <StatusLine label="Factures" value="À finaliser" />
            <StatusLine label="Fournisseurs" value="À finaliser" />
          </div>
        </div>

        <div style={styles.card}>
          <span style={styles.cardEyebrow}>Notifications</span>
          <h2 style={styles.cardTitle}>Ce que Boost doit signaler</h2>
          <p style={styles.cardText}>
            Le marchand pourra choisir ce qui mérite une alerte claire dans son espace.
          </p>

          <Toggle
            label="Nouveaux avis clients"
            checked={settings.notifications_reviews}
            onChange={(value) => updateSetting("notifications_reviews", value)}
          />
          <Toggle
            label="E-mails prêts ou échoués"
            checked={settings.notifications_email}
            onChange={(value) => updateSetting("notifications_email", value)}
          />
          <Toggle
            label="Commandes fournisseur à traiter"
            checked={settings.notifications_orders}
            onChange={(value) => updateSetting("notifications_orders", value)}
          />
        </div>

        <div style={styles.card}>
          <span style={styles.cardEyebrow}>Raccourcis</span>
          <h2 style={styles.cardTitle}>Pages utiles</h2>
          <p style={styles.cardText}>
            Les chemins les plus importants pour gérer la boutique sans se perdre.
          </p>

          <div style={styles.linkGrid}>
            <Link href="/widgets/reviews" style={styles.quickLink}>Avis clients</Link>
            <Link href="/widgets/tracking" style={styles.quickLink}>Suivi commande</Link>
            <Link href="/widgets/mail-automations" style={styles.quickLink}>Boost Mail</Link>
            <Link href="/widgets/invoices" style={styles.quickLink}>Factures</Link>
            <Link href="/suppliers" style={styles.quickLink}>Fournisseurs</Link>
            <Link href="/products" style={styles.quickLink}>Produits Shopify</Link>
          </div>
        </div>
      </section>

      <div style={styles.saveBar}>
        <div>
          <strong>Paramètres marchand</strong>
          <p style={styles.saveText}>
            Ces réglages sont sauvegardés dans la base Boost pour la boutique connectée.
          </p>
          {loading && <p style={styles.loading}>Chargement des réglages...</p>}
          {message && <p style={styles.message}>{message}</p>}
        </div>
        <button onClick={saveSettings} disabled={saving || loading} style={styles.saveButton}>
          {saving ? "Enregistrement..." : "Enregistrer les réglages"}
        </button>
      </div>
    </main>
  )
}

function StatusLine({
  label,
  value,
  ready = false,
}: {
  label: string
  value: string
  ready?: boolean
}) {
  return (
    <div style={styles.statusLine}>
      <span>{label}</span>
      <strong style={{ color: ready ? "#86efac" : "#fcd34d" }}>{value}</strong>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label style={styles.toggle}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050816",
    color: "white",
    padding: "42px",
    fontFamily: "Arial",
  },
  header: {
    maxWidth: "1180px",
    margin: "0 auto 26px",
  },
  backLink: {
    display: "inline-flex",
    marginBottom: "22px",
    color: "#a78bfa",
    textDecoration: "none",
    fontWeight: 900,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "28px",
    borderRadius: "30px",
    background: "linear-gradient(135deg, #111827, #1e1b4b)",
    border: "1px solid #312e81",
  },
  logo: {
    width: 86,
    height: 86,
    borderRadius: 22,
    boxShadow: "0 18px 45px rgba(59,130,246,.25)",
  },
  eyebrow: {
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: "1.8px",
    fontSize: "12px",
    fontWeight: 900,
  },
  title: {
    margin: "8px 0",
    fontSize: "42px",
  },
  lead: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: 1.55,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    maxWidth: "1180px",
    margin: "0 auto 22px",
  },
  card: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "24px",
    padding: "24px",
  },
  cardEyebrow: {
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    fontSize: "12px",
    fontWeight: 900,
  },
  cardTitle: {
    margin: "10px 0",
    fontSize: "25px",
  },
  cardText: {
    color: "#94a3b8",
    lineHeight: 1.5,
    marginTop: 0,
  },
  label: {
    display: "grid",
    gap: "8px",
    marginTop: "14px",
    color: "#cbd5e1",
    fontWeight: 900,
  },
  input: {
    width: "100%",
    minHeight: 48,
    borderRadius: "12px",
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    padding: "0 14px",
    font: "inherit",
    boxSizing: "border-box",
  },
  planBox: {
    display: "grid",
    gap: "6px",
    borderRadius: "18px",
    padding: "18px",
    background: "#020617",
    border: "1px solid #334155",
    marginBottom: "16px",
  },
  statusList: {
    display: "grid",
    gap: "10px",
  },
  statusLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    padding: "12px",
    borderRadius: "12px",
    background: "#020617",
    color: "#cbd5e1",
  },
  toggle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    padding: "14px 0",
    borderBottom: "1px solid #1f2937",
    color: "#e5e7eb",
    fontWeight: 900,
  },
  linkGrid: {
    display: "grid",
    gap: "10px",
  },
  quickLink: {
    color: "white",
    textDecoration: "none",
    borderRadius: "14px",
    padding: "14px",
    background: "#020617",
    border: "1px solid #334155",
    fontWeight: 900,
  },
  saveBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "20px 24px",
    borderRadius: "22px",
    background: "#0f172a",
    border: "1px solid #1e293b",
  },
  saveText: {
    margin: "6px 0 0",
    color: "#94a3b8",
  },
  message: {
    margin: "8px 0 0",
    color: "#86efac",
    fontWeight: 900,
  },
  loading: {
    margin: "8px 0 0",
    color: "#c4b5fd",
    fontWeight: 900,
  },
  saveButton: {
    flexShrink: 0,
    border: 0,
    borderRadius: "14px",
    padding: "16px 20px",
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
}
