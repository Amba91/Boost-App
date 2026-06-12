"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type Automation = {
  scenario: string
  title: string
  description: string
  trigger_label: string
  active: boolean
  delay_minutes: number
  subject: string
  heading: string
  message: string
  button_text: string
  reward_type: "none" | "discount" | "ebook" | "custom"
  reward_label: string
  reward_code: string
  reward_url: string
}

type QueueSummary = {
  scenario: string
  status: string
  count: number
}

const scenarioHelp: Record<string, string> = {
  review_request: "Déjà branché sur le suivi de livraison Shopify.",
  order_confirmation: "Sera branché sur le webhook Shopify orders/create.",
  abandoned_cart: "Nécessite l’accès Shopify aux paniers/checkouts abandonnés ou un script de panier Boost.",
  post_purchase_upsell: "Utilisera les produits de la commande pour proposer un complément.",
  winback: "Utilisera l’historique client Shopify pour relancer au bon moment.",
}

function formatDelay(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`
  return `${Math.round(minutes / 1440)} j`
}

export default function MailAutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [selectedScenario, setSelectedScenario] = useState("")
  const [connection, setConnection] = useState({
    providers: { resend: false, klaviyo: false },
    sender: "contact@kiidiiz.com",
  })
  const [queueSummary, setQueueSummary] = useState<QueueSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const selected = useMemo(
    () => automations.find((item) => item.scenario === selectedScenario) || automations[0],
    [automations, selectedScenario]
  )

  async function loadAutomations() {
    setLoading(true)
    try {
      const res = await fetch("/api/mail/automations", { cache: "no-store" })
      const data = await res.json()
      if (data.success) {
        setAutomations(data.automations || [])
        setQueueSummary(data.queue_summary || [])
        setConnection(data.connection || connection)
        if (!selectedScenario && data.automations?.[0]) {
          setSelectedScenario(data.automations[0].scenario)
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function saveAutomation() {
    if (!selected) return
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/mail/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      })
      const data = await res.json()
      setMessage(data.success ? "Scénario enregistré." : data.error || "Enregistrement impossible.")
      if (data.success) loadAutomations()
    } catch {
      setMessage("Enregistrement impossible.")
    } finally {
      setSaving(false)
    }
  }

  function updateSelected<K extends keyof Automation>(key: K, value: Automation[K]) {
    if (!selected) return
    setAutomations((current) =>
      current.map((item) =>
        item.scenario === selected.scenario ? { ...item, [key]: value } : item
      )
    )
  }

  function countFor(scenario: string, status: string) {
    return queueSummary.find((item) => item.scenario === scenario && item.status === status)?.count || 0
  }

  useEffect(() => {
    loadAutomations()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>Retour Boost</Link>
      <h1 style={styles.logo}>Boost Mail</h1>
      <p style={styles.lead}>
        Centralise les e-mails automatiques : avis, panier abandonné, confirmation,
        upsell et relance client. Les messages utilisent les infos Shopify du client,
        de sa commande et de ses produits.
      </p>

      <section style={styles.statusGrid}>
        <div style={styles.statusCard}>
          <span style={styles.eyebrow}>Expéditeur</span>
          <strong>{connection.sender}</strong>
          <small>Adresse visible par les clients.</small>
        </div>
        <div style={styles.statusCard}>
          <span style={styles.eyebrow}>Resend</span>
          <strong style={{ color: connection.providers.resend ? "#22c55e" : "#fbbf24" }}>
            {connection.providers.resend ? "Connecté" : "À connecter"}
          </strong>
          <small>Envoi direct des e-mails.</small>
        </div>
        <div style={styles.statusCard}>
          <span style={styles.eyebrow}>Klaviyo</span>
          <strong style={{ color: connection.providers.klaviyo ? "#22c55e" : "#fbbf24" }}>
            {connection.providers.klaviyo ? "Connecté" : "À connecter"}
          </strong>
          <small>Flows, segments et campagnes.</small>
        </div>
      </section>

      {loading ? (
        <p style={styles.muted}>Chargement...</p>
      ) : (
        <div style={styles.layout}>
          <section style={styles.list}>
            {automations.map((item) => (
              <button
                key={item.scenario}
                onClick={() => setSelectedScenario(item.scenario)}
                style={{
                  ...styles.scenarioCard,
                  ...(selected?.scenario === item.scenario ? styles.scenarioCardActive : {}),
                }}
              >
                <span style={styles.scenarioTop}>
                  <strong>{item.title}</strong>
                  <span style={{
                    ...styles.badge,
                    background: item.active ? "#14532d" : "#78350f",
                    color: item.active ? "#bbf7d0" : "#fde68a",
                  }}>
                    {item.active ? "Actif" : "Pause"}
                  </span>
                </span>
                <span style={styles.cardText}>{item.description}</span>
                <span style={styles.cardMeta}>
                  {item.trigger_label} · délai {formatDelay(Number(item.delay_minutes || 0))}
                </span>
                <span style={styles.cardMeta}>
                  File : {countFor(item.scenario, "scheduled")} programmé · {countFor(item.scenario, "sent")} envoyé
                </span>
              </button>
            ))}
          </section>

          {selected && (
            <section style={styles.editor}>
              <div style={styles.editorHeader}>
                <div>
                  <span style={styles.eyebrow}>Scénario</span>
                  <h2 style={styles.sectionTitle}>{selected.title}</h2>
                  <p style={styles.muted}>{scenarioHelp[selected.scenario] || selected.description}</p>
                </div>
                <label style={styles.switchLine}>
                  <input
                    type="checkbox"
                    checked={selected.active}
                    onChange={(event) => updateSelected("active", event.target.checked)}
                  />
                  Activer
                </label>
              </div>

              <label style={styles.label}>
                Délai avant envoi, en minutes
                <input
                  style={styles.input}
                  type="number"
                  min={0}
                  value={selected.delay_minutes}
                  onChange={(event) => updateSelected("delay_minutes", Number(event.target.value))}
                />
              </label>

              <label style={styles.label}>
                Objet de l’e-mail
                <input
                  style={styles.input}
                  value={selected.subject}
                  onChange={(event) => updateSelected("subject", event.target.value)}
                />
              </label>

              <label style={styles.label}>
                Titre du mail
                <input
                  style={styles.input}
                  value={selected.heading}
                  onChange={(event) => updateSelected("heading", event.target.value)}
                />
              </label>

              <label style={styles.label}>
                Message
                <textarea
                  style={{ ...styles.input, minHeight: 130 }}
                  value={selected.message}
                  onChange={(event) => updateSelected("message", event.target.value)}
                />
              </label>

              <div style={styles.twoCols}>
                <label style={styles.label}>
                  Texte du bouton
                  <input
                    style={styles.input}
                    value={selected.button_text}
                    onChange={(event) => updateSelected("button_text", event.target.value)}
                  />
                </label>
                <label style={styles.label}>
                  Récompense
                  <select
                    style={styles.input}
                    value={selected.reward_type}
                    onChange={(event) =>
                      updateSelected("reward_type", event.target.value as Automation["reward_type"])
                    }
                  >
                    <option value="none">Aucune</option>
                    <option value="discount">Code promo</option>
                    <option value="ebook">E-book</option>
                    <option value="custom">Cadeau personnalisé</option>
                  </select>
                </label>
              </div>

              <div style={styles.twoCols}>
                <label style={styles.label}>
                  Texte récompense
                  <input
                    style={styles.input}
                    value={selected.reward_label}
                    onChange={(event) => updateSelected("reward_label", event.target.value)}
                  />
                </label>
                <label style={styles.label}>
                  Code promo
                  <input
                    style={styles.input}
                    value={selected.reward_code}
                    onChange={(event) => updateSelected("reward_code", event.target.value)}
                  />
                </label>
              </div>

              <label style={styles.label}>
                Lien cadeau ou sélection produit
                <input
                  style={styles.input}
                  value={selected.reward_url}
                  onChange={(event) => updateSelected("reward_url", event.target.value)}
                />
              </label>

              <div style={styles.tokens}>
                Champs automatiques disponibles : <code>{"{prenom}"}</code>, <code>{"{commande}"}</code>,{" "}
                <code>{"{produit}"}</code>, <code>{"{recompense}"}</code>.
              </div>

              <button onClick={saveAutomation} disabled={saving} style={styles.saveButton}>
                {saving ? "Enregistrement..." : "Enregistrer ce scénario"}
              </button>
              {message && <p style={styles.message}>{message}</p>}
            </section>
          )}
        </div>
      )}
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050816",
    color: "white",
    padding: "40px",
    fontFamily: "Arial, sans-serif",
  },
  back: { color: "#a78bfa", fontWeight: 800, textDecoration: "none" },
  logo: { margin: "22px 0 10px", fontSize: 54 },
  lead: { maxWidth: 880, color: "#cbd5e1", fontSize: 18, lineHeight: 1.55 },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    margin: "30px 0",
    maxWidth: 1080,
  },
  statusCard: {
    display: "grid",
    gap: 8,
    background: "#111827",
    borderRadius: 18,
    padding: 20,
    border: "1px solid #1f2937",
  },
  eyebrow: { color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1.5, fontSize: 12, fontWeight: 900 },
  layout: { display: "grid", gridTemplateColumns: "minmax(280px, 390px) minmax(0, 760px)", gap: 24, alignItems: "start" },
  list: { display: "grid", gap: 14 },
  scenarioCard: {
    display: "grid",
    gap: 10,
    textAlign: "left",
    background: "#111827",
    color: "white",
    border: "1px solid #1f2937",
    borderRadius: 18,
    padding: 18,
    cursor: "pointer",
  },
  scenarioCardActive: { borderColor: "#7c3aed", boxShadow: "0 0 0 2px rgba(124,58,237,.25)" },
  scenarioTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  badge: { borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 900 },
  cardText: { color: "#cbd5e1", lineHeight: 1.45 },
  cardMeta: { color: "#94a3b8", fontSize: 13 },
  editor: {
    background: "#111827",
    borderRadius: 24,
    padding: 24,
    border: "1px solid #1f2937",
  },
  editorHeader: { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start" },
  sectionTitle: { margin: "8px 0", fontSize: 30 },
  muted: { color: "#94a3b8", lineHeight: 1.5 },
  switchLine: { display: "flex", gap: 8, alignItems: "center", fontWeight: 900 },
  label: { display: "grid", gap: 8, marginTop: 18, fontWeight: 800, color: "#e5e7eb" },
  input: {
    width: "100%",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "13px 14px",
    background: "#020617",
    color: "white",
    font: "inherit",
  },
  twoCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  tokens: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    background: "#020617",
    color: "#cbd5e1",
    lineHeight: 1.5,
  },
  saveButton: {
    marginTop: 22,
    width: "100%",
    border: 0,
    borderRadius: 14,
    padding: 16,
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
  },
  message: { color: "#86efac", fontWeight: 800 },
}
