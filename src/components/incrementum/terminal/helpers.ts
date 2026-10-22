// Small formatting helpers the concept screens use (concept src/format.js,
// compute.js), on top of lib/incrementum/format.ts. Dates are ISO strings
// ("2026-10-22") or timestamps; everything renders in Pacific/Auckland.
import { money } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";

/** numeric column (string) → number, null stays null. */
export const num = (v: string | number | null | undefined) => toNum(v);
/** numeric column → number, null → 0. */
export const n0 = (v: string | number | null | undefined) => toNum(v) ?? 0;

function toDate(iso: string | Date) {
  if (iso instanceof Date) return iso;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
}

export function fmtDate(iso: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!iso) return "—";
  const d = toDate(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NZ", { ...opts, timeZone: "Pacific/Auckland" });
}
export const longDate = (iso: string | Date | null | undefined) => fmtDate(iso, { day: "numeric", month: "short", year: "numeric" });
export const monthName = (iso: string, long?: boolean) => fmtDate(iso, long ? { month: "long", year: "numeric" } : { month: "short" });

export function isoOf(d: string | Date): string {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(toDate(d));
}

export const daysBetween = (a: string, b: string) => Math.round((new Date(`${b.slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${a.slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000);

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function relativeTo(iso: string, today: string) {
  const d = daysBetween(today, iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 0) return `${-d} days ago`;
  return `in ${d} days`;
}

export const shortMoney = (v: number) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 100) / 10}k` : money(v));
export const short = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : money(v));

export const GOAL_STATUS_LABELS: Record<string, string> = { hit: "Hit", on_track: "On track", at_risk: "At risk", missed: "Missed", no_period: "No date" };
export const goalTone = (s: string) => (s === "hit" ? "good" : s === "at_risk" ? "warn" : s === "missed" ? "bad" : s === "on_track" ? "accent" : undefined);

/** Builds an href from a base path and query params, dropping empty ones. */
export function hrefWith(base: string, params: Record<string, string | number | null | undefined | false>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== false && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
