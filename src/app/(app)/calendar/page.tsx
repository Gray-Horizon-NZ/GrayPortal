import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { withCaller } from "@/lib/dal/auth";
import { listAllTasks } from "@/lib/dal/tasks";
import { getGoogleConnectionForSync } from "@/lib/dal/googleConnection";
import { listCalendarEventsInRange } from "@/lib/google/adapter";
import CalendarGrid from "./CalendarGrid";
import { addDays, addMonths, buildMonthGrid, buildWeekDays, parseDateStr, toDateStr } from "./dateGrid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view: viewParam, date: dateParam } = await searchParams;
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const view = viewParam === "month" ? "month" : "week";
  const todayStr = toDateStr(new Date());
  const anchor = parseDateStr(dateParam ?? todayStr);
  const anchorStr = toDateStr(anchor);

  const dayDates = view === "week" ? buildWeekDays(anchor) : buildMonthGrid(anchor);
  const days = dayDates.map(toDateStr);
  const rangeStart = dayDates[0];
  const rangeEnd = addDays(dayDates[dayDates.length - 1], 1);

  const [connection, events, tasks] = await Promise.all([
    getGoogleConnectionForSync(),
    listCalendarEventsInRange(rangeStart, rangeEnd),
    listAllTasks(),
  ]);

  const prevDate = toDateStr(view === "week" ? addDays(anchor, -7) : addMonths(anchor, -1));
  const nextDate = toDateStr(view === "week" ? addDays(anchor, 7) : addMonths(anchor, 1));

  const title =
    view === "month"
      ? anchor.toLocaleDateString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" })
      : `${dayDates[0].toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" })} – ${dayDates[6].toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 1200 }}>
      <div>
        <p className="gh-eyebrow">Work</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Calendar</h1>
      </div>

      {!connection ? (
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          No Google account connected. <Link href="/settings">Connect Google →</Link>
        </p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--gh-space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
              <Link
                href={`/calendar?view=${view}&date=${prevDate}`}
                className="gh-btn-secondary"
                aria-label="Previous"
                style={{ padding: "var(--gh-space-1) var(--gh-space-2)" }}
              >
                <ChevronLeft size={16} strokeWidth={1.75} />
              </Link>
              <Link href={`/calendar?view=${view}&date=${todayStr}`} className="gh-btn-secondary">Today</Link>
              <Link
                href={`/calendar?view=${view}&date=${nextDate}`}
                className="gh-btn-secondary"
                aria-label="Next"
                style={{ padding: "var(--gh-space-1) var(--gh-space-2)" }}
              >
                <ChevronRight size={16} strokeWidth={1.75} />
              </Link>
              <p className="gh-panel-title" style={{ marginLeft: "var(--gh-space-2)" }}>{title}</p>
            </div>
            <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
              <Link href={`/calendar?view=week&date=${anchorStr}`} className="gh-btn-secondary" data-active={view === "week" || undefined}>
                Week
              </Link>
              <Link href={`/calendar?view=month&date=${anchorStr}`} className="gh-btn-secondary" data-active={view === "month" || undefined}>
                Month
              </Link>
            </div>
          </div>

          <CalendarGrid
            view={view}
            days={days}
            monthAnchor={anchorStr.slice(0, 7)}
            todayStr={todayStr}
            events={events}
            tasks={tasks}
          />
        </>
      )}
    </div>
  );
}
