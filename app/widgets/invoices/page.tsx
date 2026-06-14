"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type InvoiceSection = "identity" | "template" | "automation" | "history"
type InvoiceTotals = {
  subtotalHt: number
  discount: number
  shipping: number
  vat: number
  totalTtc: number
  paid: number
  remaining: number
}

type InvoicePreviewProps = {
  accentColor: string
  brandName: string
  companyName: string
  legalForm: string
  sellerAddress: string
  sellerZip: string
  sellerCity: string
  sellerCountry: string
  sellerPhone: string
  sellerEmail: string
  sellerWebsite: string
  siret: string
  vatNumber: string
  rcs: string
  capital: string
  iban: string
  bic: string
  bankName: string
  accountOwner: string
  legalText: string
  footerText: string
  totals: InvoiceTotals
  template: string
}

const templates = [
  { id: "classic", name: "Classique", description: "Facture professionnelle standard." },
  { id: "modern", name: "Moderne", description: "Style clair, proche Stripe." },
  { id: "premium", name: "Premium", description: "Style Apple, très aéré." },
  { id: "ecommerce", name: "E-commerce", description: "Pensé pour Shopify et produits." },
  { id: "luxury", name: "Luxe", description: "Noir et or, haut de gamme." },
]

const paymentMethods = ["Carte bancaire", "PayPal", "Virement bancaire", "Apple Pay", "Google Pay"]

const sampleItems = [
  {
    image: "https://cdn.shopify.com/s/files/1/0919/8128/7487/files/preview_images/circuit.png?v=1",
    title: "AdventureTrack™ - Circuit de Voitures",
    variant: "Bleu",
    sku: "ADV-BLEU-001",
    quantity: 1,
    unitHt: 29.08,
    vatRate: 20,
  },
  {
    image: "",
    title: "Livraison suivie",
    variant: "Standard",
    sku: "SHIP-FR",
    quantity: 1,
    unitHt: 0,
    vatRate: 20,
  },
]

function money(value: number) {
  return `${value.toFixed(2).replace(".", ",")}€`
}

