"use client";
import { setTaskStatusAction, assignTaskAction } from "./actions";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  syncState: "synced" | "pending" | "failed" | null;
  assignedTo?: string | null;
  clientName?: string | null;
};

type Assignee = { id: string; displayName: string | null; email: string };

export default function TaskRow({ task, assignees = [] }: { task: Task; assignees?: Assignee[] }) {
  return (
    <div className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        {task.clientName && (
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-1)" }}>{task.clientName}</p>
        )}
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
      <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        {assignees.length > 0 && (
          <select
            className="gh-input"
            defaultValue={task.assignedTo ?? ""}
            onChange={(e) => assignTaskAction(task.id, e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.displayName ?? a.email}</option>
            ))}
          </select>
        )}
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
    </div>
  );
}
