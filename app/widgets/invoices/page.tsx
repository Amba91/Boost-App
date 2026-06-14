"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const sampleItems = [
  { title: "AdventureTrack™ - Circuit de Voitures", quantity: 1, price: "34,90€" },
  { title: "Protection transport", quantity: 1, price: "0,00€" },
]

export default function InvoicesPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [brandName, setBrandName] = useState("Kiidiiz")
  const [companyInfo, setCompanyInfo] = useState("Kiidiiz\ncontact@kiidiiz.com\nFrance")
  const [footerText, setFooterText] = useState("Merci pour votre confiance. Cette facture est générée par Boost.")
  const [accentColor, setAccentColor] = useState("#7c3aed")

  async function loadWidget() {
    try {
      const res = await fetch("/api/widgets/invoices")
      const data = await res.json()
      setActive(Boolean(data.active))
    } catch {
      setActive(false)
    } finally {
      setLoading(false)
    }
  }

  async function toggleWidget() {
    setLoading(true)
    const nextActive = !active
    try {
      const res = await fetch("/api/widgets/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      })
      const data = await res.json()
      setActive(Boolean(data.active))
    } finally {
      setLoading(false)
    }
  }

  function printInvoice() {
    window.print()
  }

  useEffect(() => {
    loadWidget()
  }, [])

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>← Retour Boost</Link>

      <section style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Factures pro</span>
          <h1 style={styles.title}>Factures personnalisables</h1>
          <p style={styles.lead}>
            Prépare le modèle que Boost utilisera pour générer les factures des
            commandes Shopify : logo, boutique, coordonnées, couleur et texte de fin.
          </p>
        </div>
        <span style={{ ...styles.statusBadge, color: active ? "#bbf7d0" : "#fecaca" }}>
          {active ? "ACTIF" : "INACTIF"}
        </span>
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2>Configuration</h2>
          <label style={styles.label}>Nom affiché</label>
          <input value={brandName} onChange={(event) => setBrandName(event.target.value)} style={styles.input} />

          <label style={styles.label}>Informations entreprise</label>
          <textarea
            value={companyInfo}
            onChange={(event) => setCompanyInfo(event.target.value)}
            style={styles.textarea}
          />

          <label style={styles.label}>Couleur principale</label>
          <input
            value={accentColor}
            onChange={(event) => setAccentColor(event.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Texte en bas de facture</label>
          <textarea
            value={footerText}
            onChange={(event) => setFooterText(event.target.value)}
            style={styles.textarea}
          />

          <button onClick={toggleWidget} disabled={loading} style={active ? styles.dangerButton : styles.button}>
            {loading ? "Chargement..." : active ? "Désactiver les factures" : "Activer les factures"}
          </button>
          <button onClick={printInvoice} style={styles.secondaryButton}>
            Télécharger / imprimer l’aperçu
          </button>

          <p style={styles.note}>
            MVP actuel : modèle personnalisable et aperçu. Prochaine étape :
            relier chaque commande Shopify et générer automatiquement un PDF par commande.
          </p>
        </div>

        <div style={styles.previewCard}>
          <div style={styles.invoice}>
            <div style={styles.invoiceHeader}>
              <div>
                <strong style={{ ...styles.invoiceBrand, color: accentColor }}>{brandName || "Boost"}</strong>
                <pre style={styles.companyInfo}>{companyInfo}</pre>
              </div>
              <div style={styles.invoiceMeta}>
                <strong>FACTURE</strong>
                <span>INV-BOOST-1001</span>
                <span>Commande #1001</span>
                <span>14/06/2026</span>
              </div>
            </div>

            <div style={styles.customerBox}>
              <strong>Client</strong>
              <span>Alan B.</span>
              <span>12 rue Exemple</span>
              <span>75000 Paris, France</span>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Produit</th>
                  <th style={styles.th}>Qté</th>
                  <th style={styles.th}>Prix</th>
                </tr>
              </thead>
              <tbody>
                {sampleItems.map((item) => (
                  <tr key={item.title}>
                    <td style={styles.td}>{item.title}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.totalRow}>
              <span>Total TTC</span>
              <strong>34,90€</strong>
            </div>

            <p style={styles.footer}>{footerText}</p>
          </div>
        </div>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050816",
    color: "white",
    padding: 40,
    fontFamily: "Arial, sans-serif",
  },
  back: { color: "#a78bfa", textDecoration: "none", fontWeight: 900 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    maxWidth: 1280,
    margin: "28px 0",
    padding: 28,
    borderRadius: 28,
    background: "linear-gradient(135deg, #111827, #1e1b4b)",
    border: "1px solid #312e81",
  },
  eyebrow: { color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1.8, fontSize: 12, fontWeight: 900 },
  title: { margin: "10px 0", fontSize: 46 },
  lead: { margin: 0, color: "#cbd5e1", maxWidth: 820, lineHeight: 1.55 },
  statusBadge: {
    alignSelf: "start",
    borderRadius: 999,
    padding: "10px 13px",
    background: "#020617",
    border: "1px solid #1f2937",
    fontWeight: 900,
  },
  grid: { display: "grid", gridTemplateColumns: "minmax(320px, 460px) minmax(420px, 760px)", gap: 22, maxWidth: 1280 },
  card: { padding: 24, borderRadius: 24, background: "#111827", border: "1px solid #1f2937" },
  label: { display: "block", marginTop: 16, color: "#cbd5e1", fontWeight: 900 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    font: "inherit",
  },
  textarea: {
    width: "100%",
    minHeight: 92,
    boxSizing: "border-box",
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    font: "inherit",
  },
  button: {
    width: "100%",
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    border: 0,
    background: "#7c3aed",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  dangerButton: {
    width: "100%",
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    border: 0,
    background: "#dc2626",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    marginTop: 12,
    padding: 15,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#020617",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  note: { color: "#94a3b8", lineHeight: 1.5, marginTop: 16 },
  previewCard: { padding: 24, borderRadius: 24, background: "#111827", border: "1px solid #1f2937" },
  invoice: { background: "white", color: "#111827", borderRadius: 20, padding: 34 },
  invoiceHeader: { display: "flex", justifyContent: "space-between", gap: 24, borderBottom: "1px solid #e5e7eb", paddingBottom: 20 },
  invoiceBrand: { display: "block", fontSize: 30, fontWeight: 900 },
  companyInfo: { margin: "10px 0 0", color: "#4b5563", fontFamily: "Arial, sans-serif", whiteSpace: "pre-wrap" },
  invoiceMeta: { display: "grid", gap: 6, textAlign: "right", color: "#4b5563" },
  customerBox: { display: "grid", gap: 5, marginTop: 24, padding: 16, borderRadius: 14, background: "#f8fafc" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 24 },
  th: { textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "12px 8px", color: "#4b5563" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "13px 8px" },
  totalRow: { display: "flex", justifyContent: "flex-end", gap: 28, marginTop: 20, fontSize: 20 },
  footer: { marginTop: 30, color: "#4b5563", lineHeight: 1.5 },
}
