import Link from "next/link";
import { ListChecks, Star } from "lucide-react";
import { listAllTasks, listMyAssignedTasks, listStarredTasks, getTaskDealContext, INTERNAL_LIST_LABELS, type InternalListKey } from "@/lib/dal/tasks";
import { listAssignableUsers } from "@/lib/dal/users";
import { withCaller } from "@/lib/dal/auth";
import EmptyState from "@/components/ui/EmptyState";
import TaskRow from "./TaskRow";
import MasterTaskView from "./MasterTaskView";

const VIEWS = ["mine", "all", "master", "starred"] as const;
type View = (typeof VIEWS)[number];

function internalLabel(internalList: string | null) {
  return INTERNAL_LIST_LABELS[(internalList as InternalListKey | null) ?? "gray_horizon"] ?? INTERNAL_LIST_LABELS.gray_horizon;
}

// A deal-linked task (no clientId) should show/link its prospect, not the
// generic internal-list label — only fall back to the internal label when
// there's neither a client nor a deal.
function displayClientName(t: { clientName: string | null; dealCompanyName?: string | null; internalList: string | null }) {
  if (t.clientName) return t.clientName;
  if (t.dealCompanyName) return null;
  return internalLabel(t.internalList);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const caller = await withCaller(async (c) => c);
  const isAdmin = caller.role === "admin";
  // Admins land on Master by default — the merged, grouped view of
  // everything, rather than a filtered "just mine" slice. Non-admin
  // (contractor) callers keep defaulting to Mine.
  const defaultView: View = isAdmin ? "master" : "mine";
  const view: View = isAdmin && VIEWS.includes(viewParam as View) ? (viewParam as View) : defaultView;

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
              href="/tasks?view=master"
              className="gh-btn-secondary"
              data-active={view === "master" || undefined}
              style={view === "master" ? { background: "var(--gh-surface-raised)" } : undefined}
            >
              Master
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
              href="/tasks?view=mine"
              className="gh-btn-secondary"
              data-active={view === "mine" || undefined}
              style={view === "mine" ? { background: "var(--gh-surface-raised)" } : undefined}
            >
              Mine
            </Link>
            <Link
              href="/tasks?view=starred"
              className="gh-btn-secondary"
              data-active={view === "starred" || undefined}
              style={view === "starred" ? { background: "var(--gh-surface-raised)" } : undefined}
            >
              <Star size={13} strokeWidth={1.75} style={{ marginRight: 4, verticalAlign: -2 }} />
              Starred
            </Link>
          </div>
        )}
      </div>

      {view === "master" ? (
        <MasterTaskView />
      ) : view === "all" ? (
        <AllTasksView />
      ) : view === "starred" ? (
        <StarredTasksView />
      ) : (
        <MyTasksView />
      )}
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
          {ongoing.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />)}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        <p className="gh-eyebrow">Active</p>
        {active.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />)}
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
            {done.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />)}
          </div>
        </details>
      )}
    </>
  );
}

async function StarredTasksView() {
  const caller = await withCaller(async (c) => c);
  const [tasks, assignees] = await Promise.all([
    listStarredTasks(),
    caller.role === "admin" ? listAssignableUsers() : Promise.resolve([]),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />
      ))}
      {tasks.length === 0 && (
        <EmptyState icon={Star} title="Nothing starred" description="Star a task anywhere to pin it here, with which list it's from." />
      )}
    </div>
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
                <Link href={`/deals/${context.dealId}`} style={{ color: "var(--gh-accent)" }}>{context.companyName}</Link>
                {" "}— {context.stage} — next: {context.nextAction} ({context.nextActionDate})
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
