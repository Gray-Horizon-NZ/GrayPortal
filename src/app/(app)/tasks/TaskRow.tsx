"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { setTaskStatusAction, assignTaskAction, toggleTaskStarAction } from "./actions";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  syncState: "synced" | "pending" | "failed" | null;
  assignedTo?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  dealId?: string | null;
  dealCompanyName?: string | null;
  starred?: boolean;
};

type Assignee = { id: string; displayName: string | null; email: string };

export default function TaskRow({ task, assignees = [] }: { task: Task; assignees?: Assignee[] }) {
  const [starred, setStarred] = useState(task.starred ?? false);
  const [, startTransition] = useTransition();

  return (
    <div className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--gh-space-2)" }}>
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
          style={{ background: "none", border: "none", padding: 0, marginTop: 2, cursor: "pointer", display: "flex", lineHeight: 0 }}
        >
          <Star
            size={14}
            strokeWidth={1.75}
            fill={starred ? "var(--gh-accent)" : "none"}
            color={starred ? "var(--gh-accent)" : "var(--gh-text-muted)"}
          />
        </button>
        <div>
          {task.clientName ? (
            task.clientId ? (
              <Link
                href={`/clients/${task.clientId}/portal-preview`}
                target="_blank"
                className="gh-eyebrow"
                style={{ marginBottom: "var(--gh-space-1)", display: "inline-block", color: "var(--gh-accent)" }}
              >
                {task.clientName}
              </Link>
            ) : (
              <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-1)" }}>{task.clientName}</p>
            )
          ) : (
            task.dealCompanyName && task.dealId && (
              <Link
                href={`/deals/${task.dealId}`}
                className="gh-eyebrow"
                style={{ marginBottom: "var(--gh-space-1)", display: "inline-block", color: "var(--gh-accent)" }}
              >
                Prospect: {task.dealCompanyName}
              </Link>
            )
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
