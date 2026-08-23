function Bar({ width = "100%" }: { width?: string }) {
  return (
    <div
      style={{
        width,
        height: 12,
        borderRadius: 4,
        background: "var(--ghp-panel-2, #292925)",
        opacity: 0.6,
      }}
    />
  );
}

export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
      <Bar width="140px" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="ghp-panel-block" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <Bar width="60%" />
            <Bar width="90%" />
            <Bar width="40%" />
          </div>
        ))}
      </div>
    </div>
  );
}
