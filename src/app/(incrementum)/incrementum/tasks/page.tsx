import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { shortDate } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import type { IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import {
  createIncTaskAction,
  setIncTaskStatusAction,
  moveIncTaskAction,
  updateIncTaskAction,
  deleteIncTaskAction,
  createTaskListAction,
  renameTaskListAction,
  archiveTaskListAction,
  deleteTaskListAction,
} from "../actions";

const BACK = "/incrementum/tasks";
type Task = IncrementumSnapshot["state"]["tasks"][number];
type List = IncrementumSnapshot["state"]["taskLists"][number];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; done?: string }> }) {
  const { ok, error, done } = await searchParams;
  const s = await getIncrementumSnapshot();
  const showDone = done === "1";
  const lists = s.state.taskLists;
  const active = lists.filter((l) => !l.archivedAt);
  const archived = lists.filter((l) => l.archivedAt);
  const forList = (id: string | null) => s.state.tasks.filter((t) => t.incrementumListId === id && (showDone || t.status !== "done"));

  return (
    <>
      <PageHead
        eyebrow="Command"
        title={
          <>
            Tasks
          </>
        }
        lede="The main list shows in GrayPortal's Master Task View (gold column) and syncs to Google Tasks. Sub-lists stay inside Incrementum and never sync, but their overdue tasks still reach Home's Due panel."
        actions={
          <>
            <Link className="gh-btn-secondary" href="/tasks">
              Master Task View ↗
            </Link>
            <Link className="gh-btn-secondary" href={showDone ? BACK : `${BACK}?done=1`}>
              {showDone ? "Hide done" : "Show done"}
            </Link>
          </>
        }
      />
      <Flash ok={ok} error={error} />

      <section className="inc-panel" style={{ borderColor: "var(--gh-accent)" }}>
        <div className="inc-cell-head">
          <h2 className="inc-cell-title">
            Main <em>list</em>
          </h2>
          <Chip tone="accent">On the master view</Chip>
        </div>
        <AddTask listId={null} />
        <TaskList tasks={forList(null)} lists={active} today={s.state.today} />
      </section>

      <div className="inc-grid">
        {active.map((l) => (
          <section key={l.id} className="inc-cell inc-span-6">
            <div className="inc-cell-head">
              <h2 className="inc-cell-title">{l.name}</h2>
              <details className="inc-disclosure">
                <summary>Manage</summary>
                <form action={renameTaskListAction} className="inc-inline">
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={l.id} />
                  <input className="gh-input" name="name" defaultValue={l.name} aria-label="List name" />
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">Rename</SubmitButton>
                </form>
                <div className="inc-inline" style={{ marginTop: "var(--gh-space-2)" }}>
                  <form action={archiveTaskListAction}>
                    <input type="hidden" name="_back" value={BACK} />
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="archived" value="on" />
                    <button className="gh-link-btn" type="submit">
                      Archive
                    </button>
                  </form>
                  <form action={deleteTaskListAction}>
                    <input type="hidden" name="_back" value={BACK} />
                    <input type="hidden" name="id" value={l.id} />
                    <button className="gh-link-btn gh-link-btn--danger" type="submit">
                      Delete (tasks move to main)
                    </button>
                  </form>
                </div>
              </details>
            </div>
            <AddTask listId={l.id} />
            <TaskList tasks={forList(l.id)} lists={active} today={s.state.today} />
          </section>
        ))}
        <section className="inc-cell inc-span-6">
          <h2 className="inc-cell-title">
            New <em>sub-list</em>
          </h2>
          <form action={createTaskListAction} className="inc-inline">
            <input type="hidden" name="_back" value={BACK} />
            <input className="gh-input" name="name" placeholder="e.g. Recruiting" required style={{ flex: 1 }} />
            <SubmitButton pendingLabel="…">Add</SubmitButton>
          </form>
          {archived.length > 0 && (
            <div className="inc-list">
              <p className="gh-eyebrow">Archived</p>
              {archived.map((l: List) => (
                <form key={l.id} action={archiveTaskListAction} className="inc-row">
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={l.id} />
                  <span className="inc-muted">{l.name}</span>
                  <button className="gh-link-btn" type="submit">
                    Restore
                  </button>
                </form>
              ))}
            </div>
          )}
        </section>
      </div>
      <IncrementumReadySignal />
    </>
  );
}

function AddTask({ listId }: { listId: string | null }) {
  return (
    <form action={createIncTaskAction} className="inc-inline">
      <input type="hidden" name="_back" value={BACK} />
      {listId && <input type="hidden" name="listId" value={listId} />}
      <input className="gh-input" name="title" placeholder="Add a task" required style={{ flex: 1, minWidth: 160 }} aria-label="New task" />
      <input className="gh-input" type="date" name="dueDate" aria-label="Due date" />
      <label className="inc-inline inc-small">
        <input type="checkbox" name="high" /> High
      </label>
      <SubmitButton style={{ padding: "0 var(--gh-space-3)" }}>+</SubmitButton>
    </form>
  );
}

function TaskList({ tasks, lists, today }: { tasks: Task[]; lists: List[]; today: string }) {
  if (tasks.length === 0) return <p className="inc-muted">Nothing outstanding.</p>;
  return (
    <div className="inc-list">
      {tasks.map((t) => {
        const isDone = t.status === "done";
        return (
          <div key={t.id} className="inc-row" style={{ flexWrap: "wrap" }}>
            <form action={setIncTaskStatusAction} className="inc-row-main" style={{ flex: "1 1 220px" }}>
              <input type="hidden" name="_back" value={BACK} />
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="status" value={isDone ? "not_started" : "done"} />
              <button type="submit" className="inc-check" data-done={isDone || undefined} aria-label={isDone ? "Reopen" : "Complete"}>
                {isDone ? "✓" : ""}
              </button>
              <span style={{ textDecoration: isDone ? "line-through" : undefined, color: isDone ? "var(--gh-text-muted)" : undefined }}>{t.title}</span>
              {t.priority === "high" && <Chip tone="danger">High</Chip>}
            </form>
            <div className="inc-inline">
              {t.dueDate && <Chip tone={!isDone && t.dueDate < today ? "danger" : undefined}>{shortDate(t.dueDate)}</Chip>}
              <details className="inc-disclosure">
                <summary>Edit</summary>
                <form action={updateIncTaskAction} className="inc-inline">
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={t.id} />
                  <input className="gh-input" name="title" defaultValue={t.title} aria-label="Title" />
                  <input className="gh-input" type="date" name="dueDate" defaultValue={t.dueDate ?? ""} aria-label="Due" />
                  <label className="inc-inline inc-small">
                    <input type="checkbox" name="high" defaultChecked={t.priority === "high"} /> High
                  </label>
                  <SubmitButton pendingLabel="…">Save</SubmitButton>
                </form>
                <form action={moveIncTaskAction} className="inc-inline" style={{ marginTop: "var(--gh-space-2)" }}>
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={t.id} />
                  <select className="gh-input" name="listId" defaultValue={t.incrementumListId ?? ""} aria-label="Move to">
                    <option value="">Main list (promote)</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">Move</SubmitButton>
                </form>
                <form action={deleteIncTaskAction} style={{ marginTop: "var(--gh-space-2)" }}>
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={t.id} />
                  <button className="gh-link-btn gh-link-btn--danger" type="submit">
                    Delete task
                  </button>
                </form>
              </details>
            </div>
          </div>
        );
      })}
    </div>
  );
}
