import { listMyAssignedTasks, getTaskDealContext } from "@/lib/dal/tasks";
import TaskRow from "../tasks/TaskRow";

// Phase 14 (Contractor Role) — Yuvi's (or any assignee's) own task list,
// with limited non-commercial deal context (company name, stage, next
// action — never deal value) resolved per task. Deliberately not the same
// as /tasks, which shows every task; this filters to assignedTo = caller.
export default async function MyTasksPage() {
  const myTasks = await listMyAssignedTasks();
  const dealContexts = await Promise.all(
    myTasks.map((t) => (t.dealId ? getTaskDealContext(t.dealId) : Promise.resolve(null)))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>My Tasks</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {myTasks.map((t, i) => {
          const context = dealContexts[i];
          return (
            <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <TaskRow task={t} />
              {context && (
                <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", paddingLeft: "var(--gh-space-3)" }}>
                  {context.companyName} — {context.stage} — next: {context.nextAction} ({context.nextActionDate})
                </p>
              )}
            </div>
          );
        })}
        {myTasks.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>Nothing assigned to you.</p>}
      </div>
    </div>
  );
}
