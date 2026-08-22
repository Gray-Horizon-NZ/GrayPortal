import { listAllTasks } from "@/lib/dal/tasks";
import { listClients } from "@/lib/dal/clients";
import { createTaskAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import TaskCheckRow from "./TaskCheckRow";

const INTERNAL_KEY = "__internal";

/**
 * One column per client, Google-Tasks style — every client gets a column
 * even with zero tasks yet, so "add task" is always available without
 * hunting for the right client first. Tasks with no clientId (deal-linked
 * internal tasks) land in a trailing read-only "Internal" column instead
 * of being dropped.
 */
export default async function MasterTaskView() {
  const [tasks, clients] = await Promise.all([listAllTasks(), listClients()]);

  const byClient = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = t.clientId ?? INTERNAL_KEY;
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key)!.push(t);
  }

  const columns: { id: string | null; name: string; tasks: typeof tasks }[] = [
    ...clients.map((c) => ({ id: c.id, name: c.name, tasks: byClient.get(c.id) ?? [] })),
    ...(byClient.has(INTERNAL_KEY) ? [{ id: null, name: "Internal", tasks: byClient.get(INTERNAL_KEY)! }] : []),
  ];

  if (columns.length === 0) {
    return <p style={{ color: "var(--gh-text-muted)" }}>No clients yet.</p>;
  }

  return (
    <div style={{ display: "flex", gap: "var(--gh-space-4)", overflowX: "auto", paddingBottom: "var(--gh-space-4)" }}>
      {columns.map((col) => {
        const open = col.tasks.filter((t) => t.status !== "done");
        const done = col.tasks.filter((t) => t.status === "done");
        return (
          <div
            key={col.id ?? INTERNAL_KEY}
            className="gh-card"
            style={{ minWidth: 260, maxWidth: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
          >
            <p className="gh-panel-title">{col.name}</p>

            {col.id && (
              <form action={createTaskAction.bind(null, col.id)} style={{ display: "flex", gap: "var(--gh-space-2)" }}>
                <input className="gh-input" name="title" placeholder="Add a task" required style={{ flex: 1 }} />
                <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>+</SubmitButton>
              </form>
            )}

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
