export default function Topbar() {
  return (
    <div
      style={{
        height: "80px",
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
      }}
    >
      <div>
        <h2 style={{ margin: 0, color: "white" }}>Dashboard</h2>
        <p style={{ margin: 0, color: "#94a3b8" }}>
          Boutique : kiidiiz.myshopify.com
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "999px",
            background: "#7c3aed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
          }}
        >
          A
        </div>

        <div>
          <div style={{ color: "white" }}>Amadou</div>
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>
            Owner
          </div>
        </div>
      </div>
    </div>
  )
}