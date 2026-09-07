"use client";
import { useState } from "react";

export type PortalTaskPreview = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  starred: boolean;
};

/**
 * Dashboard Tasks panel — a client component (not the page.tsx inline
 * JSX it replaced) specifically so the "Focus" toggle can filter the
 * already-fetched list instantly, no extra round trip. Focus = starred
 * tasks only, reusing the existing tasks.starred field (Master Task
 * View's own star, not a new concept).
 */
export default function PortalTaskList({ tasks, openTaskCount }: { tasks: PortalTaskPreview[]; openTaskCount: number }) {
  const [focusOnly, setFocusOnly] = useState(false);
  const visible = focusOnly ? tasks.filter((t) => t.starred) : tasks;

  return (
    <div className="ghp-panel-block">
      <div className="ghp-panel-head">
        <div className="ghp-t">Tasks</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="ghp-focus-toggle" data-active={focusOnly || undefined} onClick={() => setFocusOnly((v) => !v)}>
            ★ Focus
          </button>
          <div className="ghp-n">{openTaskCount} open</div>
        </div>
      </div>
      {visible.map((t) => (
        <div key={t.id} className="ghp-task-row">
          <span className={`ghp-task-check${t.status === "done" ? " ghp-good" : ""}`}>{t.status === "done" ? "✓" : ""}</span>
          <span className={`ghp-task-name${t.status === "done" ? " ghp-done-text" : ""}`}>{t.title}</span>
          {t.dueDate && <span className="ghp-task-due">Due {t.dueDate}</span>}
        </div>
      ))}
      {visible.length === 0 && (
        <p className="ghp-empty">{focusOnly ? "No starred tasks — star one in Master Task View to see it here." : "No open tasks right now."}</p>
      )}
    </div>
  );
}