export default function InvoicesPage() {
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<InvoiceSection>("identity")
  const [template, setTemplate] = useState("modern")
  const [accentColor, setAccentColor] = useState("#7c3aed")
  const [fontFamily, setFontFamily] = useState("Inter / Arial")
  const [brandName, setBrandName] = useState("Kiidiiz")
  const [companyName, setCompanyName] = useState("Kiidiiz")
  const [legalForm, setLegalForm] = useState("SAS")
  const [sellerAddress, setSellerAddress] = useState("12 rue Exemple")
  const [sellerZip, setSellerZip] = useState("75000")
  const [sellerCity, setSellerCity] = useState("Paris")
  const [sellerCountry, setSellerCountry] = useState("France")
  const [sellerPhone, setSellerPhone] = useState("+33 6 00 00 00 00")
  const [sellerEmail, setSellerEmail] = useState("contact@kiidiiz.com")
  const [sellerWebsite, setSellerWebsite] = useState("https://kiidiiz.com")
  const [siret, setSiret] = useState("SIRET à renseigner")
  const [vatNumber, setVatNumber] = useState("TVA à renseigner")
  const [rcs, setRcs] = useState("RCS Paris")
  const [capital, setCapital] = useState("")
  const [iban, setIban] = useState("FR76 0000 0000 0000 0000 0000 000")
  const [bic, setBic] = useState("BICFRPP")
  const [bankName, setBankName] = useState("Banque")
  const [accountOwner, setAccountOwner] = useState("Kiidiiz")
  const [legalText, setLegalText] = useState(
    "TVA non applicable, art. 293 B du CGI si applicable.\nPaiement à réception.\nPénalités de retard applicables.\nIndemnité forfaitaire de recouvrement de 40€."
  )
  const [footerText, setFooterText] = useState("Merci pour votre confiance.")
  const [autoPaid, setAutoPaid] = useState(true)
  const [autoPartiallyPaid, setAutoPartiallyPaid] = useState(true)
  const [autoFulfilled, setAutoFulfilled] = useState(false)
  const [sendCustomer, setSendCustomer] = useState(true)
  const [sendAccounting, setSendAccounting] = useState(false)
  const [accountingEmails, setAccountingEmails] = useState("compta@kiidiiz.com")

  const totals = useMemo(() => {
    const subtotalHt = sampleItems.reduce((total, item) => total + item.unitHt * item.quantity, 0)
    const discount = 0
    const shipping = 0
    const vat = sampleItems.reduce(
      (total, item) => total + item.unitHt * item.quantity * (item.vatRate / 100),
      0
    )
    const totalTtc = subtotalHt - discount + shipping + vat
    const paid = totalTtc
    return { subtotalHt, discount, shipping, vat, totalTtc, paid, remaining: totalTtc - paid }
  }, [])

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

  const sectionTabs: { id: InvoiceSection; label: string; help: string }[] = [
    { id: "identity", label: "Identité", help: "Vendeur, banque, mentions" },
    { id: "template", label: "Template", help: "Style et aperçu PDF" },
    { id: "automation", label: "Automatisation", help: "Quand générer/envoyer" },
    { id: "history", label: "Historique", help: "PDF et envois" },
  ]

  return (
    <main className="boost-invoices-page" style={styles.main}>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .boost-invoice-a4,
          .boost-invoice-a4 * {
            visibility: visible;
          }

          .boost-invoice-a4 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-width: 210mm !important;
            min-height: 297mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 16mm !important;
          }

          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
      <Link href="/" style={styles.back}>← Retour Boost</Link>

      <section style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Factures pro</span>
          <h1 style={styles.title}>Système de facturation professionnel</h1>
          <p style={styles.lead}>
            Génère automatiquement des factures A4 professionnelles, personnalisées
            et prêtes à envoyer aux clients Shopify.
          </p>
        </div>
        <div style={styles.headerActions}>
          <span style={{ ...styles.statusBadge, color: active ? "#bbf7d0" : "#fecaca" }}>
            {active ? "ACTIF" : "INACTIF"}
          </span>
          <button onClick={toggleWidget} disabled={loading} style={active ? styles.dangerButtonCompact : styles.buttonCompact}>
            {loading ? "..." : active ? "Désactiver" : "Activer"}
          </button>
        </div>
      </section>

      <nav style={styles.tabs}>
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            style={section === tab.id ? styles.tabActive : styles.tab}
          >
            <strong>{tab.label}</strong>
            <span>{tab.help}</span>
          </button>
        ))}
      </nav>

      <section style={styles.grid}>
        <div style={styles.panel}>
          {section === "identity" && (
            <>
              <h2>Informations vendeur</h2>
              <div style={styles.twoColumns}>
                <Field label="Nom boutique" value={brandName} onChange={setBrandName} />
                <Field label="Nom société" value={companyName} onChange={setCompanyName} />
                <Field label="Forme juridique" value={legalForm} onChange={setLegalForm} />
                <Field label="Téléphone" value={sellerPhone} onChange={setSellerPhone} />
              </div>
              <Field label="Adresse" value={sellerAddress} onChange={setSellerAddress} />
              <div style={styles.threeColumns}>
                <Field label="Code postal" value={sellerZip} onChange={setSellerZip} />
                <Field label="Ville" value={sellerCity} onChange={setSellerCity} />
                <Field label="Pays" value={sellerCountry} onChange={setSellerCountry} />
              </div>
              <div style={styles.twoColumns}>
                <Field label="Email" value={sellerEmail} onChange={setSellerEmail} />
                <Field label="Site internet" value={sellerWebsite} onChange={setSellerWebsite} />
                <Field label="SIRET" value={siret} onChange={setSiret} />
                <Field label="TVA intracommunautaire" value={vatNumber} onChange={setVatNumber} />
                <Field label="RCS" value={rcs} onChange={setRcs} />
                <Field label="Capital social" value={capital} onChange={setCapital} />
              </div>

              <h2>Coordonnées bancaires</h2>
              <div style={styles.twoColumns}>
                <Field label="IBAN" value={iban} onChange={setIban} />
                <Field label="BIC / SWIFT" value={bic} onChange={setBic} />
                <Field label="Banque" value={bankName} onChange={setBankName} />
                <Field label="Titulaire" value={accountOwner} onChange={setAccountOwner} />
              </div>

              <label style={styles.label}>Mentions légales</label>
              <textarea value={legalText} onChange={(event) => setLegalText(event.target.value)} style={styles.textarea} />
              <label style={styles.label}>Pied de page</label>
              <textarea value={footerText} onChange={(event) => setFooterText(event.target.value)} style={styles.textarea} />
            </>
          )}

          {section === "template" && (
            <>
              <h2>Templates</h2>
              <div style={styles.templateGrid}>
                {templates.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTemplate(item.id)}
                    style={template === item.id ? styles.templateActive : styles.template}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
              <div style={styles.twoColumns}>
                <Field label="Couleur principale" value={accentColor} onChange={setAccentColor} />
                <Field label="Police" value={fontFamily} onChange={setFontFamily} />
              </div>
              <div style={styles.uploadBox}>
                Logo, fond discret, signature et cachet seront branchés ici.
                Pour le MVP, Boost utilise le logo de la boutique quand il est disponible.
              </div>
              <button onClick={printInvoice} style={styles.button}>
                Générer la facture PDF
              </button>
            </>
          )}

          {section === "automation" && (
            <>
              <h2>Automatisation Shopify</h2>
              <Toggle label="Commande payée" active={autoPaid} onClick={() => setAutoPaid(!autoPaid)} />
              <Toggle label="Commande partiellement payée" active={autoPartiallyPaid} onClick={() => setAutoPartiallyPaid(!autoPartiallyPaid)} />
              <Toggle label="Commande expédiée" active={autoFulfilled} onClick={() => setAutoFulfilled(!autoFulfilled)} />

              <h2>Envoi automatique</h2>
              <Toggle label="Envoyer au client" active={sendCustomer} onClick={() => setSendCustomer(!sendCustomer)} />
              <Toggle label="Envoyer à la comptabilité" active={sendAccounting} onClick={() => setSendAccounting(!sendAccounting)} />
              <Field label="Emails comptabilité" value={accountingEmails} onChange={setAccountingEmails} />

              <div style={styles.infoBox}>
                Prochaine étape technique : connecter ces réglages aux webhooks
                Shopify `orders/paid`, `orders/partially_paid` et `fulfillments/create`.
              </div>
            </>
          )}

          {section === "history" && (
            <>
              <h2>Historique des factures</h2>
              {["FAC-2026-000001", "FAC-2026-000002", "FAC-2026-000003"].map((invoice, index) => (
                <div key={invoice} style={styles.historyRow}>
                  <div>
                    <strong>{invoice}</strong>
                    <span>Commande #{1001 + index} · Alan B.</span>
                  </div>
                  <div>
                    <span>{index === 0 ? "Envoyée" : index === 1 ? "Téléchargée" : "Générée"}</span>
                    <button style={styles.smallButton}>PDF</button>
                  </div>
                </div>
              ))}
              <div style={styles.infoBox}>
                Le stockage réel des PDF, dates d’envoi et téléchargements sera
                relié à la base dès qu’on branche la génération serveur.
              </div>
            </>
          )}
        </div>

        <InvoicePreview
          accentColor={accentColor}
          brandName={brandName}
          companyName={companyName}
          legalForm={legalForm}
          sellerAddress={sellerAddress}
          sellerZip={sellerZip}
          sellerCity={sellerCity}
          sellerCountry={sellerCountry}
          sellerPhone={sellerPhone}
          sellerEmail={sellerEmail}
          sellerWebsite={sellerWebsite}
          siret={siret}
          vatNumber={vatNumber}
          rcs={rcs}
          capital={capital}
          iban={iban}
          bic={bic}
          bankName={bankName}
          accountOwner={accountOwner}
          legalText={legalText}
          footerText={footerText}
          totals={totals}
          template={template}
        />
      </section>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label style={styles.label}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} style={styles.input} />
    </label>
  )
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={active ? styles.toggleActive : styles.toggle}>
      <span>{label}</span>
      <strong>{active ? "Activé" : "Désactivé"}</strong>
    </button>
  )
}

