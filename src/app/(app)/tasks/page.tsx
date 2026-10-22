import Link from "next/link";
import { ListChecks, Repeat, Star } from "lucide-react";
import { listAllTasks, listMyAssignedTasks, listStarredTasks, getTaskDealContext, INTERNAL_LIST_LABELS, type InternalListKey } from "@/lib/dal/tasks";
import { listAssignableUsers } from "@/lib/dal/users";
import { getCaller } from "@/lib/dal/auth";
import EmptyState from "@/components/ui/EmptyState";
import TaskRow from "./TaskRow";
import MasterTaskView from "./MasterTaskView";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

const VIEWS = ["mine", "all", "master", "starred"] as const;
type View = (typeof VIEWS)[number];
const VIEW_SUBS: Record<View, string> = {
  master: "Every list side by side",
  all: "Everything open, grouped by status",
  mine: "Assigned to you",
  starred: "Starred tasks",
};

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
  searchParams: Promise<{ view?: string; list?: string }>;
}) {
  const { view: viewParam, list } = await searchParams;
  const caller = await getCaller();
  const isAdmin = caller.role === "admin";
  // Admins land on Master by default — the merged, grouped view of
  // everything, rather than a filtered "just mine" slice. Non-admin
  // (contractor) callers keep defaulting to Mine.
  const defaultView: View = isAdmin ? "master" : "mine";
  const view: View = isAdmin && VIEWS.includes(viewParam as View) ? (viewParam as View) : defaultView;

  return (
    <div className="gh-term-page" style={view === "master" ? undefined : { maxWidth: 820 }}>
      <PageHead title="Tasks" sub={VIEW_SUBS[view]}>
        {isAdmin && (
          <>
            <Link href="/tasks?view=master" className="gh-btn-secondary" data-active={view === "master" || undefined}>Master</Link>
            <Link href="/tasks?view=all" className="gh-btn-secondary" data-active={view === "all" || undefined}>All</Link>
            <Link href="/tasks?view=mine" className="gh-btn-secondary" data-active={view === "mine" || undefined}>Mine</Link>
            <Link href="/tasks?view=starred" className="gh-btn-secondary" data-active={view === "starred" || undefined}>
              <Star size={13} strokeWidth={1.75} />
              Starred
            </Link>
          </>
        )}
      </PageHead>

      {view === "master" ? (
        <MasterTaskView list={list} />
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
  const caller = await getCaller();
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
        <Panel title={`Ongoing · ${ongoing.length}`} icon={Repeat}>
          <div className="gh-term-tasklist">
            {ongoing.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />)}
          </div>
        </Panel>
      )}

      <Panel title={`Active · ${active.length}`} icon={ListChecks}>
        <div className="gh-term-tasklist">
          {active.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />)}
        </div>
        {active.length === 0 && (
          <EmptyState icon={ListChecks} title="Nothing outstanding" description="Every task is done or ongoing." />
        )}
      </Panel>

      {done.length > 0 && (
        <details className="gh-card">
          <summary className="gh-eyebrow">Done ({done.length})</summary>
          <div className="gh-term-tasklist" style={{ marginTop: "var(--gh-space-3)" }}>
            {done.map((t) => <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />)}
          </div>
        </details>
      )}
    </>
  );
}

async function StarredTasksView() {
  const caller = await getCaller();
  const [tasks, assignees] = await Promise.all([
    listStarredTasks(),
    caller.role === "admin" ? listAssignableUsers() : Promise.resolve([]),
  ]);

  return (
    <Panel title={`Starred · ${tasks.length}`} icon={Star}>
      <div className="gh-term-tasklist">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={{ ...t, clientName: displayClientName(t) }} assignees={assignees} />
        ))}
      </div>
      {tasks.length === 0 && (
        <EmptyState icon={Star} title="Nothing starred" description="Star a task anywhere to pin it here, with which list it's from." />
      )}
    </Panel>
  );
}

async function MyTasksView() {
  const myTasks = await listMyAssignedTasks();
  const dealContexts = await Promise.all(
    myTasks.map((t) => (t.dealId ? getTaskDealContext(t.dealId) : Promise.resolve(null)))
  );

  return (
    <Panel title={`Assigned to you · ${myTasks.length}`} icon={ListChecks}>
      <div className="gh-term-tasklist">
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
    </Panel>
  );
}
