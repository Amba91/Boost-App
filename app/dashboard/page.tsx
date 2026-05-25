async function getStoreData() {
  try {
    const response = await fetch(
      `${process.env.SHOPIFY_APP_URL}/api/shopify/store`,
      {
        cache: "no-store",
      }
    )

    return response.json()
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const store = await getStoreData()

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ fontSize: "42px" }}>🚀 Boost Dashboard</h1>

      <div
        style={{
          marginTop: "30px",
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "20px",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            padding: "24px",
            borderRadius: "20px",
          }}
        >
          <h3>Boutique</h3>
          <p>{store?.shop || "Non connectée"}</p>
        </div>

        <div
          style={{
            background: "#0f172a",
            padding: "24px",
            borderRadius: "20px",
          }}
        >
          <h3>Connexion</h3>
          <p>{store?.connected ? "✅ Active" : "❌ Offline"}</p>
        </div>

        <div
          style={{
            background: "#0f172a",
            padding: "24px",
            borderRadius: "20px",
          }}
        >
          <h3>Shopify</h3>
          <p>{store?.data?.data?.shop?.name || "API inactive"}</p>
        </div>

        <div
          style={{
            background: "#0f172a",
            padding: "24px",
            borderRadius: "20px",
          }}
        >
          <h3>Boost AI</h3>
          <p>Ready</p>
        </div>
      </div>

      <div
        style={{
          marginTop: "30px",
          background: "#0f172a",
          padding: "30px",
          borderRadius: "24px",
        }}
      >
        <h2>Données Shopify</h2>

        <pre
          style={{
            marginTop: "20px",
            color: "#94a3b8",
            overflow: "auto",
            fontSize: "14px",
          }}
        >
          {JSON.stringify(store, null, 2)}
        </pre>
      </div>
    </main>
  )
}