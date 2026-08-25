"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import TaskCheckRow from "../tasks/TaskCheckRow";
import { formatEventTimeRange } from "@/lib/date";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  starred?: boolean;
};

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarSummary?: string;
  color?: string;
};

// Overlay pattern cloned from src/components/ui/MrrBreakdownButton.tsx (the
// only modal precedent in the app) — fixed backdrop, Escape-to-close,
// click-outside-to-close, .gh-card content box. Controlled from outside
// (CalendarGrid) via the `date` prop rather than owning its own open state,
// since the trigger is a day-cell click, not a single fixed button.
export default function DayTasksPopup({
  date,
  tasks,
  events,
  onClose,
}: {
  date: string;
  tasks: Task[];
  events: CalendarEvent[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11,11,11,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "var(--gh-space-4)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="gh-card"
        style={{ maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="gh-eyebrow">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gh-text-muted)", padding: 0 }}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Events</p>
          {events.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Nothing on the calendar this day.</p>
          ) : (
            events.map((e) => {
              const timeRange = formatEventTimeRange(e);
              return (
                <div key={e.id} style={{ fontSize: "var(--gh-text-sm)" }}>
                  <p style={{ color: e.color ?? undefined }}>{e.summary}</p>
                  {timeRange && (
                    <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>{timeRange}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Tasks due</p>
          {tasks.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No tasks due this day.</p>
          ) : (
            tasks.map((t) => <TaskCheckRow key={t.id} task={t} />)
          )}
        </div>
      </div>
    </div>
  );
}
