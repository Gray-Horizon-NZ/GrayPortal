"use client";
import { useState } from "react";
import TaskCheckRow from "../../../tasks/TaskCheckRow";
import SubmitButton from "@/components/ui/SubmitButton";
import { createTaskAction, updateTaskAction, deleteTaskAction } from "../../../tasks/actions";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  starred?: boolean;
};

/**
 * Client component so the "hide completed" toggle can be instant/local —
 * a long-lived client (months of ticked tasks) would otherwise bury the
 * still-open ones under a wall of done rows every time an admin opens this
 * page. Defaults to hidden; the count stays visible either way.
 */
export default function TaskListPreview({ clientId, tasks }: { clientId: string; tasks: Task[] }) {
  const [showDone, setShowDone] = useState(false);
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const visible = showDone ? tasks : tasks.filter((t) => t.status !== "done");

  return (
    <>
      <form action={createTaskAction.bind(null, clientId, null)} style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        <input className="gh-input" name="title" placeholder="Add a task" required style={{ flex: 1 }} />
        <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>+</SubmitButton>
      </form>

      {doneCount > 0 && (
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className="gh-btn-secondary"
          style={{ alignSelf: "flex-start", fontSize: "var(--gh-text-xs)" }}
        >
          {showDone ? "Hide" : "Show"} completed ({doneCount})
        </button>
      )}

      {visible.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          <div style={{ flex: 1 }}>
            <TaskCheckRow task={t} />
          </div>
          <details>
            <summary className="gh-btn-secondary" style={{ cursor: "pointer", listStyle: "none", padding: "var(--gh-space-1) var(--gh-space-2)" }}>
              Edit
            </summary>
            <form
              action={updateTaskAction.bind(null, t.id, clientId)}
              style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
            >
              <input className="gh-input" name="title" defaultValue={t.title} required style={{ flex: 1 }} />
              <input className="gh-input" type="date" name="dueDate" defaultValue={t.dueDate ?? ""} />
              <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>Save</SubmitButton>
            </form>
          </details>
          <form action={deleteTaskAction.bind(null, t.id, clientId)}>
            <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>
              Remove
            </SubmitButton>
          </form>
        </div>
      ))}
      {visible.length === 0 && (
        <p style={{ color: "var(--gh-text-muted)" }}>{tasks.length === 0 ? "No tasks right now." : "All tasks completed."}</p>
      )}
    </>
  );
}
