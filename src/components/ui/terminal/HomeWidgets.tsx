"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Landmark, X } from "lucide-react";

// Interactive pieces of the terminal Home (calm view): detail numbers sit
// behind a click instead of all being on screen at once.

export function Meter({ pct, tone, height = 4, label }: { pct: number; tone?: "neutral" | "warn" | "bad"; height?: number; label: string }) {
  const [on, setOn] = useState(false);
  // Bars fill from zero on mount, the way the in-game screens do.
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);
  const w = Math.max(0, Math.min(100, pct));
  return (
    <span className="gh-term-meter" style={{ height }} role="meter" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i data-tone={tone} style={{ width: on ? `${w}%` : 0 }} />
    </span>
  );
}

export type HomeStat = {
  label: string;
  value: string;
  sub: string;
  meter?: { pct: number; tone?: "neutral" | "warn" | "bad"; label: string };
  tone?: "bad";
};

/** Four stat tiles; a click on any one opens the detail line on all four so the row stays level. */
export function StatRow({ stats }: { stats: HomeStat[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="gh-term-grid gh-term-grid--4">
      {stats.map((s) => (
        <button key={s.label} type="button" className="gh-term-stat" data-open={open || undefined} aria-expanded={open} onClick={() => setOpen(!open)}>
          <ChevronDown size={13} className="gh-term-stat-chev" />
          <span className="gh-term-stat-label">{s.label}</span>
          <span className="gh-term-stat-value" data-tone={s.tone}>{s.value}</span>
          {s.meter && (
            <span className="gh-term-stat-viz">
              <Meter pct={s.meter.pct} tone={s.meter.tone} label={s.meter.label} />
            </span>
          )}
          <span className="gh-term-fold">
            <span className="gh-term-stat-sub">{s.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** "More" toggle under the MRR hero; children are the folded-away meta. */
export function HeroMore({ lead, children }: { lead: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="gh-term-hero-meta">
        {lead}
        <button type="button" className="gh-term-more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Less" : "More"} <ChevronDown size={12} />
        </button>
      </div>
      <div className="gh-term-fold" data-open={open || undefined}>
        <div className="gh-term-hero-meta" style={{ marginTop: 6 }}>{children}</div>
      </div>
    </>
  );
}

const GST_THRESHOLD = 60000;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-NZ")}`;
const short = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(n)}`);

/**
 * Rolling 12-month turnover against the $60k GST registration threshold
 * (Gray Horizon isn't GST registered yet). Paid Xero income only — a floor,
 * not an accrual figure.
 */
export function GstGauge({ rolling, pacePerMonth }: { rolling: number; pacePerMonth: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pct = (rolling / GST_THRESHOLD) * 100;
  const tone = pct >= 90 ? "bad" : pct >= 75 ? "warn" : undefined;
  const headroom = Math.max(0, GST_THRESHOLD - rolling);
  const monthsLeft = pacePerMonth > 0 ? headroom / pacePerMonth : Infinity;
  const crossing = new Date();
  crossing.setMonth(crossing.getMonth() + Math.ceil(monthsLeft));

  return (
    <>
      <button type="button" className="gh-term-mini" onClick={() => setOpen(true)} aria-label="GST threshold details">
        <span className="gh-term-mini-top">
          <span className="gh-term-eyebrow"><Landmark size={10} /> GST threshold</span>
          <b>{Math.round(pct)}%</b>
        </span>
        <Meter pct={pct} tone={tone} height={8} label="Turnover towards the GST threshold" />
        <span className="gh-term-small">{money(rolling)} of $60k · rolling 12 mo</span>
      </button>

      {open && (
        <div className="gh-term-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="gh-term-modal" role="dialog" aria-modal="true" aria-label="GST registration threshold">
            <div className="gh-term-modal-head">
              <span className="gh-term-ptitle">GST registration threshold</span>
              <button type="button" className="gh-icon-btn" style={{ marginLeft: "auto" }} onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="gh-term-modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 500, color: "var(--t-strong)" }}>
                  {money(rolling)} <span className="gh-term-small" style={{ fontSize: 14 }}>of {money(GST_THRESHOLD)}</span>
                </span>
                <span className="gh-term-small">Rolling 12 months</span>
              </div>
              <div className="gh-term-threshold" aria-label="Rolling turnover against the GST threshold">
                <i data-tone={tone} style={{ width: `${Math.min(100, pct)}%` }} />
                {[0.5, 0.75, 0.9].map((m) => (
                  <span key={m} style={{ left: `${m * 100}%` }}><em>{short(GST_THRESHOLD * m)}</em></span>
                ))}
              </div>
              <dl className="gh-term-kv">
                <div><dt>Headroom left</dt><dd>{money(headroom)}</dd></div>
                <div><dt>Pace (last 3 months)</dt><dd>{money(pacePerMonth)}/mo</dd></div>
                <div><dt>Months of headroom at that pace</dt><dd>{Number.isFinite(monthsLeft) ? monthsLeft.toFixed(1) : "—"}</dd></div>
                <div data-tone="warn">
                  <dt>Projected crossing</dt>
                  <dd>{Number.isFinite(monthsLeft) ? crossing.toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : "—"}</dd>
                </div>
              </dl>
              <p className="gh-term-small">
                Paid income from Xero by invoice date. Registration is required once turnover in any 12 months reaches $60,000, or is
                expected to in the next 12.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
