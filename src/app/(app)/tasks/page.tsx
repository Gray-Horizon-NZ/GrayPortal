import Link from "next/link";
import { ListChecks } from "lucide-react";
import { listAllTasks, listMyAssignedTasks, getTaskDealContext } from "@/lib/dal/tasks";
import { listAssignableUsers } from "@/lib/dal/users";
import { withCaller } from "@/lib/dal/auth";
import EmptyState from "@/components/ui/EmptyState";
import TaskRow from "./TaskRow";
import MasterTaskView from "./MasterTaskView";

const VIEWS = ["mine", "all", "master"] as const;
type View = (typeof VIEWS)[number];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const caller = await withCaller(async (c) => c);
  const isAdmin = caller.role === "admin";
  const view: View = isAdmin && VIEWS.includes(viewParam as View) ? (viewParam as View) : "mine";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: view === "master" ? undefined : 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "var(--gh-space-3)" }}>
        <div>
          <p className="gh-eyebrow">Gray Horizon</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Tasks
          </h1>
        </div>
        {isAdmin && (
          <div className="gh-list-toolbar" style={{ margin: 0 }}>
            <Link
              href="/tasks?view=mine"
              className="gh-btn-secondary"
              data-active={view === "mine" || undefined}
              style={view === "mine" ? { background: "var(--gh-surface-raised)" } : undefined}
            >
              Mine
            </Link>
            <Link
              href="/tasks?view=all"
              className="gh-btn-secondary"
              data-active={view === "all" || undefined}
              style={view === "all" ? { background: "var(--gh-surface-raised)" } : undefined}
            >
              All
            </Link>
            <Link
              href="/tasks?view=master"
              className="gh-btn-secondary"
              data-active={view === "master" || undefined}
              style={view === "master" ? { background: "var(--gh-surface-raised)" } : undefined}
            >
              Master
            </Link>
          </div>
        )}
      </div>

      {view === "master" ? <MasterTaskView /> : view === "all" ? <AllTasksView /> : <MyTasksView />}
    </div>
  );
}

async function AllTasksView() {
  const caller = await withCaller(async (c) => c);
  const [tasks, assignees] = await Promise.all([
    listAllTasks(),
    caller.role === "admin" ? listAssignableUsers() : Promise.resolve([]),
  ]);

  const ongoing = tasks.filter((t) => t.status === "ongoing");
  const active = tasks.filter((t) => t.status === "not_started" || t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <>
      {ongoing.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Ongoing</p>
          {ongoing.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: t.clientName ?? "Internal" }} assignees={assignees} />)}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        <p className="gh-eyebrow">Active</p>
        {active.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: t.clientName ?? "Internal" }} assignees={assignees} />)}
        {active.length === 0 && (
          <EmptyState icon={ListChecks} title="Nothing outstanding" description="Every task is done or ongoing." />
        )}
      </section>

      {done.length > 0 && (
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>
            Done ({done.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-3)" }}>
            {done.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: t.clientName ?? "Internal" }} assignees={assignees} />)}
          </div>
        </details>
      )}
    </>
  );
}

async function MyTasksView() {
  const myTasks = await listMyAssignedTasks();
  const dealContexts = await Promise.all(
    myTasks.map((t) => (t.dealId ? getTaskDealContext(t.dealId) : Promise.resolve(null)))
  );

  return (
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
      {myTasks.length === 0 && (
        <EmptyState icon={ListChecks} title="Nothing assigned to you" description="Tasks assigned to you will show up here." />
      )}
    </div>
  );
}
