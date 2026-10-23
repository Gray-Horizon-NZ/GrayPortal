import Link from "next/link";
import { Settings2, Plus } from "lucide-react";
import { getIncrementumSnapshot, type IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, RowFold, Check, Field, Console, Tree, Ledger, Bracket, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { fmtDate, addDays, hrefWith } from "@/components/incrementum/terminal/helpers";
import {
  createIncTaskAction,
  setIncTaskStatusAction,
  saveIncTaskAction,
  deleteIncTaskAction,
  createTaskListAction,
  renameTaskListAction,
  archiveTaskListAction,
  deleteTaskListAction,
} from "../actions";

const BASE = "/incrementum/tasks";
type Task = IncrementumSnapshot["state"]["tasks"][number];
type List = IncrementumSnapshot["state"]["taskLists"][number];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ list?: string; done?: string; manage?: string; newlist?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const showDone = sp.done === "1";
  const active = st.taskLists.filter((l) => !l.archivedAt);
  const archived = st.taskLists.filter((l) => l.archivedAt);
  const list = st.taskLists.find((l) => l.id === sp.list) ?? null;
  const listKey = list ? list.id : "main";
  const listId = list?.id ?? null;
  const open = (id: string | null) => st.tasks.filter((t) => (t.incrementumListId ?? null) === id && t.status !== "done");
  const overdue = (id: string | null) => open(id).filter((t) => t.dueDate && t.dueDate < st.today).length;
  const tasks = st.tasks.filter((t) => (t.incrementumListId ?? null) === listId && (showDone || t.status !== "done"));
  const allOpen = st.tasks.filter((t) => t.status !== "done");
  const here = (extra: Record<string, string | null> = {}) => hrefWith(BASE, { list: listId, done: showDone ? "1" : null, ...extra });
  const back = here();
  const hasDone = st.tasks.some((t) => (t.incrementumListId ?? null) === listId && t.status === "done");
  const listHref = (key: string) => hrefWith(BASE, { list: key === "main" ? null : key, done: showDone ? "1" : null });

  return (
    <div className="screen">
      <PageHead title="Tasks" sub="The main list shows in GrayPortal's Master Task View (gold column) and syncs to Google Tasks. Sub-lists stay inside Incrementum, but their overdue tasks still reach Home.">
        <Link className="btn btn-sm" href="/tasks">
          Master Task View ↗
        </Link>
        <Link className="btn btn-sm" href={hrefWith(BASE, { list: listId, done: showDone ? null : "1" })} aria-pressed={showDone}>
          {showDone ? "Hide done" : "Show done"}
        </Link>
      </PageHead>
      <Console>
        <div className="agency two">
          <div className="agency-side">
            <Tree
              value={listKey}
              head={
                sp.newlist ? (
                  <form className="row" style={{ marginBottom: 10 }} action={createTaskListAction}>
                    <BackTo path={back} />
                    <input className="input" name="name" placeholder="e.g. Recruiting" required autoFocus style={{ flex: 1, width: "auto" }} />
                    <SubmitButton className="btn btn-sm" pendingLabel="…">
                      Add
                    </SubmitButton>
                  </form>
                ) : (
                  <Bracket wide href={here({ newlist: "1" })}>
                    New list
                  </Bracket>
                )
              }
              groups={[
                { label: "On the master view", items: [{ key: "main", label: "Main list", count: open(null).length, tone: overdue(null) ? "bad" : undefined, href: listHref("main") }] },
                { label: "Incrementum only", items: active.map((l) => ({ key: l.id, label: l.name, count: open(l.id).length, tone: overdue(l.id) ? "bad" : undefined, href: listHref(l.id) })) },
                ...(archived.length ? [{ label: "Archived", items: archived.map((l) => ({ key: l.id, label: l.name, count: open(l.id).length, href: listHref(l.id) })) }] : []),
              ]}
              foot={
                <Ledger
                  rows={[
                    ["Open", allOpen.length],
                    ["Overdue", allOpen.filter((t) => t.dueDate && t.dueDate < st.today).length, allOpen.some((t) => t.dueDate && t.dueDate < st.today) ? "bad" : undefined],
                    ["High priority", allOpen.filter((t) => t.priority === "high").length],
                    ["Due this week", allOpen.filter((t) => t.dueDate && t.dueDate >= st.today && t.dueDate <= addDays(st.today, 7)).length],
                  ]}
                />
              }
            />
          </div>
          <div className="agency-list">
            <div className="agency-list-head">
              {list ? list.name : "Main list"}
              {!list && <Badge tone="accent">On the master view</Badge>}
              {list?.archivedAt && <Badge>Archived</Badge>}
              <span className="r">{list ? <ManageList l={list} manage={sp.manage === "1"} back={back} manageHref={here({ manage: "1" })} /> : `${tasks.length} shown`}</span>
            </div>
            {!list?.archivedAt && <QuickAdd listId={listId} back={back} />}
            <TaskList tasks={tasks} lists={active} today={st.today} back={back} />
            {hasDone && !showDone && (
              <Link className="linkbtn muted" style={{ display: "block", padding: "14px 16px", textAlign: "left" }} href={hrefWith(BASE, { list: listId, done: "1" })}>
                Show done tasks
              </Link>
            )}
          </div>
        </div>
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}

function ManageList({ l, manage, back, manageHref }: { l: List; manage: boolean; back: string; manageHref: string }) {
  if (l.archivedAt)
    return (
      <form action={archiveTaskListAction}>
        <BackTo path={back} />
        <HiddenFields values={{ id: l.id }} />
        <button type="submit" className="linkbtn">
          Restore
        </button>
      </form>
    );
  if (!manage)
    return (
      <Link className="linkbtn muted" href={manageHref} aria-label={`Manage ${l.name}`} scroll={false}>
        <Settings2 size={13} /> Manage
      </Link>
    );
  return (
    <span className="row" style={{ gap: 12 }}>
      <form className="row" style={{ gap: 6 }} action={renameTaskListAction}>
        <BackTo path={back} />
        <HiddenFields values={{ id: l.id }} />
        <input className="input" name="name" defaultValue={l.name} style={{ height: 28, width: 150 }} aria-label="List name" />
        <SubmitButton className="btn btn-sm" pendingLabel="…">
          Rename
        </SubmitButton>
      </form>
      <form action={archiveTaskListAction}>
        <BackTo path={BASE} />
        <HiddenFields values={{ id: l.id, archived: "on" }} />
        <button type="submit" className="linkbtn">
          Archive
        </button>
      </form>
      <form action={deleteTaskListAction}>
        <BackTo path={BASE} />
        <HiddenFields values={{ id: l.id }} />
        <button type="submit" className="linkbtn danger">
          Delete
        </button>
      </form>
      <Link className="linkbtn muted" href={back} scroll={false}>
        Done
      </Link>
    </span>
  );
}

function QuickAdd({ listId, back }: { listId: string | null; back: string }) {
  return (
    <form className="quickadd" action={createIncTaskAction}>
      <BackTo path={back} />
      <HiddenFields values={{ listId }} />
      <input className="input" name="title" placeholder="Add a task" required aria-label="New task" style={{ flex: 1 }} />
      <input className="input" type="date" name="dueDate" aria-label="Due date" style={{ width: 150 }} />
      <label className="inline-check small" style={{ minHeight: 0 }}>
        <input type="checkbox" name="high" /> High
      </label>
      <SubmitButton className="btn" ariaLabel="Add task" pendingLabel="…">
        <Plus size={14} />
      </SubmitButton>
    </form>
  );
}

function TaskList({ tasks, lists, today, back }: { tasks: Task[]; lists: List[]; today: string; back: string }) {
  if (!tasks.length)
    return (
      <p className="muted small" style={{ padding: "16px 14px" }}>
        Nothing outstanding.
      </p>
    );
  return (
    <div className="rowlist">
      {tasks.map((t) => {
        const done = t.status === "done";
        return (
          <RowFold
            key={t.id}
            summary={
              <>
                <span className="rowfold-main">
                  <Check done={done} action={setIncTaskStatusAction} hidden={{ _back: back, id: t.id, status: done ? "not_started" : "done" }} label={done ? "Reopen" : "Complete"} />
                  <span data-done-text={done || undefined} style={{ textDecoration: done ? "line-through" : undefined }}>
                    {t.title}
                  </span>
                </span>
                <span className="chiprow">
                  {t.priority === "high" && <Badge tone="bad">High</Badge>}
                  {t.dueDate && <Badge tone={!done && t.dueDate < today ? "bad" : undefined}>{fmtDate(t.dueDate)}</Badge>}
                </span>
              </>
            }
          >
            <form className="form-grid g3" action={saveIncTaskAction}>
              <BackTo path={back} />
              <HiddenFields values={{ id: t.id, currentListId: t.incrementumListId ?? "" }} />
              <Field label="Title" wide>
                <input className="input" name="title" defaultValue={t.title} />
              </Field>
              <Field label="Due">
                <input className="input" type="date" name="dueDate" defaultValue={t.dueDate ?? ""} />
              </Field>
              <Field label="List">
                <select className="select" name="listId" defaultValue={t.incrementumListId ?? ""}>
                  <option value="">Main list (promote)</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="inline-check">
                <input type="checkbox" name="high" defaultChecked={t.priority === "high"} /> High priority
              </label>
              <div className="form-actions">
                <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                  Save
                </SubmitButton>
              </div>
            </form>
            <form action={deleteIncTaskAction} className="row">
              <BackTo path={back} />
              <HiddenFields values={{ id: t.id }} />
              <span className="spacer" />
              <button type="submit" className="linkbtn danger">
                Delete task
              </button>
            </form>
          </RowFold>
        );
      })}
    </div>
  );
}
