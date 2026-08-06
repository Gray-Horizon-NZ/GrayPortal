"use client";
import { setTaskStatusAction } from "./actions";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  syncState: "synced" | "pending" | "failed" | null;
};

export default function TaskRow({ task }: { task: Task }) {
  return (
    <div className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <p style={{ fontWeight: 500 }}>{task.title}</p>
        <div style={{ display: "flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
          {task.dueDate && (
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Due {task.dueDate}</p>
          )}
          {task.syncState === "failed" && (
            <span className="gh-badge" data-status="danger">Sync failed</span>
          )}
        </div>
      </div>
      <select
        className="gh-input"
        defaultValue={task.status}
        onChange={(e) => setTaskStatusAction(task.id, e.target.value as Task["status"])}
      >
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="ongoing">Ongoing</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}
