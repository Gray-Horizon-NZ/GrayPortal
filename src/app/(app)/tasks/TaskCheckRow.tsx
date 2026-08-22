"use client";
import { setTaskStatusAction } from "./actions";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
};

/** Google-Tasks-style row for the Master Task View — a checkbox that toggles done, nothing else. */
export default function TaskCheckRow({ task }: { task: Task }) {
  const done = task.status === "done";
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--gh-space-2)",
        fontSize: "var(--gh-text-sm)",
        padding: "var(--gh-space-1) 0",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => setTaskStatusAction(task.id, e.target.checked ? "done" : "not_started")}
      />
      <span
        style={{
          flex: 1,
          textDecoration: done ? "line-through" : undefined,
          color: done ? "var(--gh-text-muted)" : undefined,
        }}
      >
        {task.title}
      </span>
      {task.dueDate && !done && (
        <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", whiteSpace: "nowrap" }}>
          {task.dueDate}
        </span>
      )}
    </label>
  );
}
