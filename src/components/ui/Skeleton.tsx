export function SkeletonBlock({ width = "100%", height = 14 }: { width?: number | string; height?: number }) {
  return <div className="gh-skeleton" style={{ width, height }} />;
}

export function SkeletonStat() {
  return (
    <div className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <SkeletonBlock width={80} height={10} />
      <SkeletonBlock width={120} height={30} />
      <SkeletonBlock width={100} height={10} />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <SkeletonBlock width={100} height={10} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={i === lines - 1 ? "60%" : "100%"} height={14} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--gh-space-4)",
        padding: "var(--gh-space-3) var(--gh-space-4)",
        borderBottom: "1px solid var(--gh-border)",
      }}
    >
      <SkeletonBlock width="40%" height={12} />
      <SkeletonBlock width="20%" height={12} />
      <SkeletonBlock width="15%" height={12} />
    </div>
  );
}

export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "var(--gh-space-4)",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}
