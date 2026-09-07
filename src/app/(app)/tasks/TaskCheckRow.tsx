"use client";
import { useState, useTransition } from "react";
import { Star, AlertTriangle } from "lucide-react";
import { setTaskStatusAction, toggleTaskStarAction, toggleTaskPriorityAction } from "./actions";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  starred?: boolean;
  priority?: "normal" | "high";
};

/** Google-Tasks-style row for the Master Task View — a checkbox that toggles done, plus a star and a high-priority marker. */
export default function TaskCheckRow({ task }: { task: Task }) {
  // Optimistic local state — the checkbox/star/priority are controlled, and
  // without this they never visually move: the server action is
  // fire-and-forget, so with no local state update React just holds
  // `checked`/starred/highPriority at their old prop value until the page
  // happens to re-render.
  const [done, setDone] = useState(task.status === "done");
  const [starred, setStarred] = useState(task.starred ?? false);
  const [highPriority, setHighPriority] = useState((task.priority ?? "normal") === "high");
  const [, startTransition] = useTransition();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--gh-space-2)",
        fontSize: "var(--gh-text-sm)",
        padding: "var(--gh-space-1) 0",
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", flex: 1, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => {
            const next = e.target.checked;
            setDone(next);
            startTransition(() => {
              setTaskStatusAction(task.id, next ? "done" : "not_started");
            });
          }}
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
      </label>
      <button
        type="button"
        aria-label={starred ? "Unstar" : "Star"}
        onClick={() => {
          const next = !starred;
          setStarred(next);
          startTransition(() => {
            toggleTaskStarAction(task.id, next);
          });
        }}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", lineHeight: 0 }}
      >
        <Star
          size={14}
          strokeWidth={1.75}
          fill={starred ? "var(--gh-accent)" : "none"}
          color={starred ? "var(--gh-accent)" : "var(--gh-text-muted)"}
        />
      </button>
      <button
        type="button"
        aria-label={highPriority ? "Remove high priority" : "Mark high priority"}
        onClick={() => {
          const next = !highPriority;
          setHighPriority(next);
          startTransition(() => {
            toggleTaskPriorityAction(task.id, next ? "high" : "normal");
          });
        }}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", lineHeight: 0 }}
      >
        <AlertTriangle
          size={14}
          strokeWidth={1.75}
          fill={highPriority ? "var(--gh-danger)" : "none"}
          color={highPriority ? "var(--gh-danger)" : "var(--gh-text-muted)"}
        />
      </button>
    </div>
  );
}
