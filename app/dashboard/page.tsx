import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"

export default function DashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#020617",
      }}
    >
      <Sidebar />

      <div style={{ flex: 1 }}>
        <Topbar />

        <div style={{ padding: "30px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
            }}
          >
            {[
              ["Revenue", "18 945€"],
              ["Orders", "1 259"],
              ["Conversion", "3.62%"],
              ["AOV", "65€"],
            ].map(([title, value]) => (
              <div
                key={title}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "24px",
                  padding: "24px",
                }}
              >
                <p style={{ color: "#94a3b8" }}>{title}</p>

                <h2
                  style={{
                    color: "white",
                    marginTop: "10px",
                    fontSize: "34px",
                  }}
                >
                  {value}
                </h2>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}