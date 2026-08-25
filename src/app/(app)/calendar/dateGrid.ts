// All arithmetic in UTC on date-only strings/instants — mirrors
// src/lib/google/adapter.ts's addDays helper. Avoids local-timezone drift
// shifting calendar days by one depending on the server's runtime TZ vs.
// Pacific/Auckland (Master-Brief.md's "UTC storage, NZ rendering" rule).

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDateStr(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMonths(d: Date, months: number): Date {
  const next = new Date(d);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/** Monday-based week start (NZ business convention). */
export function startOfWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** 7 consecutive days starting Monday of the week containing `anchor`. */
export function buildWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Full Mon-Sun weeks covering the month containing `anchor` (5 or 6 rows of 7). */
export function buildMonthGrid(anchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(anchor));
  const monthLastDay = addDays(startOfMonth(addMonths(anchor, 1)), -1);
  const gridEnd = addDays(startOfWeek(monthLastDay), 6);
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  return Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
}
