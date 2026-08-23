import Link from "next/link";
import { listAllTasks } from "@/lib/dal/tasks";
import { listClients } from "@/lib/dal/clients";
import { INTERNAL_LIST_KEYS, INTERNAL_LIST_LABELS, type InternalListKey } from "@/lib/dal/tasks";
import { createTaskAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import TaskCheckRow from "./TaskCheckRow";

type Column = { clientId: string | null; internalList: InternalListKey | null; name: string };

/**
 * One column per client, Google-Tasks style — every client gets a column
 * even with zero tasks yet, so "add task" is always available without
 * hunting for the right client first. Tasks with no clientId (deal-linked
 * or genuinely internal work) land in one of two fixed internal columns —
 * tasks with no internalList set (everything created before that column
 * existed) default into "Gray Horizon" rather than disappearing.
 */
export default async function MasterTaskView() {
  const [tasks, clients] = await Promise.all([listAllTasks(), listClients()]);

  const columns: Column[] = [
    ...clients.map((c) => ({ clientId: c.id, internalList: null, name: c.name }) as Column),
    ...INTERNAL_LIST_KEYS.map((key) => ({ clientId: null, internalList: key, name: INTERNAL_LIST_LABELS[key] }) as Column),
  ];

  const tasksForColumn = (col: Column) =>
    col.clientId
      ? tasks.filter((t) => t.clientId === col.clientId)
      : tasks.filter((t) => !t.clientId && (t.internalList ?? INTERNAL_LIST_KEYS[0]) === col.internalList);

  if (columns.length === 0) {
    return <p style={{ color: "var(--gh-text-muted)" }}>No clients yet.</p>;
  }

  return (
    <div style={{ display: "flex", gap: "var(--gh-space-4)", overflowX: "auto", paddingBottom: "var(--gh-space-4)" }}>
      {columns.map((col) => {
        const colTasks = tasksForColumn(col);
        const open = colTasks.filter((t) => t.status !== "done");
        const done = colTasks.filter((t) => t.status === "done");
        return (
          <div
            key={col.clientId ?? col.internalList}
            className="gh-card"
            style={{ minWidth: 260, maxWidth: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
          >
            {col.clientId ? (
              <Link
                href={`/clients/${col.clientId}/portal-preview`}
                target="_blank"
                className="gh-panel-title"
                style={{ color: "var(--gh-accent)" }}
              >
                {col.name} ↗
              </Link>
            ) : (
              <p className="gh-panel-title">{col.name}</p>
            )}

            <form
              action={createTaskAction.bind(null, col.clientId, col.internalList)}
              style={{ display: "flex", gap: "var(--gh-space-2)" }}
            >
              <input className="gh-input" name="title" placeholder="Add a task" required style={{ flex: 1 }} />
              <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>+</SubmitButton>
            </form>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {open.map((t) => (
                <TaskCheckRow key={t.id} task={t} />
              ))}
              {open.length === 0 && (
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>Nothing outstanding.</p>
              )}
            </div>

            {done.length > 0 && (
              <details>
                <summary className="gh-eyebrow" style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)" }}>
                  Done ({done.length})
                </summary>
                <div style={{ display: "flex", flexDirection: "column", marginTop: "var(--gh-space-2)" }}>
                  {done.map((t) => (
                    <TaskCheckRow key={t.id} task={t} />
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
