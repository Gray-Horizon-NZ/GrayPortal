"use client";
// Port of the terminal concept's Tasks (OS/grayportal-terminal-concept/src/
// screens/Tasks.jsx): list picker + task rows, and the Master view board.
// Real lists (Gray Horizon, Gray Horizon - Focus, Project Incrementum, each
// client) plus a Prospects group for deal-linked tasks, which the real app
// always had. Complete / star / priority / add save through the store.
import { useState } from "react";
import { Check, Star, User, Inbox, AlertTriangle, Folder, Plus, Flag, Building2 } from "lucide-react";
import { useStore } from "../store";
import { INTERNAL_LISTS, TODAY, fmtDate } from "../format";
import { PageHead, Seg, Empty, Badge } from "../ui";

const PRIORITY_LABEL = { high: "High", normal: "Normal", low: "Low" };

export function listName(id, clients, tasks = []) {
  if (typeof id === "string" && id.startsWith("deal:")) return tasks.find((t) => t.list === id)?.dealName || "Prospect";
  return INTERNAL_LISTS.find((l) => l.id === id)?.label || clients.find((c) => c.id === id)?.name || id;
}

export function TaskRow({ task: t, setTasks, hideList }) {
  const { clients, tasks } = useStore();
  const [open, setOpen] = useState(false);
  const done = t.status === "done";
  const overdue = !done && t.due && t.due < TODAY;
  const patch = (p) => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...p } : x)));
  return (
    <div className="taskrow" data-done={done || undefined}>
      <button className="completebtn" data-done={done || undefined} onClick={() => patch({ status: done ? "not_started" : "done" })} aria-pressed={done}>
        <Check size={12} /> {done ? "Done" : "Complete"}
      </button>
      <div style={{ minWidth: 0 }}>
        <div className="task-title" onClick={() => setOpen(!open)}>{t.title}</div>
        <div className="task-sub row" style={{ gap: 8 }}>
          {!hideList && <span className="chip"><Folder size={10} /> {listName(t.list, clients, tasks)}</span>}
          <span><User size={10} style={{ verticalAlign: -1 }} /> {t.assignee}</span>
          {t.status === "in_progress" && <Badge tone="accent">In progress</Badge>}
        </div>
      </div>
      <span className="row hide-sm" style={{ gap: 6, fontSize: 12 }}>
        <i className="prio" data-p={t.priority} /> {PRIORITY_LABEL[t.priority]}
      </span>
      <span className={`small hide-sm ${overdue ? "tone-bad" : "muted"}`} style={{ minWidth: 70, textAlign: "right" }}>
        {t.due ? (overdue ? `Overdue · ${fmtDate(t.due)}` : fmtDate(t.due)) : "No date"}
      </span>
      <button className="star" data-on={t.starred || undefined} onClick={() => patch({ starred: !t.starred })} aria-label={t.starred ? "Unstar" : "Star"}>
        <Star size={15} fill={t.starred ? "currentColor" : "none"} />
      </button>
      <span className="hide-sm" />
      {open && (
        <div className="task-detail">
          {t.notes || "No notes."}
          <div className="row" style={{ marginTop: 8 }}>
            <select className="select" style={{ width: 160, height: 28 }} value={t.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <select className="select" style={{ width: 120, height: 28 }} value={t.priority} onChange={(e) => patch({ priority: e.target.value })}>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
            <input className="input" type="date" style={{ width: 150, height: 28 }} value={t.due || ""} onChange={(e) => patch({ due: e.target.value })} aria-label="Due date" />
            <span className="spacer" />
            <button className="btn btn-sm btn-danger" onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const { tasks, setTasks, clients } = useStore();
  const [list, setList] = useState(INTERNAL_LISTS[0].id);
  const [show, setShow] = useState("open");
  const [board, setBoard] = useState(false);
  const [draft, setDraft] = useState("");

  const isOpen = (t) => t.status !== "done";
  // Filter views sit between the internal lists and the client lists.
  const views = [
    { id: "priority", label: "Priority", icon: Flag, filter: (t) => t.priority === "high" },
    { id: "starred", label: "Starred", icon: Star, filter: (t) => t.starred },
    { id: "overdue", label: "Overdue", icon: AlertTriangle, filter: (t) => t.due && t.due < TODAY && isOpen(t), danger: true },
  ];
  const taskClients = clients.filter((c) => !c.hiddenFromTaskView);
  const prospects = [...new Map(tasks.filter((t) => t.list.startsWith("deal:")).map((t) => [t.list, t.dealName || "Prospect"])).entries()].map(([id, label]) => ({ id, label }));
  const concreteLists = [...INTERNAL_LISTS.map((l) => ({ id: l.id, label: l.label })), ...taskClients.map((c) => ({ id: c.id, label: c.name })), ...prospects];
  const view = views.find((v) => v.id === list);
  const filterFn = view ? view.filter : (t) => t.list === list;
  const shown = tasks.filter(filterFn).filter((t) => (show === "open" ? isOpen(t) : show === "done" ? !isOpen(t) : true)).sort(sortTasks);
  const title = view ? view.label : listName(list, clients, tasks);
  const addTo = view ? INTERNAL_LISTS[0].id : list;
  const listButton = (id, label, Icon, n, danger) => (
    <button key={id} className="listbtn" data-active={(!board && list === id) || undefined} onClick={() => { setList(id); setBoard(false); }}>
      {Icon && <Icon size={14} />} {label}
      <span className="count" data-tone={danger && n ? "bad" : undefined}>{n}</span>
    </button>
  );

  return (
    <div className="screen">
      <PageHead title="Tasks" sub={`${tasks.filter(isOpen).length} open · ${tasks.filter((t) => isOpen(t) && t.due && t.due < TODAY).length} overdue`}>
        <Seg value={board ? "board" : "lists"} onChange={(v) => setBoard(v === "board")} options={[["lists", "Lists"], ["board", "Master view"]]} />
      </PageHead>

      {board ? (
        <div className="board">
          {concreteLists.map((l) => {
            const col = tasks.filter((t) => t.list === l.id && isOpen(t)).sort(sortTasks);
            return (
              <div className="bcol" key={l.id}>
                <div className="bcol-head">{l.label}<span className="count">{col.length}</span></div>
                {col.map((t) => (
                  <div className="bcard" key={t.id}>
                    <div className="row" style={{ marginTop: 0, alignItems: "flex-start", flexWrap: "nowrap" }}>
                      <button
                        className="completebtn"
                        style={{ height: 22, padding: "0 6px" }}
                        onClick={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status: "done" } : x)))}
                        aria-label="Complete"
                      >
                        <Check size={11} />
                      </button>
                      <span style={{ color: "var(--t-strong)" }}>{t.title}</span>
                    </div>
                    <div className="row">
                      <i className="prio" data-p={t.priority} /> {PRIORITY_LABEL[t.priority]} · {t.assignee}
                      <span className={t.due && t.due < TODAY ? "tone-bad" : ""} style={{ marginLeft: "auto" }}>{t.due ? fmtDate(t.due) : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tasklayout">
          <nav className="panel lists" aria-label="Task lists">
            <p className="grouplabel">Internal</p>
            {INTERNAL_LISTS.map((l) => listButton(l.id, l.label, Inbox, tasks.filter((t) => t.list === l.id && isOpen(t)).length))}
            <p className="grouplabel">Views</p>
            {views.map((v) => listButton(v.id, v.label, v.icon, tasks.filter(v.filter).filter(isOpen).length, v.danger))}
            <p className="grouplabel">Clients</p>
            {taskClients.map((c) => listButton(c.id, c.name, Folder, tasks.filter((t) => t.list === c.id && isOpen(t)).length))}
            {prospects.length > 0 && <p className="grouplabel">Prospects</p>}
            {prospects.map((p) => listButton(p.id, p.label, Building2, tasks.filter((t) => t.list === p.id && isOpen(t)).length))}
          </nav>

          <div className="stack">
            <div className="row">
              <span className="ptitle" style={{ fontSize: 13 }}>{title}</span>
              <span className="muted small">{shown.length} shown</span>
              <span className="spacer" />
              <Seg small value={show} onChange={setShow} options={[["open", "Open"], ["done", "Done"], ["any", "All"]]} />
            </div>
            <section className="panel">
              <form
                className="quickadd"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  setTasks((ts) => [{ id: Date.now(), list: addTo, title: draft.trim(), priority: list === "priority" ? "high" : "normal", status: "not_started", due: "", assignee: "You", starred: list === "starred", notes: "" }, ...ts]);
                  setDraft("");
                }}
              >
                <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add a task to ${listName(addTo, clients, tasks)}…`} />
                <button className="btn btn-primary"><Plus size={14} /> Add</button>
              </form>
              {shown.length === 0 ? <Empty icon={Check} title="Nothing here" /> : shown.map((t) => <TaskRow key={t.id} task={t} setTasks={setTasks} hideList={!view} />)}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

const PRANK = { high: 0, normal: 1, low: 2 };
function sortTasks(a, b) {
  if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
  if (PRANK[a.priority] !== PRANK[b.priority]) return PRANK[a.priority] - PRANK[b.priority];
  return (a.due || "9999").localeCompare(b.due || "9999");
}
