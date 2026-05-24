export default function DashboardPage() {
  const widgets = [
    "Sticky Add To Cart",
    "Sales Popups",
    "Wishlist",
    "Reviews",
    "Order Tracking",
  ]

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
      }}
    >
      {/* TOPBAR */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          background: "#0f172a",
          padding: "18px 24px",
          borderRadius: "20px",
          border: "1px solid #1e293b",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "34px" }}>Dashboard</h1>

          <p style={{ color: "#94a3b8", marginTop: "6px" }}>
            Boutique : kiidiiz.myshopify.com
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              background: "#14532d",
              color: "#86efac",
              padding: "8px 14px",
              borderRadius: "999px",
              fontSize: "14px",
            }}
          >
            ● Kiidiiz connected
          </div>

          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "999px",
              background: "#7c3aed",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontWeight: "bold",
            }}
          >
            A
          </div>
        </div>
      </div>

      {/* STATS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
        }}
      >
        {[
          { title: "Revenus", value: "18 945€", growth: "+28%" },
          { title: "Commandes", value: "1 259", growth: "+22%" },
          { title: "Conversion", value: "3.62%", growth: "+18%" },
          { title: "AOV", value: "65€", growth: "+7%" },
        ].map((card) => (
          <div
            key={card.title}
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "22px",
              padding: "24px",
            }}
          >
            <p style={{ color: "#94a3b8", margin: 0 }}>{card.title}</p>

            <h2
              style={{
                marginTop: "10px",
                marginBottom: "8px",
                fontSize: "34px",
              }}
            >
              {card.value}
            </h2>

            <span style={{ color: "#22c55e" }}>{card.growth}</span>
          </div>
        ))}
      </div>

      {/* CONTENT */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginTop: "24px",
        }}
      >
        {/* WIDGETS */}

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "22px",
            padding: "24px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Widgets actifs</h2>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {widgets.map((widget) => (
              <div
                key={widget}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #1e293b",
                }}
              >
                <span>{widget}</span>

                <span style={{ color: "#22c55e" }}>Actif</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI */}

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "22px",
            padding: "24px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>🤖 Boost AI</h2>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: "1.7",
            }}
          >
            Votre boutique pourrait générer entre 2 156€ et 3 421€ de revenus
            supplémentaires avec les optimisations recommandées.
          </p>

          <button
            style={{
              marginTop: "20px",
              background: "#7c3aed",
              border: "none",
              color: "white",
              padding: "14px 18px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Voir les insights IA
          </button>
        </div>
      </div>
    </main>
  )
}