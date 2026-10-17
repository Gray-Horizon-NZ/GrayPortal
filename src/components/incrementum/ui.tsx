// Shared Incrementum presentation pieces (server-safe — no hooks). Styling
// lives in (app)/incrementum/incrementum.css; tokens in tokens.css.
import Link from "next/link";
import { METRICS, isMetricKey } from "@/lib/incrementum/registry";
import { formatMetric, formatTarget } from "@/lib/incrementum/format";

export function PageHead({ eyebrow, title, lede, actions }: { eyebrow: string; title: React.ReactNode; lede?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="inc-page-head">
      <div>
        <p className="gh-eyebrow">{eyebrow}</p>
        <h1 className="inc-page-title">{title}</h1>
        {lede && <p className="inc-lede">{lede}</p>}
      </div>
      {actions && <div className="inc-inline">{actions}</div>}
    </div>
  );
}

/** ?ok= / ?error= messages set by the shared server-action helper. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p className="inc-flash" data-tone={error ? "danger" : undefined} role={error ? "alert" : "status"}>
      {error ?? ok}
    </p>
  );
}

export function Bar({ value, tone, markers = [], label }: { value: number; tone?: "good" | "warn" | "danger"; markers?: number[]; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="inc-bar" data-tone={tone} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
      <div className="inc-bar-fill" style={{ width: `${pct}%` }} />
      {markers.map((m) => (
        <span key={m} className="inc-bar-marker" style={{ left: `${Math.max(0, Math.min(1, m)) * 100}%` }} />
      ))}
    </div>
  );
}

export function Ring({ pct, size = 96, label }: { pct: number; size?: number; label?: string }) {
  const stroke = 4;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gh-border)" strokeWidth={stroke} />
        <circle
          className="inc-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gh-accent)"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="inc-num" style={{ fontSize: size > 80 ? "var(--gh-text-xl)" : "var(--gh-text-base)", fontWeight: 500, color: "var(--gh-text-emphasis)" }}>
          {Math.round(p)}%
        </span>
        {label && <span className="inc-small">{label}</span>}
      </div>
    </div>
  );
}

export function Avatar({ name, photoUrl, size = 44 }: { name: string; photoUrl?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span className="inc-avatar" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photoUrl ? <img src={photoUrl} alt="" /> : initials}
    </span>
  );
}

export function Dot({ tone }: { tone?: "danger" | "warning" | "good" | "accent" | "neutral" }) {
  return <span className="inc-dot" data-tone={tone === "neutral" ? undefined : tone} aria-hidden />;
}

export function Chip({ tone, children }: { tone?: "accent" | "good" | "warning" | "danger"; children: React.ReactNode }) {
  return (
    <span className="inc-chip" data-tone={tone}>
      {children}
    </span>
  );
}

export function MetricValue({ metricKey, value }: { metricKey: string | null; value: number | null }) {
  if (!isMetricKey(metricKey)) return <span className="inc-muted">Manual</span>;
  return <span className="inc-num">{formatMetric(value, METRICS[metricKey].unit)}</span>;
}

export function MetricTarget({ metricKey, comparator, target }: { metricKey: string | null; comparator: string; target: number | null }) {
  if (!isMetricKey(metricKey)) return null;
  return <span className="inc-small">target {formatTarget(comparator, target, METRICS[metricKey].unit)}</span>;
}

export function PhaseSteps({ phases, compact = false }: { phases: { id: string; number: number; name: string; status: string }[]; compact?: boolean }) {
  return (
    <div className="inc-steps">
      {phases.map((p) => (
        <Link href="/incrementum/roadmap" key={p.id} className="inc-step" data-state={p.status === "done" ? "done" : p.status === "active" ? "active" : undefined}>
          <span className="inc-step-num">
            Phase {p.number}
            {p.status === "done" ? " ✓" : ""}
          </span>
          {!compact && <span className="inc-step-name">{p.name}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ padding: "var(--gh-space-6) 0", textAlign: "center" }}>
      <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
        {title}
      </p>
      {children && <div className="inc-muted" style={{ marginTop: "var(--gh-space-2)" }}>{children}</div>}
    </div>
  );
}

export function goalTone(status: string): "good" | "warning" | "danger" | "accent" | undefined {
  if (status === "hit") return "good";
  if (status === "at_risk") return "warning";
  if (status === "missed") return "danger";
  if (status === "on_track") return "accent";
  return undefined;
}

export const GOAL_STATUS_LABELS: Record<string, string> = {
  hit: "Hit",
  on_track: "On track",
  at_risk: "At risk",
  missed: "Missed",
  no_period: "Open",
};
