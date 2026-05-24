export default function DashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "40px",
      }}
    >
      <h1 style={{ fontSize: "44px", margin: 0 }}>🚀 Boost Dashboard</h1>

      <p style={{ color: "#94a3b8", fontSize: "18px", marginTop: "12px" }}>
        Boutique Shopify connectée avec succès.
      </p>

      <div
        style={{
          marginTop: "32px",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "24px",
          padding: "28px",
        }}
      >
        <h2>✅ Connexion Shopify réussie</h2>
        <p style={{ color: "#cbd5e1", lineHeight: "1.7" }}>
          Boost peut maintenant préparer l’activation des widgets, analytics,
          factures, webhooks et accès lifetime.
        </p>
      </div>
    </main>
  )
}