"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type ReviewRequest = {
  id: number
  order_name: string
  customer_email: string
  customer_first_name: string
  product_title: string
  product_handle: string
  delivered_at: string
  scheduled_for: string
  status: "scheduled" | "ready" | "sent"
}

type TrackingSettings = {
  page_path: string
  title: string
  subtitle: string
  button_text: string
  primary_color: string
  background_color: string
  text_color: string
}

const defaultTrackingSettings: TrackingSettings = {
  page_path: "/pages/suivre-ma-commande",
  title: "Suivre ma commande",
  subtitle: "Entre ton numéro de commande et l’e-mail utilisé lors de l’achat.",
  button_text: "Voir le suivi",
  primary_color: "#111827",
  background_color: "#f0fffb",
  text_color: "#111827",
}

export default function TrackingPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewRequestActive, setReviewRequestActive] = useState(false)
  const [delayDays, setDelayDays] = useState(3)
  const [queue, setQueue] = useState<ReviewRequest[]>([])
  const [emailConnected, setEmailConnected] = useState(false)
  const [message, setMessage] = useState("")
  const [trackingSettings, setTrackingSettings] = useState(defaultTrackingSettings)
  const [trackingSettingsSaving, setTrackingSettingsSaving] = useState(false)
  const [trackingSettingsMessage, setTrackingSettingsMessage] = useState("")

  async function loadWidget() {
    try {
      const res = await fetch("/api/widgets/tracking")
      const data = await res.json()
      setActive(data.active)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleWidget() {
    try {
      setLoading(true)
      const newState = !active

      await fetch("/api/widgets/tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: newState,
        }),
      })

      setActive(newState)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function loadReviewRequests() {
    try {
      const res = await fetch("/api/tracking/review-requests", {
        cache: "no-store",
      })
      const data = await res.json()

      if (data.success) {
        setReviewRequestActive(Boolean(data.settings?.active))
        setDelayDays(Number(data.settings?.delay_days || 3))
        setQueue(data.queue || [])
        setEmailConnected(Boolean(data.email_service_connected))
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function loadTrackingSettings() {
    try {
      const res = await fetch("/api/tracking/settings", { cache: "no-store" })
      const data = await res.json()
      if (data.success && data.settings) {
        setTrackingSettings({ ...defaultTrackingSettings, ...data.settings })
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function saveTrackingSettings() {
    setTrackingSettingsSaving(true)
    setTrackingSettingsMessage("")

    try {
      const res = await fetch("/api/tracking/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackingSettings),
      })
      const data = await res.json()

      if (data.success) {
        setTrackingSettings({ ...defaultTrackingSettings, ...data.settings })
        setTrackingSettingsMessage("Le suivi de la boutique est enregistré.")
      } else {
        setTrackingSettingsMessage(data.error || "Enregistrement impossible.")
      }
    } catch {
      setTrackingSettingsMessage("Enregistrement impossible.")
    } finally {
      setTrackingSettingsSaving(false)
    }
  }

  function updateTrackingSetting<K extends keyof TrackingSettings>(
    key: K,
    value: TrackingSettings[K]
  ) {
    setTrackingSettings((current) => ({ ...current, [key]: value }))
  }

  async function saveReviewRequestSettings() {
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch("/api/tracking/review-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: reviewRequestActive,
          delay_days: delayDays,
        }),
      })
      const data = await res.json()

      setMessage(
        data.success
          ? "Réglages enregistrés."
          : data.error || "Enregistrement impossible."
      )
    } catch {
      setMessage("Enregistrement impossible.")
    }

    setSaving(false)
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("fr-FR")
  }

  useEffect(() => {
    loadWidget()
    loadReviewRequests()
    loadTrackingSettings()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>
        ← Retour aux widgets
      </Link>

      <h1 style={styles.title}>Tracking</h1>

      <div style={styles.card}>
        <p style={styles.muted}>Widget Shopify intelligent.</p>

        <p
          style={{
            ...styles.status,
            color: active ? "#22c55e" : "#ef4444",
          }}
        >
          Statut : {active ? "ACTIF" : "INACTIF"}
        </p>

        <button
          onClick={toggleWidget}
          disabled={loading}
          style={{
            ...styles.button,
            background: active ? "#dc2626" : "#7c3aed",
          }}
        >
          {loading
            ? "Chargement..."
            : active
            ? "Désactiver Tracking"
            : "Activer Tracking"}
        </button>
      </div>

      <div style={styles.cardWide}>
        <p style={styles.eyebrow}>SUIVI SUR LA BOUTIQUE</p>
        <h2 style={styles.sectionTitle}>Configurer la page de suivi</h2>
        <p style={styles.muted}>
          Le client retrouve sa commande avec son numéro et l’e-mail utilisé
          lors de l’achat. Cette double vérification protège ses informations.
        </p>

        <div style={styles.settingsGrid}>
          <label style={styles.fieldLabel}>
            Adresse de la page Shopify
            <input
              value={trackingSettings.page_path}
              onChange={(e) => updateTrackingSetting("page_path", e.target.value)}
              style={styles.input}
              placeholder="/pages/suivre-ma-commande"
            />
          </label>
          <label style={styles.fieldLabel}>
            Titre du formulaire
            <input
              value={trackingSettings.title}
              onChange={(e) => updateTrackingSetting("title", e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={{ ...styles.fieldLabel, ...styles.fullField }}>
            Texte d’aide
            <input
              value={trackingSettings.subtitle}
              onChange={(e) => updateTrackingSetting("subtitle", e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.fieldLabel}>
            Texte du bouton
            <input
              value={trackingSettings.button_text}
              onChange={(e) => updateTrackingSetting("button_text", e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.fieldLabel}>
            Couleur du bouton
            <input
              type="color"
              value={trackingSettings.primary_color}
              onChange={(e) => updateTrackingSetting("primary_color", e.target.value)}
              style={styles.colorInput}
            />
          </label>
          <label style={styles.fieldLabel}>
            Couleur du fond
            <input
              type="color"
              value={trackingSettings.background_color}
              onChange={(e) => updateTrackingSetting("background_color", e.target.value)}
              style={styles.colorInput}
            />
          </label>
          <label style={styles.fieldLabel}>
            Couleur du texte
            <input
              type="color"
              value={trackingSettings.text_color}
              onChange={(e) => updateTrackingSetting("text_color", e.target.value)}
              style={styles.colorInput}
            />
          </label>
        </div>

        <div
          style={{
            ...styles.preview,
            background: trackingSettings.background_color,
            color: trackingSettings.text_color,
          }}
        >
          <strong style={styles.previewTitle}>{trackingSettings.title}</strong>
          <p style={styles.previewText}>{trackingSettings.subtitle}</p>
          <div style={styles.previewForm}>
            <span style={styles.previewInput}>#1234</span>
            <span style={styles.previewInput}>client@exemple.com</span>
            <span
              style={{
                ...styles.previewButton,
                background: trackingSettings.primary_color,
              }}
            >
              {trackingSettings.button_text}
            </span>
          </div>
        </div>

        <button
          onClick={saveTrackingSettings}
          disabled={trackingSettingsSaving}
          style={styles.saveButton}
        >
          {trackingSettingsSaving
            ? "Enregistrement..."
            : "Enregistrer le suivi de la boutique"}
        </button>
        {trackingSettingsMessage && (
          <p style={styles.success}>{trackingSettingsMessage}</p>
        )}
      </div>

      <div style={styles.cardWide}>
        <p style={styles.eyebrow}>AUTOMATISATION APRÈS LIVRAISON</p>
        <h2 style={styles.sectionTitle}>Demander un avis au bon moment</h2>
        <p style={styles.muted}>
          Boost attend que Shopify confirme le statut « Livré », puis programme
          la demande d’avis pour les produits de cette commande.
        </p>

        <a
          href="https://boost-app-9e6w.vercel.app/api/shopify/install"
          target="_top"
          style={styles.shopifyConnectButton}
        >
          Autoriser le suivi des livraisons Shopify
        </a>
        <p style={styles.connectionHelp}>
          À faire une seule fois : Shopify demandera l’autorisation de lire les
          événements de livraison, puis te ramènera ici automatiquement.
        </p>

        <label style={styles.switchLabel}>
          <input
            type="checkbox"
            checked={reviewRequestActive}
            onChange={(e) => setReviewRequestActive(e.target.checked)}
          />
          Activer les demandes d’avis après livraison
        </label>

        <label style={styles.fieldLabel}>
          Délai après la livraison
          <select
            value={delayDays}
            onChange={(e) => setDelayDays(Number(e.target.value))}
            style={styles.input}
          >
            <option value={0}>Le jour même</option>
            <option value={1}>1 jour après</option>
            <option value={2}>2 jours après</option>
            <option value={3}>3 jours après</option>
            <option value={5}>5 jours après</option>
            <option value={7}>7 jours après</option>
            <option value={10}>10 jours après</option>
            <option value={14}>14 jours après</option>
          </select>
        </label>

        <div
          style={{
            ...styles.connectionBox,
            borderColor: emailConnected ? "#16a34a" : "#f59e0b",
          }}
        >
          <strong style={{ color: emailConnected ? "#22c55e" : "#fbbf24" }}>
            E-mail : {emailConnected ? "connecté" : "à connecter"}
          </strong>
          <p style={{ ...styles.muted, marginBottom: 0 }}>
            {emailConnected
              ? "Les demandes prêtes pourront être envoyées automatiquement."
              : "Les demandes seront préparées, mais aucun e-mail ne partira avant la connexion de contact@kiidiiz.com."}
          </p>
        </div>

        <button
          onClick={saveReviewRequestSettings}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? "Enregistrement..." : "Enregistrer l’automatisation"}
        </button>

        {message && <p style={styles.success}>{message}</p>}
      </div>

      <div style={styles.cardWide}>
        <h2 style={styles.sectionTitle}>Demandes programmées</h2>

        {queue.length === 0 ? (
          <p style={styles.empty}>Aucune livraison enregistrée pour le moment.</p>
        ) : (
          queue.map((item) => (
            <div key={item.id} style={styles.queueItem}>
              <div>
                <strong>
                  {item.order_name || "Commande"} · {item.product_title}
                </strong>
                <p style={styles.queueText}>
                  {item.customer_first_name || "Client"} · {item.customer_email}
                </p>
                <p style={styles.queueText}>
                  Livré le {formatDate(item.delivered_at)} · demande prévue le{" "}
                  {formatDate(item.scheduled_for)}
                </p>
              </div>
              <span
                style={{
                  ...styles.statusPill,
                  background:
                    item.status === "sent"
                      ? "#166534"
                      : item.status === "ready"
                      ? "#b45309"
                      : "#4338ca",
                }}
              >
                {item.status === "sent"
                  ? "Envoyée"
                  : item.status === "ready"
                  ? "Prête à envoyer"
                  : "Programmée"}
              </span>
            </div>
          ))
        )}
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050816",
    color: "white",
    padding: "40px",
    fontFamily: "Arial",
  },
  back: {
    color: "#a78bfa",
    textDecoration: "none",
  },
  title: {
    fontSize: "48px",
    marginTop: "30px",
  },
  card: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "500px",
    marginTop: "30px",
  },
  cardWide: {
    background: "#111827",
    padding: "32px",
    borderRadius: "24px",
    maxWidth: "850px",
    marginTop: "30px",
  },
  eyebrow: {
    color: "#a78bfa",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },
  sectionTitle: {
    fontSize: "26px",
    marginTop: "8px",
  },
  switchLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "24px",
    fontWeight: "bold",
  },
  fieldLabel: {
    display: "block",
    marginTop: "22px",
    color: "#cbd5e1",
    fontWeight: "bold",
  },
  input: {
    display: "block",
    width: "100%",
    marginTop: "8px",
    padding: "13px",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    columnGap: "18px",
  },
  fullField: {
    gridColumn: "1 / -1",
  },
  colorInput: {
    display: "block",
    width: "100%",
    height: "48px",
    marginTop: "8px",
    padding: "5px",
    border: "none",
    borderRadius: "12px",
    background: "white",
  },
  preview: {
    marginTop: "24px",
    padding: "24px",
    borderRadius: "18px",
  },
  previewTitle: {
    display: "block",
    fontSize: "23px",
  },
  previewText: {
    margin: "8px 0 18px",
    opacity: 0.75,
  },
  previewForm: {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px",
  },
  previewInput: {
    flex: "1 1 180px",
    padding: "12px",
    borderRadius: "10px",
    background: "white",
    color: "#64748b",
  },
  previewButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    color: "white",
    fontWeight: "bold",
  },
  connectionBox: {
    marginTop: "22px",
    padding: "18px",
    border: "1px solid",
    borderRadius: "16px",
    background: "#050816",
  },
  shopifyConnectButton: {
    display: "block",
    marginTop: "20px",
    padding: "14px 16px",
    borderRadius: "13px",
    background: "#16a34a",
    color: "white",
    textAlign: "center",
    textDecoration: "none",
    fontWeight: "bold",
  },
  connectionHelp: {
    margin: "9px 0 0",
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.4,
  },
  saveButton: {
    width: "100%",
    marginTop: "20px",
    color: "white",
    background: "#7c3aed",
    border: "none",
    padding: "15px",
    borderRadius: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
  success: {
    color: "#22c55e",
    fontWeight: "bold",
  },
  empty: {
    padding: "18px",
    borderRadius: "14px",
    background: "#050816",
    color: "#94a3b8",
  },
  queueItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    marginTop: "14px",
    padding: "18px",
    borderRadius: "14px",
    background: "#050816",
  },
  queueText: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "13px",
  },
  statusPill: {
    flexShrink: 0,
    padding: "7px 11px",
    borderRadius: "999px",
    color: "white",
    fontSize: "12px",
    fontWeight: "bold",
  },
  muted: {
    color: "#94a3b8",
  },
  status: {
    marginTop: "20px",
    fontSize: "22px",
    fontWeight: "bold",
  },
  button: {
    width: "100%",
    marginTop: "24px",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "18px",
  },
}
