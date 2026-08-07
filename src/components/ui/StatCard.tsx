import type { LucideIcon } from "lucide-react";

export type StatTrend = "up" | "down" | "flat";

export default function StatCard({
  eyebrow,
  value,
  detail,
  trend,
  trendLabel,
  icon: Icon,
}: {
  eyebrow: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  trend?: StatTrend;
  trendLabel?: string;
  icon?: LucideIcon;
}) {
  const trendColor =
    trend === "up" ? "var(--gh-success)" : trend === "down" ? "var(--gh-danger)" : "var(--gh-text-muted)";
  const trendGlyph = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

  return (
    <div className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="gh-eyebrow">{eyebrow}</p>
        {Icon && (
          <span style={{ color: "var(--gh-text-muted)", display: "inline-flex" }}>
            <Icon size={16} strokeWidth={1.75} />
          </span>
        )}
      </div>
      {/* Sans-serif tabular numerals, not the display serif — dense/
          professional CRM dashboards (Attio, Twenty) render KPI figures
          this way; Cormorant stays reserved for page titles, record names,
          and the homepage welcome headline. */}
      <p
        style={{
          fontFamily: "var(--gh-font-body)",
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          fontSize: "var(--gh-text-xl)",
          color: "var(--gh-text-emphasis)",
          lineHeight: 1.15,
        }}
      >
        {value}
      </p>
      {(detail || trendLabel) && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          {trendLabel && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--gh-space-1)",
                fontSize: "var(--gh-text-xs)",
                color: trendColor,
              }}
            >
              {trendGlyph} {trendLabel}
            </span>
          )}
          {detail && (
            <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>{detail}</span>
          )}
        </div>
      )}
    </div>
  );
}
