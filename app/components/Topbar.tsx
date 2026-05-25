export default function Topbar({ title }: { title: string }) {
  return (
    <div style={styles.topbar}>
      <div>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.sub}>kiidiiz.myshopify.com • Connected</p>
      </div>

      <div style={styles.actions}>
        <span style={styles.badge}>● Live</span>
        <button style={styles.icon}>🔔</button>
        <div style={styles.profile}>
          <div style={styles.avatar}>A</div>
          <div>
            <p style={{ margin: 0, color: "white" }}>Amadou</p>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Owner</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  topbar: {
    height: "82px",
    background: "#0f172a",
    borderBottom: "1px solid #1e293b",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 30px",
  },
  title: { margin: 0, color: "white" },
  sub: { margin: 0, color: "#94a3b8" },
  actions: { display: "flex", alignItems: "center", gap: 14 },
  badge: {
    color: "#22c55e",
    background: "rgba(34,197,94,.12)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: "bold",
  },
  icon: {
    background: "#111827",
    color: "white",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: "12px 14px",
  },
  profile: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: "10px 14px",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#7c3aed",
    display: "grid",
    placeItems: "center",
    color: "white",
    fontWeight: "bold",
  },
}