const items = [
  "Dashboard",
  "Widgets",
  "Analytics",
  "Boost AI",
  "Shopify Connect",
  "Owner",
  "Billing",
  "Settings",
]

export default function Sidebar() {
  return (
    <div
      style={{
        width: "260px",
        background: "#020617",
        borderRight: "1px solid #1e293b",
        padding: "24px",
      }}
    >
      <h1
        style={{
          color: "white",
          marginBottom: "40px",
        }}
      >
        🚀 BOOST
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {items.map((item) => (
          <div
            key={item}
            style={{
              padding: "14px",
              borderRadius: "14px",
              background:
                item === "Dashboard"
                  ? "#7c3aed"
                  : "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}