// Terminal kit for Project Incrementum, ported from the approved concept
// (OS/GrayPortal/terminal-concepts/incrementum-terminal-concept: src/terminal.jsx, ui.jsx, parts.jsx).
// Server components: where the concept kept a view, tab, filter or
// selection in state, these take an href and the page reads it back from
// the URL. Folds are <details>; pop-ups are <dialog> (see ./client).
// Fill-on-load animation is CSS (incrementum.css), so nothing here needs JS.
//   Console      one framed console: identity side + main (bunker, nightclub)
//   IdCard       art + name strip + LABEL: value rows (bunker, nightclub)
//   Blocks       big block action buttons down the side (bunker)
//   TermStatus   "BUSINESS STATUS: ACTIVE" (bunker, MC business)
//   LevelBars    thick labelled stock/supply bars (bunker, MC business)
//   TotalSplit   "Total Earnings | Total Sales" (MC business, nightclub)
//   BigAction    full-width priced action bar (hangar "Sell All Cargo")
//   Ring/RingTile hangar cargo rings, numerator in gold
//   ServiceSlots nightclub staff goods buttons: assigned / open / locked
//   StockColumns nightclub dash vertical stock columns + total
//   Tree         agency folder tree with a stats ledger at its foot
//   Bracket      agency "[ Accept contract ]" button
import { useId } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Lock, UserRound, FolderOpen, FileText, ChevronRight, ChevronDown, AlertTriangle, Clock, Plus, Check as CheckIcon } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { money } from "@/lib/incrementum/format";
import { OpenDialog } from "./client";

type Action = (fd: FormData) => Promise<void>;
type Hidden = Record<string, string | number | null | undefined>;

export function HiddenFields({ values }: { values?: Hidden }) {
  if (!values) return null;
  return (
    <>
      {Object.entries(values).map(([k, v]) => (v === null || v === undefined ? null : <input key={k} type="hidden" name={k} value={String(v)} />))}
    </>
  );
}

// Anything sensitive (money, contact details) goes through Priv so the
// "Blur private information" toggle can hide it in one place.
export function Priv({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`priv ${className}`}>{children}</span>;
}

export function Console({ side, children, className = "", sideWidth }: { side?: React.ReactNode; children: React.ReactNode; className?: string; sideWidth?: number }) {
  return (
    <section className={`console ${side ? "has-side" : ""} ${className}`} style={sideWidth ? ({ "--side": `${sideWidth}px` } as React.CSSProperties) : undefined}>
      {side && <aside className="console-side">{side}</aside>}
      <div className="console-main">{children}</div>
    </section>
  );
}

