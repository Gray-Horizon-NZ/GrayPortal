"use client";
import { useMemo, useState } from "react";
import DayTasksPopup from "./DayTasksPopup";
import { formatEventTimeRange } from "@/lib/date";

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarSummary?: string;
  color?: string;
};
type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  starred?: boolean;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarGrid({
  view,
  days,
  monthAnchor,
  todayStr,
  events,
  tasks,
}: {
  view: "week" | "month";
  days: string[];
  monthAnchor: string; // "YYYY-MM" — days outside this month are greyed in month view
  todayStr: string;
  events: CalendarEvent[];
  tasks: Task[];
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const day = e.allDay ? e.start : e.start.slice(0, 10);
      m.set(day, [...(m.get(day) ?? []), e]);
    }
    return m;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      m.set(t.dueDate, [...(m.get(t.dueDate) ?? []), t]);
    }
    return m;
  }, [tasks]);

  // Same cap in both views, and low enough to actually fit the fixed cell
  // height below — a day with more than this just shows "+N more" rather
  // than growing its cell (and thus its whole grid row) taller than its
  // neighbors.
  const maxShown = 3;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          background: "var(--gh-border)",
          border: "1px solid var(--gh-border)",
        }}
      >
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="gh-eyebrow" style={{ background: "var(--gh-surface)", padding: "var(--gh-space-2)", textAlign: "center" }}>
            {label}
          </div>
        ))}

        {days.map((day) => {
          const dayEvents = eventsByDay.get(day) ?? [];
          const dayTasks = tasksByDay.get(day) ?? [];
          const inMonth = view === "week" || day.slice(0, 7) === monthAnchor;
          const isToday = day === todayStr;
          const dayNum = Number(day.slice(8, 10));

          return (
            <button
              key={day}
              type="button"
              onClick={() => setOpenDay(day)}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "var(--gh-space-1)",
                background: "var(--gh-surface)",
                padding: "var(--gh-space-2)",
                width: "100%",
                // Fixed, not minHeight — CSS Grid sizes each row to its
                // tallest cell, so a day with lots of content used to
                // stretch its whole row taller than its neighbors. Fixed
                // height + hidden overflow keeps every row identical;
                // content beyond what fits shows as "+N more" instead.
                height: 160,
                overflow: "hidden",
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span
                  style={{
                    fontSize: "var(--gh-text-sm)",
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? "var(--gh-accent)" : undefined,
                  }}
                >
                  {dayNum}
                </span>
                {dayTasks.length > 0 && (
                  <span className="gh-badge" style={{ fontSize: "var(--gh-text-micro)" }}>
                    {dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start", width: "100%" }}>
                {dayEvents.slice(0, maxShown).map((e) => {
                  const timeRange = formatEventTimeRange(e);
                  const label = timeRange ? `${timeRange} ${e.summary}` : e.summary;
                  return (
                    <span
                      key={e.id}
                      title={label}
                      style={{
                        fontSize: "var(--gh-text-xs)",
                        color: e.color ?? "var(--gh-text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
                {dayEvents.length > maxShown && (
                  <span style={{ fontSize: "var(--gh-text-micro)", color: "var(--gh-text-disabled)" }}>
                    +{dayEvents.length - maxShown} more
                  </span>
                )}
                {dayTasks.slice(0, maxShown).map((t) => (
                  <span
                    key={t.id}
                    title={t.title}
                    style={{
                      fontSize: "var(--gh-text-xs)",
                      color: "var(--gh-accent)",
                      textDecoration: t.status === "done" ? "line-through" : undefined,
                      opacity: t.status === "done" ? 0.6 : 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {t.title}
                  </span>
                ))}
                {dayTasks.length > maxShown && (
                  <span style={{ fontSize: "var(--gh-text-micro)", color: "var(--gh-text-disabled)" }}>
                    +{dayTasks.length - maxShown} more task{dayTasks.length - maxShown === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {openDay && (
        <DayTasksPopup
          date={openDay}
          tasks={tasksByDay.get(openDay) ?? []}
          events={eventsByDay.get(openDay) ?? []}
          onClose={() => setOpenDay(null)}
        />
      )}
    </>
  );
}
