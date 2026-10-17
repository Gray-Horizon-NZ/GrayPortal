import type { MetricUnit } from "./registry";

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const nzdCents = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(n: number | string | null | undefined, cents = false): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return cents ? nzdCents.format(v) : nzd.format(v);
}

export function formatMetric(value: number | null | undefined, unit: MetricUnit): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  switch (unit) {
    case "currency":
      return money(value);
    case "percent":
      return `${Math.round(value * 10) / 10}%`;
    case "hours":
      return `${Math.round(value * 10) / 10} h`;
    case "minutes":
      return value >= 120 ? `${Math.round((value / 60) * 10) / 10} h` : `${Math.round(value)} min`;
    case "months":
      return `${Math.round(value * 10) / 10} mo`;
    default:
      return String(Math.round(value * 10) / 10);
  }
}

export function formatTarget(comparator: string, target: number | null, unit: MetricUnit): string {
  if (target === null) return "";
  return `${comparator === "lte" ? "≤" : "≥"} ${formatMetric(target, unit)}`;
}

const dateFmt = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "Pacific/Auckland" });
const dateYearFmt = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Auckland" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Pacific/Auckland",
});

/** Accepts an ISO date ("2026-10-18") or a Date/timestamp. */
export function shortDate(d: string | Date | null | undefined, withYear = false): string {
  if (!d) return "—";
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00Z`) : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return (withYear ? dateYearFmt : dateFmt).format(date);
}

export function shortDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFmt.format(date);
}

/** Today in Pacific/Auckland as an ISO date. */
export function todayNz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
}

export function daysUntil(iso: string, from: string = todayNz()): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function relativeDays(iso: string | null): string {
  if (!iso) return "";
  const n = daysUntil(iso);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function minutesSince(d: Date | string): number {
  return Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60_000));
}

/**
 * Auckland wall-clock time ("2027-01-11T09:30:00") → the real UTC instant,
 * daylight saving included (NZDT +13 / NZST +12).
 */
export function aucklandLocalToUtc(local: string): Date {
  const guess = new Date(`${local}Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Auckland",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(guess.getTime() - (asLocal - guess.getTime()));
}
