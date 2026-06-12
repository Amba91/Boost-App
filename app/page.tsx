"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type WidgetStatus = "ready" | "partial" | "soon"

const widgets: Array<{
  name: string
  slug: string
  status: WidgetStatus
  description: string
  launchNote: string
}> = [
  {
    name: "Reviews",
    slug: "reviews",
    status: "ready",
    description: "Avis produits, import Amazon/AliExpress, photos, publication et widget fiche produit.",
    launchNote: "Commercialisable en priorité.",
  },
  {
    name: "Tracking",
    slug: "tracking",
    status: "ready",
    description: "Page de suivi commande, configuration boutique et demande d’avis après livraison.",
    launchNote: "Commercialisable avec Shopify connecté.",
  },
  {
    name: "Boost Mail",
    slug: "mail-automations",
    status: "ready",
    description: "Resend, Klaviyo, scénarios e-mail, prévisualisation test et paniers abandonnés.",
    launchNote: "Prêt pour les tests sans paiement.",
  },
  {
    name: "Upsell",
    slug: "upsell",
    status: "partial",
    description: "Règles simples pour proposer un produit complémentaire.",
    launchNote: "À renforcer avant vente large.",
  },
  {
    name: "Sales Popups",
    slug: "sales-popups",
    status: "partial",
    description: "Notifications d’achat visibles sur la boutique.",
    launchNote: "Fonctionnel, configuration à améliorer.",
  },
  {
    name: "Sticky Cart",
    slug: "sticky-cart",
    status: "partial",
    description: "Barre panier flottante pour accélérer l’achat.",
    launchNote: "Fonctionnel, personnalisation à finir.",
  },
  {
    name: "Free Shipping Bar",
    slug: "free-shipping-bar",
    status: "partial",
    description: "Barre de livraison offerte basée sur le panier.",
    launchNote: "Script présent, configuration à renforcer.",
  },
  {
    name: "Recently Viewed",
    slug: "recently-viewed",
    status: "partial",
    description: "Rappelle les produits récemment consultés.",
    launchNote: "Script présent, page config simple.",
  },
  {
    name: "Bundles",
    slug: "bundles",
    status: "soon",
    description: "Offres groupées pour augmenter le panier moyen.",
    launchNote: "Page créée, widget boutique à construire.",
  },
  {
    name: "Wishlist",
    slug: "wishlist",
    status: "soon",
    description: "Liste d’envies client.",
    launchNote: "Page créée, logique client à construire.",
  },
  {
    name: "Trust Badges",
    slug: "trust-badges",
    status: "soon",
    description: "Badges de confiance personnalisables.",
    launchNote: "Page créée, rendu boutique à construire.",
  },
  {
    name: "Announcement Bar",
    slug: "announcement-bar",
    status: "soon",
    description: "Bandeau d’annonce boutique.",
    launchNote: "Page créée, script à construire.",
  },
  {
    name: "Countdown Timer",
    slug: "countdown-timer",
    status: "soon",
    description: "Compte à rebours pour offres limitées.",
    launchNote: "Page créée, script à construire.",
  },
  {
    name: "Related Products",
    slug: "related-products",
    status: "soon",
    description: "Recommandations produits automatiques.",
    launchNote: "Page créée, moteur à construire.",
  },
]

const statusLabels: Record<WidgetStatus, string> = {
  ready: "Prêt",
  partial: "À finaliser",
  soon: "Bientôt",
}

const statusColors: Record<WidgetStatus, { background: string; color: string; border: string }> = {
  ready: { background: "#052e16", color: "#bbf7d0", border: "#16a34a" },
  partial: { background: "#451a03", color: "#fde68a", border: "#f59e0b" },
  soon: { background: "#111827", color: "#cbd5e1", border: "#334155" },
}