export function Csec({ children, className = "", title, right }: { children?: React.ReactNode; className?: string; title?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className={`csec ${className}`}>
      {title && (
        <div className="csec-head">
          <span className="csec-title">{title}</span>
          {right && <span className="csec-right">{right}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export type IdRow = [string, React.ReactNode, boolean?] | null | false | undefined | "";

export function IdCard({ art, strip, rows = [], tint }: { art?: React.ReactNode; strip?: React.ReactNode; rows?: IdRow[]; tint?: string }) {
  const shown = rows.filter(Boolean) as [string, React.ReactNode, boolean?][];
  return (
    <div className="idcard">
      {art && (
        <div className="idcard-art brand-banner" style={{ "--tint": tint || "var(--t-accent)" } as React.CSSProperties}>
          {art}
        </div>
      )}
      {strip && <div className="idcard-strip">{strip}</div>}
      {shown.length > 0 && (
        <dl className="idcard-rows">
          {shown.map(([k, v, priv]) => (
            <div key={k}>
              <dt>{k}:</dt>
              <dd>{priv ? <Priv>{v}</Priv> : v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function Monogram({ text, big }: { text: string; big?: boolean }) {
  return (
    <span className="mono-art" data-big={big || undefined}>
      {text}
    </span>
  );
}

/** Side action buttons: `href` links (a view), `dialog` opens a pop-up. The open view gets the gold edge. */
export type BlockItem = { key?: string; label: string; icon?: LucideIcon; href?: string; dialog?: string; count?: number | null; tone?: string; disabled?: boolean; active?: boolean } | null | false | undefined;

export function Blocks({ items, value }: { items: BlockItem[]; value?: string }) {
  return (
    <div className="blocks">
      {(items.filter(Boolean) as Exclude<BlockItem, null | false | undefined>[]).map((it) => {
        const active = it.active || (it.key !== undefined && value === it.key) || undefined;
        const inner = (
          <>
            {it.icon && <it.icon size={15} strokeWidth={1.75} />}
            <span>{it.label}</span>
            {it.count ? <span className="block-count">{it.count}</span> : null}
          </>
        );
        if (it.href && !it.disabled)
          return (
            <Link key={it.key ?? it.label} href={it.href} className="block" data-active={active} data-tone={it.tone} scroll={false}>
              {inner}
            </Link>
          );
        if (it.dialog && !it.disabled)
          return (
            <OpenDialog key={it.key ?? it.label} target={it.dialog} className="block" data-tone={it.tone}>
              {inner}
            </OpenDialog>
          );
        return (
          <button key={it.key ?? it.label} className="block" data-active={active} data-tone={it.tone} disabled type="button">
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export function TermStatus({ label, value, tone, children }: { label: string; value: React.ReactNode; tone?: string; children?: React.ReactNode }) {
  return (
    <div className="tstatus">
      <span className="status">
        {label}: <em data-tone={tone}>{value}</em>
      </span>
      {children && <span className="tstatus-meta">{children}</span>}
    </div>
  );
}

const clamp01 = (v: number | null | undefined) => Math.max(0, Math.min(1, v || 0));

export type LevelRow = { label: string; value: number | null; tone?: string; right?: React.ReactNode; marks?: number[]; title?: string } | null | false | undefined;

/** rows: [{ label, value (0–1), tone, right }] */
export function LevelBars({ rows }: { rows: LevelRow[] }) {
  return (
    <div className="levels">
      {(rows.filter(Boolean) as Exclude<LevelRow, null | false | undefined>[]).map((r) => (
        <div className="level" key={r.label} title={r.title}>
          <span className="level-label">{r.label}</span>
          <span className="level-track">
            <i data-tone={r.tone} style={{ width: `${clamp01(r.value) * 100}%` }} />
            {(r.marks || []).map((m, i) => (
              <b key={i} style={{ left: `${m * 100}%` }} />
            ))}
          </span>
          <span className="level-right">{r.right}</span>
        </div>
      ))}
    </div>
  );
}

export function TotalSplit({ items }: { items: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string; priv?: boolean }[] }) {
  return (
    <div className="tsplit" style={{ "--n": items.length } as React.CSSProperties}>
      {items.map((it) => (
        <div key={it.label} data-tone={it.tone}>
          <span className="tsplit-label">{it.label}</span>
          <span className="tsplit-value">{it.priv ? <Priv>{it.value}</Priv> : it.value}</span>
          {it.sub && <span className="tsplit-sub">{it.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * The one next action at the foot of a console. Exactly one of `href`
 * (navigate), `dialog` (open a pop-up), `action` (post a form with
 * `hidden` fields) or `formId` (submit a form on the page) makes it live; with none, or `disabled`, it's grey.
 */
export function BigAction({
  label,
  value,
  sub,
  href,
  dialog,
  action,
  formId,
  hidden,
  disabled,
  variant,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  dialog?: string;
  action?: Action;
  /** Submits the form with this id elsewhere on the page. */
  formId?: string;
  hidden?: Hidden;
  disabled?: boolean;
  variant?: string;
}) {
  const inner = (
    <>
      <span className="bigaction-label">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      {value !== undefined && <span className="bigaction-value">{value}</span>}
    </>
  );
  if (!disabled && href)
    return (
      <Link href={href} className="bigaction" data-variant={variant}>
        {inner}
      </Link>
    );
  if (!disabled && dialog)
    return (
      <OpenDialog target={dialog} className="bigaction" data-variant={variant}>
        {inner}
      </OpenDialog>
    );
  if (!disabled && formId)
    return (
      <button type="submit" form={formId} className="bigaction" data-variant={variant}>
        {inner}
      </button>
    );
  if (!disabled && action)
    return (
      <form action={action} style={{ display: "contents" }}>
        <HiddenFields values={hidden} />
        <button type="submit" className="bigaction" data-variant={variant}>
          {inner}
        </button>
      </form>
    );
  return (
    <button type="button" className="bigaction" data-variant={variant} disabled>
      {inner}
    </button>
  );
}

/** Hangar cargo ring: a thick track, a gold arc, "value/max" with the value in gold. */
export function Ring({
  value,
  max,
  size = 168,
  stroke,
  center,
  label,
  sub,
  mark,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  center?: React.ReactNode;
  label?: React.ReactNode;
  sub?: React.ReactNode;
  mark?: number | null;
}) {
  const gid = `inc-ring-${useId().replace(/:/g, "")}`;
  const sw = stroke ?? Math.round(size * 0.085);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.max(0, Math.min(1, value / max)) : 0;
  const markAngle = mark !== undefined && mark !== null ? mark * 2 * Math.PI - Math.PI / 2 : null;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="ring-stop-a" />
            <stop offset="100%" className="ring-stop-b" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-arc"
          strokeWidth={sw}
          stroke={`url(#${gid})`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ "--ring-c": c } as React.CSSProperties}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {markAngle !== null && (
          <line
            className="ring-mark"
            x1={size / 2 + (r - sw / 2 - 3) * Math.cos(markAngle)}
            y1={size / 2 + (r - sw / 2 - 3) * Math.sin(markAngle)}
            x2={size / 2 + (r + sw / 2 + 3) * Math.cos(markAngle)}
            y2={size / 2 + (r + sw / 2 + 3) * Math.sin(markAngle)}
          />
        )}
      </svg>
      <div className="ring-center" style={{ fontSize: Math.round(size * 0.2) }}>
        {label && <small className="ring-label">{label}</small>}
        <span className="ring-value">
          {center ?? (
            <>
              <b>{value}</b>/{max}
            </>
          )}
        </span>
        {sub && <small className="ring-sub">{sub}</small>}
      </div>
    </div>
  );
}

export function RingTile({
  name,
  active,
  href,
  dialog,
  children,
  action,
  foot,
  done,
}: {
  name: React.ReactNode;
  active?: boolean;
  href?: string;
  dialog?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  foot?: React.ReactNode;
  done?: boolean;
}) {
  const inner = (
    <>
      <span className="ringtile-name">{name}</span>
      {children}
      {action}
      {foot && <span className="ringtile-foot">{foot}</span>}
    </>
  );
  if (href)
    return (
      <Link href={href} className="ringtile" data-active={active || undefined} data-done={done || undefined} scroll={false}>
        {inner}
      </Link>
    );
  if (dialog)
    return (
      <OpenDialog target={dialog} className="ringtile" data-active={active || undefined} data-done={done || undefined}>
        {inner}
      </OpenDialog>
    );
  return (
    <div className="ringtile" data-active={active || undefined} data-done={done || undefined}>
      {inner}
    </div>
  );
}

/** slots: [{ key, label, state: "assigned" | "open" | "locked", sub, active, href }] */
export function ServiceSlots({ slots }: { slots: { key: string; label: string; state: "assigned" | "open" | "locked"; sub?: React.ReactNode; active?: boolean; href: string; title?: string }[] }) {
  return (
    <div className="slots">
      {slots.map((s) => (
        <Link key={s.key} href={s.href} className="slot" data-state={s.state} data-active={s.active || undefined} title={s.title} scroll={false}>
          <span className="slot-label">
            {s.label}
            {s.sub && <small>{s.sub}</small>}
          </span>
          {s.state === "assigned" ? <UserRound size={18} /> : s.state === "open" ? <span className="slot-open">Open</span> : <Lock size={16} />}
        </Link>
      ))}
    </div>
  );
}

/** items: [{ key, label, value, max, tone, href, active }] */
export function StockColumns({
  items,
  total,
  totalLabel,
  totalSub,
}: {
  items: { key: string; label: string; value: number; max: number; tone?: string; href: string; active?: boolean }[];
  total?: React.ReactNode;
  totalLabel?: React.ReactNode;
  totalSub?: React.ReactNode;
}) {
  return (
    <div className="stockcols">
      <div className="stockcols-cols">
        {items.map((it) => (
          <Link key={it.key} href={it.href} className="stockcol" data-active={it.active || undefined} title={`${it.label}: ${it.value}/${it.max}`} scroll={false}>
            <i data-tone={it.tone} style={{ height: `${it.max ? Math.min(1, it.value / it.max) * 100 : 0}%` }} />
            <span className="stockcol-label">{it.label}</span>
            <span className="stockcol-val">
              {it.value}/{it.max}
            </span>
          </Link>
        ))}
      </div>
      {total !== undefined && (
        <div className="stockcols-total">
          <span>{totalLabel}</span>
          <b>{total}</b>
          {totalSub && <small>{totalSub}</small>}
        </div>
      )}
    </div>
  );
}

/** groups: [{ label, items: [{ key, label, count, tone, href }] }] */
export function Tree({
  groups,
  value,
  head,
  foot,
}: {
  groups: { label: string; items: { key: string; label: React.ReactNode; count?: number | string; tone?: string; href: string }[] }[];
  value?: string | null;
  head?: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <div className="tree">
      {head}
      {groups.map((g) => (
        <div key={g.label} className="tree-group">
          <p className="tree-folder">
            <FolderOpen size={13} /> {g.label}
          </p>
          {g.items.map((it) => (
            <Link key={it.key} href={it.href} className="tree-item" data-active={value === it.key || undefined} scroll={false}>
              <FileText size={12} />
              <span>{it.label}</span>
              {it.count !== undefined && (
                <span className="tree-count" data-tone={it.tone}>
                  {it.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
      {foot && <div className="tree-foot">{foot}</div>}
    </div>
  );
}

/** Agency "· Accept contract ·" button: a link, a pop-up opener or a submit button. */
export function Bracket({ children, href, dialog, submit, disabled, wide }: { children: React.ReactNode; href?: string; dialog?: string; submit?: boolean; disabled?: boolean; wide?: boolean }) {
  const inner = <span>{children}</span>;
  if (href && !disabled)
    return (
      <Link href={href} className="bracket" data-wide={wide || undefined}>
        {inner}
      </Link>
    );
  if (dialog && !disabled)
    return (
      <OpenDialog target={dialog} className="bracket" data-wide={wide || undefined}>
        {inner}
      </OpenDialog>
    );
  if (submit && !disabled)
    return (
      <SubmitButton className="bracket">
        {inner}
      </SubmitButton>
    );
  return (
    <button className="bracket" type="button" disabled data-wide={wide || undefined}>
      {inner}
    </button>
  );
}

export type LedgerRow = [string, React.ReactNode, string?, string?] | null | false | undefined | "";

/** A plain rows ledger with the reference's right-aligned values. A 4th item makes the row a link. */
export function Ledger({ rows }: { rows: LedgerRow[] }) {
  return (
    <dl className="ledger">
      {(rows.filter(Boolean) as [string, React.ReactNode, string?, string?][]).map(([k, v, tone, href]) =>
        href ? (
          <Link key={k} href={href} data-tone={tone} data-click>
            <dt>{k}</dt>
            <dd>{v}</dd>
            <ChevronRight size={13} className="ledger-go" />
          </Link>
        ) : (
          <div key={k} data-tone={tone}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        )
      )}
    </dl>
  );
}

// ─── ui.jsx ─────────────────────────────────────────────────────────────

export function Panel({
  title,
  icon: Icon,
  right,
  children,
  pad = true,
  className = "",
  style,
  id,
}: {
  title?: React.ReactNode;
  icon?: LucideIcon;
  right?: React.ReactNode;
  children?: React.ReactNode;
  pad?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}) {
  return (
    <section className={`panel ${className}`} style={style} id={id}>
      {title && (
        <header className="phead">
          {Icon && <Icon size={13} strokeWidth={2} />}
          <span className="ptitle">{title}</span>
          {right && <span className="r">{right}</span>}
        </header>
      )}
      <div className={pad ? "panel-pad" : undefined}>{children}</div>
    </section>
  );
}

export function PageHead({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="pagehead">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="pagehead-actions">{children}</div>}
    </div>
  );
}

export type KVRow = [string, React.ReactNode, string?, boolean?] | null | false | undefined | "";

export function KV({ rows }: { rows: KVRow[] }) {
  return (
    <dl className="kv">
      {(rows.filter(Boolean) as [string, React.ReactNode, string?, boolean?][]).map(([k, v, tone, priv]) => (
        <div key={k} data-tone={tone}>
          <dt>{k}</dt>
          <dd>{priv ? <Priv>{v}</Priv> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

// With `fold`, the sub-line folds away behind a click (calm view): the tile
// shows its value and `viz`, and the detail numbers open on demand.
export function Stat({
  label,
  value,
  sub,
  tone,
  priv = true,
  accent,
  viz,
  fold,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: string;
  priv?: boolean;
  accent?: boolean;
  viz?: React.ReactNode;
  fold?: boolean;
}) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{priv ? <Priv>{value}</Priv> : value}</span>
      {viz && <span className="stat-viz">{viz}</span>}
    </>
  );
  if (!fold || !sub) {
    return (
      <div className="stat" data-tone={tone} data-accent={accent || undefined}>
        {body}
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    );
  }
  return (
    <details className="stat stat-fold" data-tone={tone}>
      <summary>
        <ChevronDown size={13} className="stat-chev" />
        {body}
      </summary>
      <span className="stat-sub">{sub}</span>
    </details>
  );
}

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className="badge" data-tone={tone}>
      {children}
    </span>
  );
}

// Segmented control — the hangar's boxed tabs, squared off. Options link.
export function Seg({ value, options, small }: { value: string | null | undefined; options: [string, React.ReactNode, string, (number | null)?][]; small?: boolean }) {
  return (
    <div className="seg" data-small={small || undefined} role="tablist">
      {options.map(([v, label, href, count]) => (
        <Link key={v} href={href} role="tab" aria-selected={value === v} data-active={value === v || undefined} scroll={false}>
          {label}
          {count !== null && count !== undefined && <span className="seg-count">{count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon?: LucideIcon; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="empty">
      {Icon && <Icon size={22} strokeWidth={1.5} />}
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

// 0–100 meter. Only for genuinely bounded values.
export function Meter({ value, tone, height = 6, label }: { value: number; tone?: string; height?: number; label?: string }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div className="meter" style={{ height }} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i data-tone={tone} style={{ width: `${w}%` }} />
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── parts.jsx ──────────────────────────────────────────────────────────

// Square tick box (launch items, tasks, criteria, milestones). With an
// action it's a one-click form button.
export function Check({ done, na, action, hidden, label, disabled }: { done?: boolean; na?: boolean; action?: Action; hidden?: Hidden; label?: string; disabled?: boolean }) {
  const mark = done ? "✓" : na ? "–" : "";
  if (!action || disabled)
    return (
      <span className="check" data-done={done || undefined} data-na={na || undefined} aria-label={label}>
        {mark}
      </span>
    );
  return (
    <form action={action} style={{ display: "contents" }}>
      <HiddenFields values={hidden} />
      <button type="submit" className="check" data-done={done || undefined} data-na={na || undefined} aria-label={label} title={label}>
        {mark}
      </button>
    </form>
  );
}

/** The concept's switch row, as a real checkbox (submit-on-change via AutoSubmitForm). */
export function Toggle({ name, defaultChecked, label, hint, value = "on" }: { name: string; defaultChecked?: boolean; label: React.ReactNode; hint?: React.ReactNode; value?: string }) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" className="switch-input" name={name} value={value} defaultChecked={defaultChecked} />
      <span className="switch" aria-hidden="true">
        <i />
      </span>
    </label>
  );
}

export function Field({ label, children, wide }: { label: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className="field" data-wide={wide || undefined}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// Compact row that clicks open to edit (Max's list-screen preference):
// summary always visible, the body folds open underneath.
export function RowFold({ summary, children, defaultOpen = false, className = "", id }: { summary: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; className?: string; id?: string }) {
  return (
    <details className={`rowfold ${className}`} id={id} open={defaultOpen || undefined}>
      <summary className="rowfold-sum">
        {summary}
        <ChevronDown size={14} className="rowfold-chev" />
      </summary>
      <div className="rowfold-body">{children}</div>
    </details>
  );
}

// "+ New …" row at the foot of a list.
export function AddRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="rowfold addrow">
      <summary className="rowfold-sum addrow-sum">
        <Plus size={14} /> {label}
      </summary>
      <div className="rowfold-body">{children}</div>
    </details>
  );
}

// Hangar stage tiles. The selected tile is outlined gold and drives what's below.
export function StageTiles({
  tiles,
  value,
  cols,
  compact,
}: {
  tiles: { key: string; name: React.ReactNode; n: React.ReactNode; v?: React.ReactNode; bar?: number; w?: React.ReactNode; done?: boolean; href: string }[];
  value?: string | null;
  cols?: number;
  compact?: boolean;
}) {
  return (
    <div className={`stagetiles${compact ? " compact" : ""}`} style={cols ? ({ "--cols": cols } as React.CSSProperties) : undefined}>
      {tiles.map((t) => (
        <Link key={t.key} href={t.href} className="stagetile" data-active={value === t.key || undefined} data-done={t.done || undefined} aria-pressed={value === t.key} scroll={false}>
          <span className="name">{t.name}</span>
          <span className="n">{t.n}</span>
          {t.v !== undefined && <span className="v">{t.v}</span>}
          {t.bar !== undefined && <MiniBar value={t.bar} tone={t.done ? "good" : undefined} />}
          {t.w && <span className="w">{t.w}</span>}
        </Link>
      ))}
    </div>
  );
}

export function MiniBar({ value, tone, markers = [] }: { value: number; tone?: string; markers?: number[] }) {
  return (
    <span className="minibar">
      <i data-tone={tone} style={{ width: `${clamp01(value) * 100}%` }} />
      {markers.map((m, i) => (
        <b key={i} style={{ left: `${clamp01(m) * 100}%` }} />
      ))}
    </span>
  );
}

/** Steps; with `action`, each other step is a submit button posting `name=<key>`. */
export function Stepper({
  steps,
  current,
  action,
  hidden,
  name = "stage",
  disabled = [],
}: {
  steps: { key: string; label: string; off?: boolean }[];
  current: string;
  action?: Action;
  hidden?: Hidden;
  name?: string;
  disabled?: string[];
}) {
  const ci = steps.findIndex((s) => s.key === current);
  const body = steps.map((s, i) => {
    const can = action && !disabled.includes(s.key) && s.key !== current;
    const props = { "data-current": s.key === current || undefined, "data-done": (ci > i && !s.off) || undefined };
    return can ? (
      <button key={s.key} type="submit" name={name} value={s.key} title={`Move to ${s.label}`} {...props}>
        {s.label}
      </button>
    ) : (
      <span key={s.key} {...props}>
        {s.label}
      </span>
    );
  });
  if (!action) return <div className="stepper stepper-lg">{body}</div>;
  return (
    <form action={action} className="stepper stepper-lg">
      <HiddenFields values={hidden} />
      {body}
    </form>
  );
}

// Icon + sentence rows; the whole row is the link (agency screen).
export function DueList({ items, empty = "All clear." }: { items: { key: string; href: string; title: React.ReactNode; detail?: React.ReactNode; tone?: string }[]; empty?: string }) {
  if (!items.length) return <p className="muted small">{empty}</p>;
  return (
    <div className="due">
      {items.map((a) => (
        <Link key={a.key} href={a.href}>
          {a.tone === "bad" ? <AlertTriangle size={15} /> : a.tone === "warn" ? <Clock size={15} data-tone="warn" /> : <ChevronRight size={15} data-tone="muted" />}
          <span>{a.title}</span>
          {a.detail && <span className="muted small due-detail">{a.detail}</span>}
          <span className="go">Open ›</span>
        </Link>
      ))}
    </div>
  );
}

export function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link className="backlink" href={href}>
      ← {label}
    </Link>
  );
}

export function Avatar({ name, size = 34, active }: { name: string | null; size?: number; active?: boolean }) {
  return (
    <span className="avatar-sq" style={{ width: size, height: size, fontSize: size * 0.38 }} data-active={active || undefined}>
      {initials(name || "?")}
    </span>
  );
}

// Freedom number bar: profit against Diamond, with Target and Gold marks.
export function FreedomBar({ profit, base, stretch }: { profit: number; base: number; stretch: number }) {
  const end = Math.max(base, stretch);
  const pct = end > 0 ? clamp01(profit / end) : 0;
  return (
    <div className="tierbar" aria-label="Progress to the base and the stretch">
      <div className="tierbar-track">
        <i style={{ width: `${pct * 100}%` }} />
        {(
          [
            ["Base", base],
            ["Stretch", stretch],
          ] as const
        ).map(([l, v]) => (
          <span key={l} className="tier-mark" data-end={v === end || undefined} style={{ left: `${end > 0 ? (v / end) * 100 : 0}%` }}>
            <em>
              {l} <Priv>{money(v)}</Priv>
            </em>
          </span>
        ))}
      </div>
    </div>
  );
}

// Nightclub staff tile: portrait with name strip; "Hire" tile for an open seat.
export function Portrait({ name, sub, href, dialog, state, tag }: { name?: string | null; sub?: React.ReactNode; href?: string; dialog?: string; state?: string; tag?: React.ReactNode }) {
  if (!name) {
    const inner = (
      <span className="hire">
        <Plus size={16} /> Hire
        {sub && <small>{sub}</small>}
      </span>
    );
    return dialog ? (
      <OpenDialog target={dialog} className="portrait" data-state="open">
        {inner}
      </OpenDialog>
    ) : (
      <Link href={href ?? "#"} className="portrait" data-state="open">
        {inner}
      </Link>
    );
  }
  return (
    <Link href={href ?? "#"} className="portrait" data-state={state} scroll={false}>
      {tag && <span className="tag">{tag}</span>}
      <span className="mono">{initials(name)}</span>
      <span className="who">
        {name}
        <small>{sub}</small>
      </span>
    </Link>
  );
}

export function LockedTile({ label }: { label: string }) {
  return (
    <div className="portrait" data-state="locked" aria-label={`${label}: locked`}>
      <Lock size={16} />
      <span className="who">
        {label}
        <small>No client needs it yet</small>
      </span>
    </div>
  );
}

/** Everything onboarding writes into GrayPortal, so an Incrementum client is a normal GrayPortal client too. */
export function GrayPortalChecklist({ existing }: { existing?: boolean }) {
  const rows = existing
    ? [
        ["Linked to their existing client record", "company, contacts and history stay where they are"],
        ["Services added to their client profile", "monthly lines and one-offs at the line prices, tagged Incrementum, kept in step as lines change"],
        ["Shown in GrayPortal's Clients list", "with an Incrementum badge and a link back here"],
      ]
    : [
        ["Company + client record", "with the website, source and size"],
        ["Contact person", "name, email and phone"],
        ["Client portal login", "invite sent to the portal email"],
        ["Starter tasks", "the onboarding checklist"],
        ["Services on the client profile", "monthly lines and one-offs at the line prices, tagged Incrementum, kept in step as lines change"],
        ["Lead history", "their message, notes, emails and calls copied to the client timeline (from a lead)"],
        ["Shown in GrayPortal's Clients list", "with an Incrementum badge and a link back here"],
      ];
  return (
    <div className="gpcheck">
      <p className="eyebrow" style={{ marginBottom: 6 }}>
        Creates in GrayPortal
      </p>
      {rows.map(([k, v]) => (
        <div key={k}>
          <CheckIcon size={14} />
          <span>
            <b>{k}</b> · <span className="muted">{v}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Shared "_back" hidden field so one action serves several pages. */
export function BackTo({ path }: { path: string }) {
  return <input type="hidden" name="_back" value={path} />;
}
