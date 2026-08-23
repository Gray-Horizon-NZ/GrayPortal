import Link from "next/link";
import { listAllTasks } from "@/lib/dal/tasks";
import { listClients } from "@/lib/dal/clients";
import { INTERNAL_LIST_KEYS, INTERNAL_LIST_LABELS, type InternalListKey } from "@/lib/dal/tasks";
import { createTaskAction } from "./actions";
import { createDealTaskAction } from "../deals/actions";
import SubmitButton from "@/components/ui/SubmitButton";
import TaskCheckRow from "./TaskCheckRow";

type Column =
  | { kind: "client"; clientId: string; name: string }
  | { kind: "deal"; dealId: string; name: string }
  | { kind: "internal"; internalList: InternalListKey; name: string };

/**
 * One column per client, Google-Tasks style — every client gets a column
 * even with zero tasks yet, so "add task" is always available without
 * hunting for the right client first. Prospect (deal-linked) tasks get
 * their own column too, one per deal that actually has a task — derived
 * from the tasks themselves (via dealId/dealCompanyName) rather than every
 * open deal, since most deals never get a manually-created task and the
 * pipeline churns too fast to give all of them a standing column. Tasks
 * with neither a clientId nor a dealId (genuinely internal work) land in
 * one of the two fixed internal columns — no internalList set defaults
 * into "Gray Horizon" rather than disappearing.
 */
export default async function MasterTaskView() {
  const [tasks, clients] = await Promise.all([listAllTasks(), listClients()]);

  const dealColumns = new Map<string, string>();
  for (const t of tasks) {
    if (t.dealId && !t.clientId) {
      dealColumns.set(t.dealId, t.dealCompanyName ?? "Prospect");
    }
  }

  const columns: Column[] = [
    ...clients.map((c) => ({ kind: "client", clientId: c.id, name: c.name }) as Column),
    ...Array.from(dealColumns, ([dealId, name]) => ({ kind: "deal", dealId, name }) as Column),
    ...INTERNAL_LIST_KEYS.map((key) => ({ kind: "internal", internalList: key, name: INTERNAL_LIST_LABELS[key] }) as Column),
  ];

  const tasksForColumn = (col: Column) => {
    if (col.kind === "client") return tasks.filter((t) => t.clientId === col.clientId);
    if (col.kind === "deal") return tasks.filter((t) => !t.clientId && t.dealId === col.dealId);
    return tasks.filter((t) => !t.clientId && !t.dealId && (t.internalList ?? INTERNAL_LIST_KEYS[0]) === col.internalList);
  };

  if (columns.length === 0) {
    return <p style={{ color: "var(--gh-text-muted)" }}>No clients yet.</p>;
  }

  return (
    <div style={{ display: "flex", gap: "var(--gh-space-4)", overflowX: "auto", paddingBottom: "var(--gh-space-4)" }}>
      {columns.map((col) => {
        const colTasks = tasksForColumn(col);
        const open = colTasks.filter((t) => t.status !== "done");
        const done = colTasks.filter((t) => t.status === "done");
        const key = col.kind === "client" ? col.clientId : col.kind === "deal" ? col.dealId : col.internalList;
        return (
          <div
            key={key}
            className="gh-card"
            style={{ minWidth: 260, maxWidth: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
          >
            {col.kind === "client" ? (
              <Link
                href={`/clients/${col.clientId}/portal-preview`}
                target="_blank"
                className="gh-panel-title"
                style={{ color: "var(--gh-accent)" }}
              >
                {col.name} ↗
              </Link>
            ) : col.kind === "deal" ? (
              <Link href={`/deals/${col.dealId}`} target="_blank" className="gh-panel-title" style={{ color: "var(--gh-accent)" }}>
                {col.name} ↗ <span style={{ fontSize: "var(--gh-text-micro)", color: "var(--gh-text-muted)" }}>(prospect)</span>
              </Link>
            ) : (
              <p className="gh-panel-title">{col.name}</p>
            )}

            <form
              action={
                col.kind === "deal"
                  ? createDealTaskAction.bind(null, col.dealId)
                  : createTaskAction.bind(null, col.kind === "client" ? col.clientId : null, col.kind === "internal" ? col.internalList : null)
              }
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
