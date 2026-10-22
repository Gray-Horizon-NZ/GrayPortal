"use client";
// Port of the terminal concept's Work screens (OS/grayportal-terminal-
// concept/src/screens/Work.jsx): Calendar, Ideation, AI Agents, Reminders.
// Same markup; real data, and every button wired to the real actions (the
// concept's were placeholders). Ideation uses the real statuses
// (new → under review → actioned → archived) and keeps category tags.
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, Bot, ArrowRight, ArrowLeft, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { TODAY, fmtDate, daysBetween, monthCells } from "../format";
import { PageHead, Panel, Badge, Seg, Modal, go } from "../ui";
import { Legend } from "../charts";
import { fmtTime } from "./Home";
import { createInternalIdeationItemAction, updateIdeationItemStatusAction, deleteInternalIdeationItemAction } from "@/app/(app)/ideation/actions";
import { createAiAgentAction, updateAiAgentStatusAction, deleteAiAgentAction } from "@/app/(app)/ai-agents/actions";
import { createRecurringTemplateAction, softDeleteRecurringTemplateAction } from "@/app/(app)/reminders/actions";

const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8am–8pm
const SLOT = 48;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** `anchor` (YYYY-MM-DD) and `view` come from the URL so prev/next/today are real navigation. */
export function Calendar() {
  const { events, tasks = [], view, anchor, connected, accountEmail } = useStore();
  const shift = (n) => {
    const d = new Date(`${anchor}T00:00:00`);
    if (view === "month") d.setMonth(d.getMonth() + n);
    else d.setDate(d.getDate() + 7 * n);
    go(`/calendar?view=${view}&date=${iso(d)}`);
  };
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${anchor}T00:00:00`);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="screen">
      <PageHead title="Calendar" sub={connected ? `Google Calendar · ${accountEmail}` : "No Google account connected — connect one in Settings"}>
        <Legend items={[["Event", "c1"], ["Task due", "c2"]]} />
        <Seg value={view} onChange={(v) => go(`/calendar?view=${v}&date=${anchor}`)} options={[["week", "Week"], ["month", "Month"], ["agenda", "Agenda"]]} />
        <button className="iconbtn" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
        <button className="btn btn-sm" onClick={() => go(`/calendar?view=${view}&date=${TODAY}`)}>Today</button>
        <button className="iconbtn" aria-label="Next" onClick={() => shift(1)}><ChevronRight size={16} /></button>
      </PageHead>

      {view === "month" ? (
        <MonthView anchor={anchor} events={events} tasks={tasks} />
      ) : view === "week" ? (
        <section className="panel" style={{ overflowX: "auto" }}>
          <div className="cal" style={{ minWidth: 820 }}>
            <div className="cal-head" />
            {days.map((d) => (
              <div key={iso(d)} className="cal-head" data-today={iso(d) === TODAY || undefined}>
                {d.toLocaleDateString("en-NZ", { weekday: "short" })} {d.getDate()}
              </div>
            ))}
            <div className="cal-hours">
              {HOURS.map((h) => <div key={h} className="cal-hour">{h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}</div>)}
            </div>
            {days.map((d) => (
              <div key={iso(d)} className="cal-day" data-today={iso(d) === TODAY || undefined}>
                {HOURS.map((h) => <div key={h} className="slot" />)}
                {events.filter((e) => e.date === iso(d)).map((e) => (
                  <div
                    key={`${e.title}-${e.start}`}
                    className="cal-ev"
                    data-kind={e.kind}
                    style={{ top: (Math.max(8, e.start) - 8) * SLOT + 1, height: Math.max(24, (Math.min(20, e.end) - Math.max(8, e.start)) * SLOT - 2) }}
                  >
                    {e.title}
                    <small>{e.allDay ? "All day" : `${fmtTime(e.start)}–${fmtTime(e.end)}`}</small>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <Panel title="Next 7 days" pad={false}>
          <table className="table">
            <tbody>
              {days.map((d) => {
                const evs = events.filter((e) => e.date === iso(d));
                return evs.length === 0 ? (
                  <tr key={iso(d)}><td className="nowrap muted" style={{ width: 140 }}>{d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" })}</td><td className="muted">Nothing scheduled</td><td /></tr>
                ) : (
                  evs.map((e, j) => (
                    <tr key={`${iso(d)}-${j}`}>
                      <td className="nowrap" style={{ width: 140 }}>{j === 0 ? d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" }) : ""}</td>
                      <td className="strong">{e.title}</td>
                      <td className="num muted">{e.allDay ? "All day" : `${fmtTime(e.start)}–${fmtTime(e.end)}`}</td>
                    </tr>
                  ))
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function MonthView({ anchor, events, tasks }) {
  const first = new Date(`${anchor.slice(0, 7)}-01T00:00:00`);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // back to Monday
  const cells = Array.from({ length: monthCells(first) }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const all = [
    ...events.map((e) => ({ date: e.date, title: e.title, kind: e.kind, time: e.allDay ? "" : fmtTime(e.start) })),
    ...tasks.filter((t) => t.due && t.status !== "done").map((t) => ({ date: t.due, title: t.title, kind: "internal", time: "" })),
  ];
  return (
    <section className="panel">
      <div className="phead"><span className="ptitle">{first.toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}</span></div>
      <div className="month">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="month-head">{d}</div>)}
        {cells.map((d) => {
          const key = iso(d);
          const evs = all.filter((e) => e.date === key);
          return (
            <div key={key} className="month-day" data-out={d.getMonth() !== first.getMonth() || undefined} data-today={key === TODAY || undefined}>
              <div className="dn">{d.getDate()}</div>
              {evs.map((e, i) => <span key={`${e.title}-${i}`} className="month-ev" data-kind={e.kind} title={e.title}>{e.time ? `${e.time} ` : ""}{e.title}</span>)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const IDEA_STATUSES = ["new", "under_review", "actioned", "archived"];
const IDEA_LABEL = { new: "New", under_review: "Under review", actioned: "Actioned", archived: "Archived" };

export function Ideation() {
  const { ideas, categories } = useStore();
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState(categories[0]?.key ?? "");
  const label = (key) => categories.find((c) => c.key === key)?.label || "Uncategorised";
  const move = (x, dir) => {
    const i = IDEA_STATUSES.indexOf(x.status) + dir;
    if (i >= 0 && i < IDEA_STATUSES.length) updateIdeationItemStatusAction(x.id, IDEA_STATUSES[i]);
  };
  return (
    <div className="screen">
      <PageHead title="Ideation" sub="Business-wide ideas · admin only · categories live in Settings">
        <form
          className="row"
          action={async (fd) => {
            if (!draft.trim() || !category) return;
            fd.set("title", draft.trim());
            fd.set("category", category);
            await createInternalIdeationItemAction(fd);
            setDraft("");
          }}
        >
          <input className="input" style={{ width: 280 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={categories.length ? "New idea…" : "Add a category in Settings first"} disabled={!categories.length} />
          <select className="select" style={{ width: 150 }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!categories.length}><Plus size={14} /> Add</button>
        </form>
      </PageHead>
      <div className="board">
        {IDEA_STATUSES.map((s) => {
          const col = ideas.filter((x) => x.status === s);
          return (
            <div key={s} className="bcol">
              <div className="bcol-head">{IDEA_LABEL[s]}<span className="count">{col.length}</span></div>
              {col.map((x) => (
                <div key={x.id} className="bcard">
                  <div className="strong">{x.title}</div>
                  {x.desc && <div className="muted small" style={{ marginTop: 4 }}>{x.desc}</div>}
                  <div className="row">
                    <span className="chip">{label(x.category)}</span>
                    <span className="spacer" />
                    <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => deleteInternalIdeationItemAction(x.id)} aria-label="Remove idea"><Trash2 size={12} /></button>
                    <button className="iconbtn" style={{ width: 26, height: 26 }} disabled={s === IDEA_STATUSES[0]} onClick={() => move(x, -1)} aria-label="Move back"><ArrowLeft size={12} /></button>
                    <button className="iconbtn" style={{ width: 26, height: 26 }} disabled={s === IDEA_STATUSES[IDEA_STATUSES.length - 1]} onClick={() => move(x, 1)} aria-label="Move forward"><ArrowRight size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const AGENT_LABEL = { planned: "Planned", in_dev: "In development", active: "Active" };

export function AiAgents() {
  const { agents } = useStore();
  const [adding, setAdding] = useState(false);
  return (
    <div className="screen">
      <PageHead title="AI Agents" sub="Agent roadmap">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add agent</button>
      </PageHead>
      <div className="grid g-3">
        {["active", "in_dev", "planned"].map((s) => (
          <Panel key={s} title={AGENT_LABEL[s]} icon={Bot} right={agents.filter((a) => a.status === s).length}>
            <div className="stack" style={{ gap: 10 }}>
              {agents.filter((a) => a.status === s).map((a) => (
                <div key={a.id} className="card" style={{ background: "var(--t-panel-2)" }}>
                  <div className="row"><h3>{a.title}</h3><span className="spacer" /><Badge tone={s === "active" ? "good" : s === "in_dev" ? "accent" : undefined}>{AGENT_LABEL[s]}</Badge></div>
                  {a.desc && <p>{a.desc}</p>}
                  <div className="row">
                    <select className="select" style={{ width: 150, height: 28 }} value={a.status} onChange={(e) => updateAiAgentStatusAction(a.id, e.target.value)} aria-label="Status">
                      {Object.entries(AGENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <span className="spacer" />
                    <button className="btn btn-sm btn-danger" onClick={() => deleteAiAgentAction(a.id)}>Remove</button>
                  </div>
                </div>
              ))}
              {agents.filter((a) => a.status === s).length === 0 && <p className="muted small">None yet.</p>}
            </div>
          </Panel>
        ))}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add agent">
        <form className="stack" style={{ gap: 10 }} action={async (fd) => { await createAiAgentAction(fd); setAdding(false); }}>
          <label className="field"><span>Agent name</span><input className="input" name="title" required /></label>
          <label className="field"><span>What it does</span><textarea className="textarea" name="description" /></label>
          <label className="field"><span>Status</span>
            <select className="select" name="status" defaultValue="planned">{Object.entries(AGENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <button className="btn btn-primary" type="submit"><Plus size={14} /> Add agent</button>
        </form>
      </Modal>
    </div>
  );
}

export function Reminders() {
  const { reminders } = useStore();
  const [adding, setAdding] = useState(false);
  return (
    <div className="screen">
      <PageHead title="Recurring reminders" sub="Each one creates a task and an alert when it comes due">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> New reminder</button>
      </PageHead>
      <Panel title="Schedules" icon={Clock} pad={false}>
        <table className="table">
          <thead><tr><th>Name</th><th>Repeats</th><th>Creates task</th><th>Next due</th><th /></tr></thead>
          <tbody>
            {reminders.map((r) => {
              const d = daysBetween(TODAY, r.next);
              return (
                <tr key={r.id}>
                  <td className="strong">{r.name}</td>
                  <td>{r.interval}</td>
                  <td className="muted">{r.task}</td>
                  <td className="nowrap">
                    {fmtDate(r.next)}{" "}
                    {d <= 0 ? <Badge tone="bad">{d === 0 ? "Due today" : `${-d}d overdue`}</Badge> : d <= 7 ? <Badge tone="warn">in {d}d</Badge> : null}
                  </td>
                  <td className="num"><button className="btn btn-sm btn-danger" onClick={() => softDeleteRecurringTemplateAction(r.id)}>Remove</button></td>
                </tr>
              );
            })}
            {reminders.length === 0 && <tr><td colSpan={5} className="muted">No recurring reminders yet.</td></tr>}
          </tbody>
        </table>
      </Panel>
      <Modal open={adding} onClose={() => setAdding(false)} title="New reminder">
        <form className="stack" style={{ gap: 10 }} action={async (fd) => { await createRecurringTemplateAction(fd); setAdding(false); }}>
          <div className="form-grid">
            <label className="field"><span>Name</span><input className="input" name="name" required /></label>
            <label className="field"><span>Task it creates</span><input className="input" name="taskTitle" required /></label>
            <label className="field"><span>Repeats</span>
              <select className="select" name="interval" defaultValue="monthly"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="custom">Custom (days)</option></select>
            </label>
            <label className="field"><span>Custom interval (days)</span><input className="input" name="intervalDays" type="number" min="1" /></label>
            <label className="field"><span>Next due</span><input className="input" name="nextDueDate" type="date" defaultValue={TODAY} required /></label>
          </div>
          <button className="btn btn-primary" type="submit"><Plus size={14} /> Add reminder</button>
        </form>
      </Modal>
    </div>
  );
}
