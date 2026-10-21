import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Meter } from "./HomeWidgets";

// Server-side building blocks of the terminal UI (rules:
// grayhorizon-docs/Terminal UI/RULES.md §4). Styles in (app)/terminal.css.

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="gh-term-pagehead">
      <div>
        <h1 className="gh-title">{title}</h1>
        {sub && <p className="gh-term-pagehead-sub">{sub}</p>}
      </div>
      {children && <div className="gh-term-pagehead-actions">{children}</div>}
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  right,
  pad = true,
  children,
}: {
  title: string;
  icon: LucideIcon;
  right?: React.ReactNode;
  pad?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="gh-term-panel">
      <header className="gh-term-phead">
        <Icon size={13} strokeWidth={2} />
        <span className="gh-term-ptitle">{title}</span>
        {right && <span className="gh-term-phead-r">{right}</span>}
      </header>
      <div className={pad ? "gh-term-pbody" : undefined}>{children}</div>
    </section>
  );
}

/** Record header for a client/company profile: logo banner, name, meta, actions. */
export function ProfileHead({
  name,
  logoUrl,
  meta,
  actions,
}: {
  name: string;
  logoUrl?: string | null;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="gh-term-profile">
      <span className="gh-term-banner gh-term-profile-banner">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-set public Storage URL
          <img src={logoUrl} alt={`${name} logo`} />
        ) : (
          <span className="gh-term-banner-mono">{name.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      <div className="gh-term-profile-id">
        <p className="gh-term-profile-name">{name}</p>
        {meta && <div className="gh-term-profile-meta">{meta}</div>}
      </div>
      {actions && <div className="gh-term-pagehead-actions gh-term-profile-actions">{actions}</div>}
    </div>
  );
}

const money = (n: number) =>`$${Math.round(n).toLocaleString("en-NZ")}`;

/** Portrait tile for a client: name + badge, logo/monogram banner, revenue and health bars. */
export function ClientTile({
  id,
  name,
  logoUrl,
  badge,
  mrr,
  mrrTotal,
  health,
}: {
  id: string;
  name: string;
  logoUrl?: string | null;
  badge?: { label: string; tone?: "success" | "warning" | "danger" | "accent" };
  // Omit for callers who mustn't see revenue.
  mrr?: number;
  mrrTotal?: number;
  health?: { score: number; trend: "up" | "down" | "flat" } | null;
}) {
  return (
    <Link href={`/clients/${id}`} className="gh-term-tile">
      <span className="gh-term-tile-name">
        <span>{name}</span>
        {badge && <span className="gh-badge" data-status={badge.tone}>{badge.label}</span>}
      </span>
      <span className="gh-term-banner">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-set public Storage URL
          <img src={logoUrl} alt={`${name} logo`} />
        ) : (
          <span className="gh-term-banner-mono">{name.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="gh-term-tile-body">
        {mrr !== undefined && (
          <span className="gh-term-tile-meter">
            <span>Revenue</span>
            <Meter pct={mrrTotal ? (mrr / mrrTotal) * 100 : 0} label="Share of monthly recurring revenue" />
            <b>{mrr > 0 ? money(mrr) : "—"}</b>
          </span>
        )}
        <span className="gh-term-tile-meter">
          <span>Health</span>
          <Meter pct={health?.score ?? 0} tone="neutral" label="Health score" />
          <b>
            {health ? health.score : "—"}{" "}
            {health && (
              <span className="gh-term-trend" data-trend={health.trend}>
                {health.trend === "up" ? "▲" : health.trend === "down" ? "▼" : "■"}
              </span>
            )}
          </b>
        </span>
      </span>
      <span className="gh-term-tile-manage">Manage account</span>
    </Link>
  );
}