function InvoicePreview(props: InvoicePreviewProps) {
  const templateStyle =
    props.template === "luxury"
      ? { background: "#080808", color: "#f8fafc", borderColor: "#b45309" }
      : props.template === "premium"
        ? { background: "#fbfbfd", color: "#111827", borderColor: "#e5e7eb" }
        : { background: "white", color: "#111827", borderColor: "#e5e7eb" }

  return (
    <div style={styles.previewPanel}>
      <div className="boost-invoice-a4" style={{ ...styles.invoice, ...templateStyle }}>
        <div style={styles.invoiceTop}>
          <div>
            <div style={{ ...styles.logoBox, background: props.accentColor }}>B</div>
            <strong style={{ ...styles.invoiceBrand, color: props.template === "luxury" ? "#fbbf24" : props.accentColor }}>
              {props.brandName}
            </strong>
            <p style={styles.invoiceMuted}>
              {props.companyName} {props.legalForm ? `· ${props.legalForm}` : ""}
            </p>
            <p style={styles.invoiceMuted}>
              {props.sellerAddress}<br />
              {props.sellerZip} {props.sellerCity}, {props.sellerCountry}<br />
              {props.sellerPhone} · {props.sellerEmail}<br />
              {props.sellerWebsite}
            </p>
          </div>

          <div style={styles.invoiceMeta}>
            <h2>FACTURE</h2>
            <span>Facture N° FAC-2026-000001</span>
            <span>Date d’émission : 14/06/2026</span>
            <span>Date d’échéance : 14/06/2026</span>
            <strong style={{ color: "#16a34a" }}>Statut : Payée</strong>
            <span>Commande Shopify : #1001</span>
            <span>Référence client : CUS-ALAN-B</span>
          </div>
        </div>

        <div style={styles.addressGrid}>
          <InfoBlock
            title="Client"
            lines={["Alan B.", "alan@example.com", "+33 6 11 22 33 44", "TVA B2B : FR123456789"]}
          />
          <InfoBlock
            title="Adresse de facturation"
            lines={["Alan B.", "12 rue Exemple", "75000 Paris", "France"]}
          />
          <InfoBlock
            title="Adresse de livraison"
            lines={["Alan B.", "12 rue Exemple", "75000 Paris", "France", "+33 6 11 22 33 44"]}
          />
        </div>

        <table style={styles.invoiceTable}>
          <thead>
            <tr>
              <th style={styles.invoiceTh}>Produit</th>
              <th style={styles.invoiceTh}>Réf. SKU</th>
              <th style={styles.invoiceTh}>Qté</th>
              <th style={styles.invoiceTh}>Prix HT</th>
              <th style={styles.invoiceTh}>TVA</th>
              <th style={styles.invoiceTh}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {sampleItems.map((item) => (
              <tr key={item.sku}>
                <td style={styles.invoiceTd}>
                  <div style={styles.productCell}>
                    <div style={styles.productThumb}>{item.image ? "IMG" : "PDF"}</div>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.variant}</span>
                    </div>
                  </div>
                </td>
                <td style={styles.invoiceTd}>{item.sku}</td>
                <td style={styles.invoiceTd}>{item.quantity}</td>
                <td style={styles.invoiceTd}>{money(item.unitHt)}</td>
                <td style={styles.invoiceTd}>{item.vatRate}%</td>
                <td style={styles.invoiceTd}>{money(item.unitHt * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.bottomGrid}>
          <div style={styles.invoiceBox}>
            <strong>Modes de paiement</strong>
            <p>{paymentMethods.join(" · ")}</p>
            <strong>Coordonnées bancaires</strong>
            <p>
              IBAN : {props.iban}<br />
              BIC : {props.bic}<br />
              Banque : {props.bankName}<br />
              Titulaire : {props.accountOwner}
            </p>
            <div style={styles.qrBox}>QR paiement</div>
          </div>

          <div style={styles.totalsBox}>
            <Line label="Sous-total HT" value={money(props.totals.subtotalHt)} />
            <Line label="Remises" value={money(props.totals.discount)} />
            <Line label="Frais de livraison" value={money(props.totals.shipping)} />
            <Line label="Total TVA" value={money(props.totals.vat)} />
            <Line label="Montant TTC" value={money(props.totals.totalTtc)} strong />
            <Line label="Montant déjà payé" value={money(props.totals.paid)} />
            <Line label="Reste à payer" value={money(props.totals.remaining)} strong />
          </div>
        </div>

        <div style={styles.legalGrid}>
          <div>
            <strong>Mentions légales</strong>
            <p>{props.legalText}</p>
            <p>
              SIRET : {props.siret} · TVA : {props.vatNumber} · {props.rcs}
              {props.capital ? ` · Capital : ${props.capital}` : ""}
            </p>
          </div>
          <div style={styles.signatureBox}>
            Signature / cachet
          </div>
        </div>

        <footer style={styles.invoiceFooter}>
          {props.companyName} · {props.sellerAddress}, {props.sellerZip} {props.sellerCity} · {props.sellerPhone} · {props.sellerEmail} · {props.sellerWebsite}<br />
          {props.footerText}
        </footer>
      </div>
    </div>
  )
}

function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={styles.infoBlock}>
      <strong>{title}</strong>
      {lines.map((line) => <span key={line}>{line}</span>)}
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={strong ? styles.totalStrongLine : styles.totalLine}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
    maxWidth: 1500,
    margin: "28px 0",
    padding: 28,
    borderRadius: 28,
    background: "linear-gradient(135deg, #111827, #1e1b4b)",
    border: "1px solid #312e81",
  },
  eyebrow: { color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1.8, fontSize: 12, fontWeight: 900 },
  title: { margin: "10px 0", fontSize: 46 },
  lead: { margin: 0, color: "#cbd5e1", maxWidth: 900, lineHeight: 1.55 },
  headerActions: { display: "grid", gap: 10, alignSelf: "start" },
  statusBadge: {
    borderRadius: 999,
    padding: "10px 13px",
    background: "#020617",
    border: "1px solid #1f2937",
    fontWeight: 900,
    textAlign: "center",
  },
  buttonCompact: { border: 0, borderRadius: 12, padding: "12px 16px", background: "#7c3aed", color: "white", fontWeight: 900, cursor: "pointer" },
  dangerButtonCompact: { border: 0, borderRadius: 12, padding: "12px 16px", background: "#dc2626", color: "white", fontWeight: 900, cursor: "pointer" },
  tabs: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, maxWidth: 1500, marginBottom: 22 },
  tab: { display: "grid", gap: 5, textAlign: "left", border: "1px solid #1f2937", borderRadius: 18, padding: 16, background: "#111827", color: "white", cursor: "pointer" },
  tabActive: { display: "grid", gap: 5, textAlign: "left", border: "1px solid #7c3aed", borderRadius: 18, padding: 16, background: "rgba(124, 58, 237, .24)", color: "white", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "minmax(360px, 520px) minmax(760px, 1fr)", gap: 22, maxWidth: 1500 },
  panel: { padding: 24, borderRadius: 24, background: "#111827", border: "1px solid #1f2937" },
  label: { display: "grid", gap: 8, marginTop: 14, color: "#cbd5e1", fontWeight: 900 },
  input: { width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 12, border: "1px solid #334155", background: "#020617", color: "white", font: "inherit" },
  textarea: { width: "100%", minHeight: 110, boxSizing: "border-box", padding: 13, borderRadius: 12, border: "1px solid #334155", background: "#020617", color: "white", font: "inherit" },
  twoColumns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  threeColumns: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  templateGrid: { display: "grid", gap: 10 },
  template: { display: "grid", gap: 5, textAlign: "left", border: "1px solid #334155", borderRadius: 16, padding: 14, background: "#020617", color: "white", cursor: "pointer" },
  templateActive: { display: "grid", gap: 5, textAlign: "left", border: "1px solid #a78bfa", borderRadius: 16, padding: 14, background: "rgba(124, 58, 237, .22)", color: "white", cursor: "pointer" },
  uploadBox: { marginTop: 16, padding: 16, borderRadius: 16, border: "1px dashed #475569", color: "#cbd5e1", lineHeight: 1.5 },
  button: { width: "100%", marginTop: 16, padding: 15, border: 0, borderRadius: 14, background: "#7c3aed", color: "white", fontWeight: 900, cursor: "pointer" },
  toggle: { width: "100%", display: "flex", justifyContent: "space-between", marginTop: 10, padding: 14, borderRadius: 14, border: "1px solid #334155", background: "#020617", color: "white", cursor: "pointer" },
  toggleActive: { width: "100%", display: "flex", justifyContent: "space-between", marginTop: 10, padding: 14, borderRadius: 14, border: "1px solid #16a34a", background: "rgba(22, 163, 74, .15)", color: "#bbf7d0", cursor: "pointer" },
  infoBox: { marginTop: 16, padding: 16, borderRadius: 16, border: "1px solid #f59e0b", background: "rgba(245, 158, 11, .1)", color: "#fde68a", lineHeight: 1.5 },
  historyRow: { display: "flex", justifyContent: "space-between", gap: 14, marginTop: 12, padding: 14, borderRadius: 16, background: "#020617", border: "1px solid #1f2937" },
  smallButton: { border: 0, borderRadius: 10, padding: "8px 11px", background: "#7c3aed", color: "white", fontWeight: 900 },
  previewPanel: { padding: 20, borderRadius: 24, background: "#111827", border: "1px solid #1f2937", overflowX: "auto" },
  invoice: { minWidth: 760, borderRadius: 18, padding: 30, border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  invoiceTop: { display: "grid", gridTemplateColumns: "1fr 330px", gap: 22, borderBottom: "1px solid #e5e7eb", paddingBottom: 20 },
  logoBox: { display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 14, color: "white", fontWeight: 900, marginBottom: 10 },
  invoiceBrand: { display: "block", fontSize: 30, fontWeight: 900 },
  invoiceMuted: { color: "#64748b", lineHeight: 1.45 },
  invoiceMeta: { display: "grid", gap: 5, textAlign: "right", color: "#475569" },
  addressGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 },
  infoBlock: { display: "grid", gap: 5, padding: 14, borderRadius: 14, background: "#f8fafc", color: "#334155" },
  invoiceTable: { width: "100%", borderCollapse: "collapse", marginTop: 22 },
  invoiceTh: { textAlign: "left", padding: "11px 8px", borderBottom: "1px solid #cbd5e1", color: "#475569", fontSize: 12 },
  invoiceTd: { padding: "13px 8px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
  productCell: { display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 10, alignItems: "center" },
  productThumb: { display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 10, background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 900 },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, marginTop: 22 },
  invoiceBox: { padding: 16, borderRadius: 14, background: "#f8fafc", color: "#334155", lineHeight: 1.5 },
  qrBox: { display: "grid", placeItems: "center", width: 110, height: 110, marginTop: 12, borderRadius: 12, border: "1px dashed #94a3b8", color: "#64748b" },
  totalsBox: { display: "grid", gap: 8, alignSelf: "start" },
  totalLine: { display: "flex", justifyContent: "space-between", gap: 18, color: "#475569" },
  totalStrongLine: { display: "flex", justifyContent: "space-between", gap: 18, color: "#111827", fontSize: 18, fontWeight: 900, borderTop: "1px solid #e2e8f0", paddingTop: 8 },
  legalGrid: { display: "grid", gridTemplateColumns: "1fr 190px", gap: 18, marginTop: 24, color: "#475569", whiteSpace: "pre-wrap" },
  signatureBox: { display: "grid", placeItems: "center", minHeight: 110, borderRadius: 14, border: "1px dashed #94a3b8", color: "#64748b" },
  invoiceFooter: { marginTop: 22, paddingTop: 16, borderTop: "1px solid #e5e7eb", color: "#64748b", textAlign: "center", fontSize: 12, lineHeight: 1.5 },
}
