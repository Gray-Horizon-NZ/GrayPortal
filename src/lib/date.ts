/** Converts a "YYYY-MM" value from an `<input type="month">` into a full
 * "YYYY-MM-01" date string for storage — billing dates only need
 * month/year precision in the UI, but the DB column is `date`. */
export function monthInputToDate(value: string): string | undefined {
  if (!value) return undefined;
  return `${value}-01`;
}

/** Whole days remaining until `expiresAt`, floored at 0. A separate module
 * function, not an inline `Date.now()` in a component body, so it doesn't
 * trip react-hooks/purity's "no impure calls during render" rule (same
 * reason paymentStatus.ts's `new Date()` lives in its own module). */
export function daysUntil(expiresAt: Date | string): number {
  const target = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatClockParts(iso: string): { time: string; period: string } {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Pacific/Auckland",
    hour12: true,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toLowerCase();
  return { time: minute === "00" ? hour : `${hour}:${minute}`, period };
}

/**
 * Compact "11:30 am–12:30 pm" / "1–4 pm" range for a timed calendar event —
 * drops the repeated am/pm suffix on the start side when both times fall on
 * the same side of noon, matching how Google Calendar itself displays
 * same-period ranges. Always in Pacific/Auckland regardless of server TZ
 * (see Master-Brief.md's "UTC storage, NZ rendering" rule) — returns null
 * for all-day events, which have no time-of-day to show.
 */
export function formatEventTimeRange(event: { start: string; end: string; allDay: boolean }): string | null {
  if (event.allDay) return null;
  const start = formatClockParts(event.start);
  if (!event.end) return `${start.time} ${start.period}`;
  const end = formatClockParts(event.end);
  if (start.period === end.period) return `${start.time}–${end.time} ${end.period}`;
  return `${start.time} ${start.period}–${end.time} ${end.period}`;
}