export default function HomePage() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({})
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0)
  const readyCount = widgets.filter((widget) => widget.status === "ready").length
  const partialCount = widgets.filter((widget) => widget.status === "partial").length
  const soonCount = widgets.filter((widget) => widget.status === "soon").length

  async function loadStatuses() {
    const results: Record<string, boolean> = {}

    for (const widget of widgets) {
      try {
        const res = await fetch(`/api/widgets/${widget.slug}`)
        const data = await res.json()
        results[widget.slug] = data.active || false
      } catch {
        results[widget.slug] = false
      }
    }

    setStatuses(results)
  }

  async function toggleWidget(slug: string) {
    const current = statuses[slug]

    await fetch(`/api/widgets/${slug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        active: !current,
      }),
    })

    loadStatuses()
  }

  async function loadReviewNotifications() {
    try {
      const res = await fetch("/api/reviews/notifications", {
        cache: "no-store",
      })
      const data = await res.json()

      if (data.success) {
        setPendingReviewsCount(Number(data.pending_count || 0))
      }
    } catch (error) {
      console.error("REVIEW NOTIFICATION ERROR:", error)
    }
  }

  useEffect(() => {
    loadStatuses()
    loadReviewNotifications()

    const interval = window.setInterval(loadReviewNotifications, 30000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadReviewNotifications()
    }
    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    document.title = pendingReviewsCount
      ? `(${pendingReviewsCount}) Avis à traiter - Boost`
      : "Boost"
  }, [pendingReviewsCount])

  useEffect(() => {
    document.documentElement.style.height = "auto"
    document.documentElement.style.overflowY = "auto"
    document.body.style.height = "auto"
    document.body.style.overflowY = "auto"

    return () => {
      document.documentElement.style.height = ""
      document.documentElement.style.overflowY = ""
      document.body.style.height = ""
      document.body.style.overflowY = ""
    }
  }, [])

  return (
    <main style={styles.main}>
      <div style={styles.brandHeader}>
        <img src="/logo.png" alt="Boost" style={styles.logoImage} />
        <div>
          <h1 style={styles.logo}>Boost</h1>
          <p style={styles.tagline}>More sales. Less effort.</p>
        </div>
        <Link href="/admin" style={styles.adminLink}>
          Admin Boost
        </Link>
      </div>

      <section style={styles.launchPanel}>
        <div>
          <span style={styles.eyebrow}>Sprint commercialisation</span>
          <h2 style={styles.launchTitle}>Objectif : rendre Boost vendable rapidement</h2>
          <p style={styles.launchText}>
            On garde les fonctions solides devant, on marque les autres comme bientôt,
            puis on construit en priorité AliExpress produits et factures.
          </p>
        </div>
        <div style={styles.launchStats}>
          <div style={styles.launchStat}>
            <strong>{readyCount}</strong>
            <span>prêts</span>
          </div>
          <div style={styles.launchStat}>
            <strong>{partialCount}</strong>
            <span>à finaliser</span>
          </div>
          <div style={styles.launchStat}>
            <strong>{soonCount}</strong>
            <span>bientôt</span>
          </div>
        </div>
      </section>

      <section style={styles.nextSteps}>
        <div style={styles.stepCard}>
          <span style={styles.stepNumber}>1</span>
          <strong>Clarifier l’offre MVP</strong>
          <p>Reviews, Tracking, Boost Mail, Upsell simple et produits Shopify.</p>
        </div>
        <div style={styles.stepCard}>
          <span style={styles.stepNumber}>2</span>
          <strong>Importer depuis AliExpress</strong>
          <p>Créer un produit Shopify depuis un lien fournisseur, avec images et variantes.</p>
          <Link href="/suppliers" style={styles.stepLink}>Ouvrir Fournisseurs</Link>
        </div>
        <div style={styles.stepCard}>
          <span style={styles.stepNumber}>3</span>
          <strong>Factures pro</strong>
          <p>Générer des PDF personnalisables pour commandes Shopify.</p>
        </div>
      </section>

      {pendingReviewsCount > 0 && (
        <Link href="/widgets/reviews" style={styles.notificationLink}>
          <div style={styles.notificationBanner}>
            <div>
              <strong style={styles.notificationTitle}>
                {pendingReviewsCount > 1
                  ? `${pendingReviewsCount} nouveaux avis clients attendent`
                  : "1 nouvel avis client attend"}
              </strong>
              <p style={styles.notificationText}>
                Clique ici pour publier ou supprimer les avis reçus sur la boutique.
              </p>
            </div>
            <span style={styles.notificationAction}>Traiter maintenant →</span>
          </div>
        </Link>
      )}

      <div style={styles.grid}>
        <div style={styles.productCard}>
          <h2 style={styles.title}>Produits Shopify</h2>

          <p style={styles.text}>
            Synchronise les produits Shopify dans Boost pour les utiliser dans
            Reviews, Bundles, Upsell, Related Products et Social AutoPilot.
          </p>

          <p style={{ ...styles.status, color: "#22c55e" }}>
            BASE PRODUITS
          </p>

          <Link href="/products">
            <button style={styles.productButton}>
              Voir les produits
            </button>
          </Link>
        </div>

        {widgets.map((widget) => {
          const active = statuses[widget.slug] || false

          return (
            <div
              key={widget.slug}
              style={{
                ...styles.card,
                ...(widget.slug === "reviews" && pendingReviewsCount > 0
                  ? styles.reviewCardAlert
                  : {}),
              }}
            >
              <div style={styles.cardTitleRow}>
                <h2 style={{ ...styles.title, margin: 0 }}>{widget.name}</h2>
                <span
                  style={{
                    ...styles.maturityBadge,
                    background: statusColors[widget.status].background,
                    color: statusColors[widget.status].color,
                    borderColor: statusColors[widget.status].border,
                  }}
                >
                  {statusLabels[widget.status]}
                </span>
              </div>

              {widget.slug === "reviews" && pendingReviewsCount > 0 && (
                <span style={styles.reviewBadge}>
                  {pendingReviewsCount} à traiter
                </span>
              )}

              <p style={styles.text}>{widget.description}</p>
              <p style={styles.launchNote}>{widget.launchNote}</p>

              <p
                style={{
                  ...styles.status,
                  color: active ? "#22c55e" : "#ef4444",
                }}
              >
                {active ? "ACTIF" : "INACTIF"}
              </p>

              <button
                onClick={() => toggleWidget(widget.slug)}
                disabled={widget.status === "soon"}
                style={{
                  ...styles.toggleButton,
                  background:
                    widget.status === "soon"
                      ? "#334155"
                      : active
                      ? "#dc2626"
                      : "#16a34a",
                  cursor: widget.status === "soon" ? "not-allowed" : "pointer",
                }}
              >
                {widget.status === "soon" ? "Bientôt disponible" : active ? "Désactiver" : "Activer"}
              </button>

              <Link href={`/widgets/${widget.slug}`}>
                <button style={styles.button}>Configurer</button>
              </Link>
            </div>
          )
        })}
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
    overflowY: "visible",
  },
  logo: {
    fontSize: "58px",
    fontWeight: "bold",
    margin: 0,
  },
  brandHeader: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "50px",
  },
  adminLink: {
    marginLeft: "auto",
    color: "white",
    background: "#7c3aed",
    textDecoration: "none",
    padding: "13px 16px",
    borderRadius: 14,
    fontWeight: 900,
  },
  logoImage: {
    width: 86,
    height: 86,
    borderRadius: 22,
    boxShadow: "0 18px 45px rgba(59,130,246,.25)",
  },
  tagline: {
    margin: "4px 0 0",
    color: "#a78bfa",
    fontWeight: 900,
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: "24px",
  },
  launchPanel: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, .8fr)",
    gap: "24px",
    alignItems: "center",
    maxWidth: "1180px",
    marginBottom: "24px",
    padding: "28px",
    borderRadius: "28px",
    background: "linear-gradient(135deg, #111827, #1e1b4b)",
    border: "1px solid #312e81",
  },
  eyebrow: {
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: "1.8px",
    fontSize: "12px",
    fontWeight: 900,
  },
  launchTitle: {
    margin: "10px 0",
    fontSize: "34px",
  },
  launchText: {
    color: "#cbd5e1",
    lineHeight: 1.55,
    margin: 0,
    maxWidth: "760px",
  },
  launchStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  launchStat: {
    display: "grid",
    gap: "6px",
    justifyItems: "center",
    padding: "18px 12px",
    borderRadius: "18px",
    background: "#020617",
    border: "1px solid #1f2937",
  },
  nextSteps: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    maxWidth: "1180px",
    marginBottom: "26px",
  },
  stepCard: {
    display: "grid",
    gap: "8px",
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "20px",
    padding: "20px",
  },
  stepNumber: {
    display: "grid",
    placeItems: "center",
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
  },
  stepLink: {
    width: "fit-content",
    color: "#a78bfa",
    fontWeight: 900,
    textDecoration: "none",
  },
  notificationLink: {
    display: "block",
    maxWidth: "1000px",
    marginBottom: "28px",
    color: "inherit",
    textDecoration: "none",
  },
  notificationBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "22px 26px",
    border: "2px solid #f59e0b",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #451a03, #111827)",
  },
  notificationTitle: {
    color: "#fbbf24",
    fontSize: "19px",
  },
  notificationText: {
    margin: "7px 0 0",
    color: "#e2e8f0",
  },
  notificationAction: {
    flexShrink: 0,
    borderRadius: "12px",
    background: "#f59e0b",
    color: "#111827",
    padding: "12px 16px",
    fontWeight: "bold",
  },
  card: {
    background: "#111827",
    borderRadius: "24px",
    padding: "30px",
  },
  reviewCardAlert: {
    border: "2px solid #f59e0b",
    boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.12)",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
  },
  reviewBadge: {
    display: "inline-flex",
    width: "fit-content",
    marginBottom: "12px",
    borderRadius: "999px",
    background: "#f59e0b",
    color: "#111827",
    padding: "7px 10px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  maturityBadge: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "12px",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  productCard: {
    background: "linear-gradient(135deg, #111827, #064e3b)",
    borderRadius: "24px",
    padding: "30px",
    border: "1px solid #16a34a",
  },
  title: {
    fontSize: "30px",
    marginBottom: "12px",
  },
  text: {
    color: "#94a3b8",
    marginBottom: "10px",
    lineHeight: 1.45,
  },
  launchNote: {
    color: "#cbd5e1",
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "14px",
    lineHeight: 1.45,
  },
  status: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  toggleButton: {
    width: "100%",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
    marginBottom: "14px",
  },
  button: {
    width: "100%",
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
  productButton: {
    width: "100%",
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "16px",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
}
