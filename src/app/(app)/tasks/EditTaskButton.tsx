"use client";
import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { updateTaskAction } from "./actions";

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  clientId: string | null;
  internalList: string | null;
  dealId: string | null;
  dealCompanyName?: string | null;
  funnelStage?: "next" | "doing" | "done" | null;
};

type ClientOption = { id: string; name: string };
type InternalListOption = { key: string; label: string };

/**
 * Popup edit (name/date/list/save) — replaces an inline <details> form
 * that got too squished once due-date and a list picker were both needed
 * inside Master Task View's columns. Same overlay pattern as
 * DayTasksPopup/MrrBreakdownButton. clientOptions/internalListOptions
 * omitted = no list picker (portal-preview's simpler per-client view,
 * where every task already shares the same client).
 */
export default function EditTaskButton({
  task,
  clientId,
  clientOptions,
  internalListOptions,
}: {
  task: Task;
  clientId: string | null;
  clientOptions?: ClientOption[];
  internalListOptions?: InternalListOption[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const showListPicker = clientOptions && internalListOptions;
  const currentListValue = task.clientId
    ? `client:${task.clientId}`
    : task.internalList
      ? `internal:${task.internalList}`
      : task.dealId
        ? `deal:${task.dealId}`
        : "";

  return (
    <>
      <button
        type="button"
        aria-label="Edit task"
        onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", padding: "var(--gh-space-1)", color: "var(--gh-text-muted)", cursor: "pointer", display: "flex" }}
      >
        <Pencil size={14} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
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
            style={{ maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p className="gh-eyebrow">Edit task</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gh-text-muted)", padding: 0 }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <form
              action={async (formData) => {
                await updateTaskAction(task.id, clientId, formData);
                setOpen(false);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                Name
                <input className="gh-input" name="title" defaultValue={task.title} required />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                Date
                <input className="gh-input" type="date" name="dueDate" defaultValue={task.dueDate ?? ""} />
              </label>
              {showListPicker && (
                <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                  List
                  <select className="gh-input" name="list" defaultValue={currentListValue}>
                    {task.dealId && (
                      <option value={`deal:${task.dealId}`}>Prospect: {task.dealCompanyName ?? "current"}</option>
                    )}
                    {clientOptions!.map((c) => (
                      <option key={c.id} value={`client:${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                    {internalListOptions!.map((l) => (
                      <option key={l.key} value={`internal:${l.key}`}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {task.clientId && (
                <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                  Roadmap stage
                  <select className="gh-input" name="funnelStage" defaultValue={task.funnelStage ?? ""}>
                    <option value="">Not on roadmap</option>
                    <option value="next">Next</option>
                    <option value="doing">Doing</option>
                    <option value="done">Done</option>
                  </select>
                </label>
              )}
              <SubmitButton>Save</SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
