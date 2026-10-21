import Link from "next/link";
import { ArrowUpRight, Building2, FolderKanban, ListChecks, TrendingUp, User } from "lucide-react";
import { listAllTasks } from "@/lib/dal/tasks";
import { listClients } from "@/lib/dal/clients";
import { INTERNAL_LIST_KEYS, INTERNAL_LIST_LABELS, type InternalListKey } from "@/lib/dal/tasks";
import { createTaskAction } from "./actions";
import { createDealTaskAction } from "../deals/actions";
import SubmitButton from "@/components/ui/SubmitButton";
import TaskRowEditable from "./TaskRowEditable";

type Column =
  | { kind: "client"; key: string; clientId: string; name: string }
  | { kind: "deal"; key: string; dealId: string; name: string }
  | { kind: "internal"; key: string; internalList: InternalListKey; name: string };

/**
 * Every task list — one per client (even with zero tasks, so "add task" is
 * always one click away), one per prospect deal that has a task, and the
 * fixed internal lists — shown terminal-style: the lists down the left with
 * open/overdue counts, the selected list's tasks on the right. One page
 * scroller, no nested column scrollbars (rules: grayhorizon-docs/Terminal
 * UI/RULES.md). The selected list lives in ?list= so it survives the
 * server-action refresh after adding or completing a task.
 *
 * Grouping uses each task's resolvedClientId (listAllTasks), not the raw
 * clientId — a deal-linked task created before its company converted to a
 * client would otherwise still bucket into a separate prospect list even
 * after that conversion. Only a deal with no converted client gets its own
 * "deal" list.
 */
export default async function MasterTaskView({ list }: { list?: string }) {
  const [tasks, clients] = await Promise.all([listAllTasks(), listClients()]);
  const today = new Date().toISOString().slice(0, 10);

  const dealColumns = new Map<string, string>();
  for (const t of tasks) {
    if (t.dealId && !t.resolvedClientId) dealColumns.set(t.dealId, t.dealCompanyName ?? "Prospect");
  }

  const internal: Column[] = INTERNAL_LIST_KEYS.map((key) => ({ kind: "internal", key: `i:${key}`, internalList: key, name: INTERNAL_LIST_LABELS[key] }));
  const clientCols: Column[] = clients
    .filter((c) => !c.hiddenFromTaskView)
    .map((c) => ({ kind: "client", key: `c:${c.id}`, clientId: c.id, name: c.name }));
  const dealCols: Column[] = Array.from(dealColumns, ([dealId, name]) => ({ kind: "deal", key: `d:${dealId}`, dealId, name }));
  const columns = [...internal, ...clientCols, ...dealCols];

  const tasksForColumn = (col: Column) => {
    if (col.kind === "client") return tasks.filter((t) => t.resolvedClientId === col.clientId);
    if (col.kind === "deal") return tasks.filter((t) => !t.resolvedClientId && t.dealId === col.dealId);
    // Incrementum sub-list tasks (incrementumListId set) are deliberately
    // hidden here — only the Incrementum main list shows on the master view.
    return tasks.filter(
      (t) => !t.resolvedClientId && !t.dealId && !t.incrementumListId && (t.internalList ?? INTERNAL_LIST_KEYS[0]) === col.internalList
    );
  };
  const counts = (col: Column) => {
    const open = tasksForColumn(col).filter((t) => t.status !== "done");
    return { open: open.length, overdue: open.filter((t) => t.dueDate && t.dueDate < today).length };
  };

  const selected = columns.find((c) => c.key === list) ?? columns[0];
  const colTasks = tasksForColumn(selected);
  // Overdue first, then by due date, undated last.
  const open = colTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const done = colTasks.filter((t) => t.status === "done");
  const columnClientId = selected.kind === "client" ? selected.clientId : null;
  const isIncrementum = selected.kind === "internal" && selected.internalList === "project_incrementum";

  const clientOptions = clients.filter((c) => !c.hiddenFromTaskView).map((c) => ({ id: c.id, name: c.name }));
  const internalListOptions = INTERNAL_LIST_KEYS.map((key) => ({ key, label: INTERNAL_LIST_LABELS[key] }));

  const listButton = (col: Column) => {
    const c = counts(col);
    const Icon = col.kind === "client" ? User : col.kind === "deal" ? Building2 : col.internalList === "project_incrementum" ? TrendingUp : FolderKanban;
    return (
      <Link key={col.key} href={`/tasks?view=master&list=${encodeURIComponent(col.key)}`} className="gh-term-listbtn" data-active={col.key === selected.key || undefined}>
        <Icon size={14} strokeWidth={1.75} />
        <span className="gh-term-listbtn-name">{col.name}</span>
        {c.overdue > 0 && <span className="gh-term-listbtn-overdue" title={`${c.overdue} overdue`}>{c.overdue}</span>}
        <span className="gh-term-listbtn-count">{c.open}</span>
      </Link>
    );
  };

  return (
    <div className="gh-term-tasks">
      <nav className="gh-term-panel gh-term-lists" aria-label="Task lists">
        <p className="gh-term-lists-group">Gray Horizon</p>
        {internal.map(listButton)}
        {clientCols.length > 0 && <p className="gh-term-lists-group">Clients</p>}
        {clientCols.map(listButton)}
        {dealCols.length > 0 && <p className="gh-term-lists-group">Prospects</p>}
        {dealCols.map(listButton)}
      </nav>

      <section className="gh-term-panel">
        <header className="gh-term-phead">
          <ListChecks size={13} strokeWidth={2} />
          <span className="gh-term-ptitle">{selected.name}</span>
          {selected.kind === "deal" && <span className="gh-badge">Prospect</span>}
          <span className="gh-term-phead-r">
            {open.length} open
            {selected.kind === "client" && (
              <Link href={`/clients/${selected.clientId}`} className="gh-term-link">
                Client profile <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} />
              </Link>
            )}
            {selected.kind === "deal" && (
              <Link href={`/deals/${selected.dealId}`} className="gh-term-link">
                Deal <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} />
              </Link>
            )}
            {isIncrementum && (
              <Link href="/incrementum/tasks" className="gh-term-link">
                All Incrementum lists <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} />
              </Link>
            )}
          </span>
        </header>

        <form
          className="gh-term-quickadd"
          action={
            selected.kind === "deal"
              ? createDealTaskAction.bind(null, selected.dealId)
              : createTaskAction.bind(null, selected.kind === "client" ? selected.clientId : null, selected.kind === "internal" ? selected.internalList : null)
          }
        >
          <input className="gh-input" name="title" placeholder={`Add a task to ${selected.name}…`} required />
          <SubmitButton>Add</SubmitButton>
        </form>

        <div className="gh-term-taskrows">
          {open.map((t) => (
            <TaskRowEditable key={t.id} task={t} clientId={columnClientId} clientOptions={clientOptions} internalListOptions={internalListOptions} />
          ))}
          {open.length === 0 && (
            <div className="gh-term-empty">
              <p className="gh-term-empty-title">Nothing outstanding</p>
              <p>Add the first task above.</p>
            </div>
          )}
        </div>

        {done.length > 0 && (
          <details className="gh-term-done">
            <summary>Done ({done.length})</summary>
            <div className="gh-term-taskrows">
              {done.map((t) => (
                <TaskRowEditable key={t.id} task={t} clientId={columnClientId} clientOptions={clientOptions} internalListOptions={internalListOptions} />
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
