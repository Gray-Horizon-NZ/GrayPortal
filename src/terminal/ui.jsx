"use client";
// The terminal concept's UI kit (OS/grayportal-terminal-concept/src/ui.jsx),
// copied verbatim apart from go(), which navigates with the Next router.
import { useEffect, useRef, useState } from "react";
import { X, Upload, Pencil, ChevronDown } from "lucide-react";

// Concept routes that live at a different path in GrayPortal.
const ROUTES = {
  "/finance/owners-cut": "/finance/personal",
  "/brand": "/brand-guidelines",
  "/grayscale": "/grayscale-products",
};
let navigate = (href) => {
  window.location.href = href;
};
/** The shell registers the Next router here so go() is a client-side navigation. */
export const setNavigator = (fn) => {
  navigate = fn;
};
export const route = (href) => {
  const [path, query] = href.split("?");
  return (ROUTES[path] || path) + (query ? `?${query}` : "");
};
export const go = (href) => navigate(route(href));

// Animates bars/arcs from zero on mount, the way the in-game screens fill.
export function useMounted(delay = 60) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return on;
}

// Anything sensitive (money, contact details) goes through Priv so the
// "Blur private information" toggle can hide it in one place.
export function Priv({ children, as: Tag = "span", className = "" }) {
  return <Tag className={`priv ${className}`}>{children}</Tag>;
}

export function Panel({ title, icon: Icon, right, children, pad = true, className = "", style, id }) {
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

export function PageHead({ title, sub, children }) {
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

export function KV({ rows }) {
  return (
    <dl className="kv">
      {rows.filter(Boolean).map(([k, v, tone, priv]) => (
        <div key={k} data-tone={tone}>
          <dt>{k}</dt>
          <dd>{priv ? <Priv>{v}</Priv> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

// With `onToggle`, the sub-line folds away behind a click (calm view): the
// tile shows its value and `viz`, and the detail numbers open on demand.
export function Stat({ label, value, sub, tone, priv = true, accent, viz, open, onToggle }) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{priv ? <Priv>{value}</Priv> : value}</span>
      {viz && <span className="stat-viz">{viz}</span>}
    </>
  );
  if (!onToggle) {
    return (
      <div className="stat" data-tone={tone} data-accent={accent || undefined}>
        {body}
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    );
  }
  return (
    <button className="stat stat-fold" data-tone={tone} data-open={open || undefined} onClick={onToggle} aria-expanded={!!open}>
      <ChevronDown size={13} className="stat-chev" />
      {body}
      {sub && (
        <span className="fold">
          <span className="stat-sub">{sub}</span>
        </span>
      )}
    </button>
  );
}

export function Badge({ children, tone }) {
  return (
    <span className="badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
        <i />
      </button>
    </label>
  );
}

// Segmented control — the hangar's boxed tabs, squared off.
export function Seg({ value, onChange, options, small }) {
  return (
    <div className="seg" data-small={small || undefined} role="tablist">
      {options.map((o) => {
        const [v, label, count] = Array.isArray(o) ? o : [o, o];
        return (
          <button key={v} role="tab" aria-selected={value === v} data-active={value === v || undefined} onClick={() => onChange(v)}>
            {label}
            {count != null && <span className="seg-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" data-wide={wide || undefined} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <span className="ptitle">{title}</span>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={22} strokeWidth={1.5} />}
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

// 0–100 meter. Only for genuinely bounded values (health scores, rates,
// thresholds) — never for open-ended amounts.
export function Meter({ value, tone, height = 6, label }) {
  const on = useMounted();
  const w = Math.max(0, Math.min(100, value));
  return (
    <div className="meter" style={{ height }} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i data-tone={tone} style={{ width: on ? `${w}%` : 0 }} />
    </div>
  );
}

export const healthTone = (s) => (s >= 75 ? "good" : s >= 55 ? "warn" : "bad");

export function TrendGlyph({ trend }) {
  return <span className="trend" data-trend={trend}>{trend === "up" ? "▲" : trend === "down" ? "▼" : "■"}</span>;
}

export function initials(name) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const TINTS = ["#c2a468", "#d9487a", "#d4ff00", "#2a78d6", "#1f8a70", "#5fb3c9", "#7b5cd6", "#e8642c", "#8d8a80", "#f7f4ee"];

// Client banner: logo (or letter) centred on a grid pattern tinted with the
// client's chosen colour. On the profile, the colour + logo controls sit
// behind the edit (pencil) button.
export function BrandBanner({ client, height = 120, editable, onChange }) {
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const { color, logo } = client.brand;
  return (
    <div className="brand-banner" style={{ height, "--tint": color }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- client logo, same-origin route, sized by CSS */}
      {logo ? <img src={logo} alt={`${client.name} logo`} /> : <span className="brand-mono">{client.name.trim()[0].toUpperCase()}</span>}
      {editable && (
        <>
          <button className="brand-edit" onClick={() => setEditing(!editing)} aria-label="Edit banner" aria-expanded={editing}>
            <Pencil size={13} />
          </button>
          {editing && (
            <div className="brand-pop" onMouseLeave={() => setEditing(false)}>
              <p className="eyebrow">Tint colour</p>
              <div className="colorpick">
                <div className="swatches">
                  {TINTS.map((t) => (
                    <button key={t} style={{ background: t }} data-active={color === t || undefined} onClick={() => onChange({ color: t })} aria-label={`Tint ${t}`} />
                  ))}
                </div>
                <input type="color" value={color} onChange={(e) => onChange({ color: e.target.value })} aria-label="Custom tint" />
              </div>
              <p className="eyebrow" style={{ marginTop: 12 }}>Logo</p>
              <div className="row">
                <button className="btn btn-sm" onClick={() => fileRef.current?.click()}><Upload size={12} /> {logo ? "Replace" : "Upload"}</button>
                {logo && <button className="btn btn-sm btn-danger" onClick={() => onChange({ logo: null })}>Remove</button>}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => onChange({ logo: r.result });
                  r.readAsDataURL(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Header dropdown (alerts / inquiries) — closes on outside click or Escape.
export function Dropdown({ open, onClose, children, width = 360 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && !e.target.closest("[data-dropdown-trigger]") && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dropdown" ref={ref} style={{ width }}>
      {children}
    </div>
  );
}

// CSV download — quoted fields, CRLF rows, BOM so Excel reads UTF-8.
export function downloadCsv(filename, header, rows) {
  const esc = (v) => {
    const t = v == null ? "" : String(v);
    return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const body = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isLight(hex) {
  const h = (hex || "#000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}
