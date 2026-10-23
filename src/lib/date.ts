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

// ─── New Zealand time ───────────────────────────────────────────────────
// Gray Horizon works in NZ time; servers run in UTC. Use these for any
// "today", due date or wall-clock time instead of toISOString(), which is
// UTC and still says yesterday until 11am–1pm in NZ.
const NZ = "Pacific/Auckland";
const nzDateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: NZ });

/** The NZ calendar date (YYYY-MM-DD) of an instant — now by default. */
export function nzToday(at: Date = new Date()): string {
  return nzDateFmt.format(at);
}

/** Today's NZ date plus `days` (YYYY-MM-DD). */
export function nzDaysFromToday(days: number): string {
  const d = new Date(`${nzToday()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's NZ date plus `months` (YYYY-MM-DD). */
export function nzMonthsFromToday(months: number): string {
  const d = new Date(`${nzToday()}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Minutes NZ is ahead of UTC at an instant (720 in NZST, 780 in NZDT). */
function nzOffsetMinutes(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: NZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(at.getTime() / 60000) * 60000) / 60000;
}

/** Reads an `<input type="datetime-local">` value ("YYYY-MM-DDTHH:MM") as NZ wall-clock time; returns the UTC ISO instant. */
export function nzLocalToIso(value: string): string {
  const asUtc = new Date(`${value.slice(0, 16)}:00Z`);
  let t = asUtc.getTime() - nzOffsetMinutes(asUtc) * 60000;
  t = asUtc.getTime() - nzOffsetMinutes(new Date(t)) * 60000; // settle across a DST change
  return new Date(t).toISOString();
}

/** An instant as NZ wall-clock time for a `datetime-local` input ("YYYY-MM-DDTHH:MM"). */
export function isoToNzLocal(at: Date | string): string {
  const d = new Date(at);
  return new Date(d.getTime() + nzOffsetMinutes(d) * 60000).toISOString().slice(0, 16);
}
