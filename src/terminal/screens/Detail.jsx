"use client";
// Record pages the terminal concept has no screen for — deal, company,
// contact, contractor, client onboarding, and Owner's Cut past periods —
// rebuilt in the concept's own parts (.screen, PageHead, Panel, KV, table,
// timeline, stepper, Modal) so they match the ported screens. Every control
// runs the same real action the old page did.
import { useRef, useState } from "react";
import {
  ArrowLeft, Building2, User, Mail, Phone, Plus, Trash2, Send, NotebookPen, ListChecks, Workflow, Users, KeyRound, History,
  Receipt, Wallet, Check, X, CalendarCheck, CalendarX, UserPlus, ToggleLeft,
} from "lucide-react";
import { useStore } from "../store";
import { TODAY, money, fmtDate, STAGES, OPEN_STAGES, PORTAL_FEATURES } from "../format";
import { PageHead, Panel, KV, Priv, Badge, Toggle, Empty, Modal, Stat, go } from "../ui";
import { TaskRow } from "./Tasks";
import { stripHtmlToText } from "@/lib/email/text";
import { changeStageAction, deleteDealAction, logDealActivityAction, sendDealEmailAction } from "@/app/(app)/deals/actions";
import { createDealAction } from "@/app/(app)/deals/actions";
import { createContactAction, deleteCompanyAction } from "@/app/(app)/companies/actions";
import { logContactActivityAction, sendContactEmailAction } from "@/app/(app)/contacts/actions";
import { deleteContractorAction, inviteContractorAction } from "@/app/(app)/contractors/actions";
import { onboardClientAction } from "@/app/(app)/clients/onboard/actions";
import {
  createPeriodAction, deletePeriodAction, addExpenseItemAction, removeExpenseItemAction, addContractorPaymentAction, removeContractorPaymentAction,
} from "@/app/(app)/finance/personal/actions";

const rowStyle = { padding: "8px 0", borderBottom: "1px solid var(--t-line)" };
const stageTone = (s) => (s === "Won" ? "good" : s === "Lost" ? "bad" : undefined);

function Back({ to, label }) {
  return (
    <button className="eyebrow row" style={{ gap: 6 }} onClick={() => go(to)}>
      <ArrowLeft size={12} /> {label}
    </button>
  );
}

function Flash({ items = [] }) {
  return items.map((f) => (
    <div key={f.text} className="note" data-tone={f.tone}>{f.tone === "bad" ? <X size={14} /> : <Check size={14} />}{f.text}</div>
  ));
}

/** Activity rows (newest first), in the concept's timeline. */
function Timeline({ items }) {
  if (items.length === 0) return <p className="muted small">No activity logged yet.</p>;
  return (
    <div className="timeline">
      {items.map((a) => (
        <div key={a.id}>
          <time>{fmtDate(a.at)} · {a.type}</time>
          <span>{a.body}{a.outcome && <span className="muted"> — {a.outcome}</span>}</span>
        </div>
      ))}
    </div>
  );
}

function LogActivity({ open, onClose, action }) {
  return (
    <Modal open={open} onClose={onClose} title="Log activity">
      <form className="stack" style={{ gap: 10 }} action={async (fd) => { await action(fd); onClose(); }}>
        <label className="field"><span>Type</span>
          <select className="select" name="type" defaultValue="note">
            <option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option>
          </select>
        </label>
        <label className="field"><span>What happened</span><textarea className="textarea" name="body" required /></label>
        <label className="field"><span>Outcome</span><input className="input" name="outcome" /></label>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><NotebookPen size={13} /> Log activity</button>
      </form>
    </Modal>
  );
}

/** Plain-text compose; a template only prefills subject and body (its HTML stripped). */
function SendEmail({ open, onClose, action, to, templates }) {
  const subject = useRef(null);
  const body = useRef(null);
  return (
    <Modal open={open} onClose={onClose} title={`Email ${to}`} wide>
      <form className="stack" style={{ gap: 10 }} action={async (fd) => { await action(fd); onClose(); }}>
        {templates.length > 0 && (
          <label className="field"><span>Start from a template</span>
            <select className="select" defaultValue="" onChange={(e) => {
              const t = templates.find((x) => x.key === e.target.value);
              if (t && subject.current && body.current) {
                subject.current.value = t.subject;
                body.current.value = stripHtmlToText(t.htmlBody);
              }
            }}>
              <option value="">None</option>
              {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </label>
        )}
        <label className="field"><span>Subject</span><input ref={subject} className="input" name="subject" required /></label>
        <label className="field"><span>Message</span><textarea ref={body} className="textarea" name="body" rows={8} required /></label>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Send size={13} /> Send</button>
      </form>
    </Modal>
  );
}

/* ─── Deal ─────────────────────────────────────────────────────────────── */
export function DealDetail() {
  const { deal: d, tasks, setTasks, templates, flash } = useStore();
  const [open, setOpen] = useState(null); // "log" | "email" | "stage"
  const [confirm, setConfirm] = useState(false);
  const [draft, setDraft] = useState("");
  const idx = OPEN_STAGES.indexOf(d.stage);
  const isOpen = idx >= 0;
  const close = () => setOpen(null);
  return (
    <div className="screen">
      <Back to="/pipeline?view=list" label="Pipeline" />
      <PageHead title={d.company} sub={[d.pkg, d.source && `from ${d.source}`].filter(Boolean).join(" · ") || "Deal"}>
        <Badge tone={stageTone(d.stage) || "solid"}>{d.stage}</Badge>
        {d.sync === "synced" && <Badge tone="good"><CalendarCheck size={11} /> Synced to Calendar</Badge>}
        {d.sync === "failed" && <Badge tone="bad"><CalendarX size={11} /> Calendar sync failed</Badge>}
        {confirm ? (
          <>
            <span className="small tone-bad">Remove this deal?</span>
            <button className="btn btn-sm btn-danger" onClick={() => deleteDealAction(d.id, d.companyId ?? undefined)}>Yes, remove</button>
            <button className="btn btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirm(true)}><Trash2 size={13} /> Remove deal</button>
        )}
        <button className="btn btn-primary" onClick={() => setOpen("stage")}>Change stage</button>
      </PageHead>
      <Flash items={flash} />

      <section className="panel panel-pad">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <span className="muted small">{d.nextAction ? `Next: ${d.nextAction}` : ""}{d.next ? ` · due ${fmtDate(d.next)}` : ""}</span>
          <span style={{ fontSize: 26, fontWeight: 600, color: "var(--t-accent)" }}><Priv>{d.value ? money(d.value) : "TBC"}</Priv><span className="muted small"> /mo</span></span>
        </div>
        <div className="stepper">
          {OPEN_STAGES.map((s, i) => (
            <span key={s} data-done={i < idx || d.stage === "Won" || undefined} data-current={s === d.stage || undefined}>{s}</span>
          ))}
          <span data-current={d.stage === "Won" || undefined}>Won</span>
        </div>
      </section>

      <div className="grid g-3">
        <div className="stack">
          {d.companyId && (
            <Panel title="Company" icon={Building2} right={<button className="btn btn-sm" onClick={() => go(`/companies/${d.companyId}`)}>Open</button>}>
              <KV rows={[["Name", d.company], ["Industry", d.industry || "—"]]} />
            </Panel>
          )}
          <Panel title="Primary contact" icon={User} right={d.contactId && <button className="btn btn-sm" onClick={() => go(`/contacts/${d.contactId}`)}>Open</button>}>
            {d.contact ? (
              <>
                <KV rows={[["Name", d.contact, null, true], ["Role", d.role || "—"], ["Email", d.email || "—", null, true], ["Phone", d.phone || "—", null, true]]} />
                <div className="row" style={{ marginTop: 10 }}>
                  {d.email && <button className="btn btn-sm" onClick={() => setOpen("email")}><Mail size={12} /> Email</button>}
                  {d.phone && <a className="btn btn-sm" href={`tel:${d.phone}`}><Phone size={12} /> Call</a>}
                </div>
              </>
            ) : <p className="muted small">No primary contact set.</p>}
          </Panel>
        </div>
        <Panel title="Activity" icon={History} right={<button className="btn btn-sm" onClick={() => setOpen("log")}><Plus size={12} /> Log activity</button>}>
          <Timeline items={d.activity} />
        </Panel>
        <Panel title="Tasks" icon={ListChecks} pad={false}>
          <form className="quickadd" onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setTasks((ts) => [{ id: Date.now(), list: `deal:${d.id}`, title: draft.trim(), status: "not_started", priority: "normal", due: "", starred: false }, ...ts]);
            setDraft("");
          }}>
            <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a task" />
            <button className="btn btn-primary"><Plus size={13} /></button>
          </form>
          {tasks.length === 0 ? <Empty title="No tasks yet" /> : tasks.map((t) => <TaskRow key={t.id} task={t} setTasks={setTasks} hideList />)}
        </Panel>
      </div>

      <Modal open={open === "stage"} onClose={close} title="Change stage">
        <form className="stack" style={{ gap: 10 }} action={async (fd) => { await changeStageAction(d.id, fd); close(); }}>
          <label className="field"><span>Stage</span><select className="select" name="stage" defaultValue={d.stage}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field"><span>Close reason (required if Lost)</span><input className="input" name="closeReason" defaultValue={d.lostReason} /></label>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>Update stage</button>
        </form>
      </Modal>
      <LogActivity open={open === "log"} onClose={close} action={logDealActivityAction.bind(null, d.id)} />
      {d.email && <SendEmail open={open === "email"} onClose={close} action={sendDealEmailAction.bind(null, d.id)} to={d.contact} templates={templates} />}
      {!isOpen && d.lostReason && <div className="note" data-tone="bad"><X size={14} /> Lost: {d.lostReason}</div>}
    </div>
  );
}

/* ─── Company ──────────────────────────────────────────────────────────── */
export function CompanyDetail() {
  const { company: c } = useStore();
  const [open, setOpen] = useState(null); // "deal" | "contact"
  const [confirm, setConfirm] = useState(false);
  const close = () => setOpen(null);
  return (
    <div className="screen">
      <Back to="/clients" label="Clients & prospects" />
      <PageHead title={c.name} sub={[c.industry, c.region, c.status, c.source && `from ${c.source}`].filter(Boolean).join(" · ")}>
        {confirm ? (
          <>
            <span className="small tone-bad">Remove {c.name}?</span>
            <button className="btn btn-sm btn-danger" onClick={() => deleteCompanyAction(c.id)}>Yes, remove</button>
            <button className="btn btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirm(true)}><Trash2 size={13} /> Remove company</button>
        )}
        {c.clientId ? (
          <button className="btn btn-primary" onClick={() => go(`/clients/${c.clientId}`)}>View client</button>
        ) : c.hasWonDeal ? (
          <button className="btn btn-primary" onClick={() => go(`/clients/onboard?companyId=${c.id}`)}><UserPlus size={14} /> Onboard client</button>
        ) : null}
      </PageHead>
      <div className="grid g-2">
        <Panel title="Deals" icon={Workflow} pad={false} right={<button className="btn btn-sm" onClick={() => setOpen("deal")}><Plus size={12} /> New deal</button>}>
          {c.deals.length === 0 ? <Empty title="No deals yet" /> : (
            <table className="table">
              <tbody>
                {c.deals.map((d) => (
                  <tr key={d.id} data-click onClick={() => go(`/deals/${d.id}`)}>
                    <td className="strong">{d.label}</td>
                    <td><Badge tone={stageTone(d.stage)}>{d.stage}</Badge></td>
                    <td className="num"><Priv>{d.value ? money(d.value) : "TBC"}</Priv></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Contacts" icon={Users} pad={false} right={<button className="btn btn-sm" onClick={() => setOpen("contact")}><Plus size={12} /> Add contact</button>}>
          {c.contacts.length === 0 ? <Empty title="No contacts yet" /> : (
            <table className="table">
              <tbody>
                {c.contacts.map((p) => (
                  <tr key={p.id} data-click onClick={() => go(`/contacts/${p.id}`)}>
                    <td className="strong">{p.name}</td>
                    <td className="muted">{p.role || "—"}</td>
                    <td><Priv>{p.email || "—"}</Priv></td>
                    <td className="nowrap"><Priv>{p.phone || "—"}</Priv></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
      <Modal open={open === "deal"} onClose={close} title="New deal">
        <form className="stack" style={{ gap: 10 }} action={async (fd) => { await createDealAction(c.id, fd); close(); }}>
          <div className="form-grid">
            <label className="field"><span>Next action</span><input className="input" name="nextAction" required /></label>
            <label className="field"><span>Next action date</span><input className="input" name="nextActionDate" type="date" defaultValue={TODAY} required /></label>
            <label className="field"><span>Value / mo</span><input className="input" name="valueNzd" type="number" min="0" step="0.01" /></label>
            <label className="field"><span>Package</span><input className="input" name="packageTier" /></label>
          </div>
          <label className="field"><span>Source</span><input className="input" name="source" defaultValue={c.source} /></label>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Plus size={14} /> Create deal</button>
        </form>
      </Modal>
      <Modal open={open === "contact"} onClose={close} title="Add contact">
        <form className="stack" style={{ gap: 10 }} action={async (fd) => { await createContactAction(c.id, fd); close(); }}>
          <div className="form-grid">
            <label className="field"><span>First name</span><input className="input" name="firstName" required /></label>
            <label className="field"><span>Last name</span><input className="input" name="lastName" required /></label>
            <label className="field"><span>Role / title</span><input className="input" name="roleTitle" /></label>
            <label className="field"><span>Email</span><input className="input" name="email" type="email" /></label>
            <label className="field"><span>Phone</span><input className="input" name="phone" /></label>
          </div>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Plus size={14} /> Add contact</button>
        </form>
      </Modal>
    </div>
  );
}

/* ─── Contact ──────────────────────────────────────────────────────────── */
export function ContactDetail() {
  const { contact: p, templates, flash } = useStore();
  const [open, setOpen] = useState(null);
  const close = () => setOpen(null);
  return (
    <div className="screen">
      <Back to={p.companyId ? `/companies/${p.companyId}` : "/clients"} label={p.company || "Clients & prospects"} />
      <PageHead title={p.name} sub={[p.role, p.company].filter(Boolean).join(" · ") || "Contact"}>
        <button className="btn" onClick={() => setOpen("log")}><NotebookPen size={13} /> Log activity</button>
        <button className="btn btn-primary" disabled={!p.email} onClick={() => setOpen("email")}><Mail size={13} /> {p.email ? "Send email" : "No email on file"}</button>
      </PageHead>
      <Flash items={flash} />
      <div className="grid g-2">
        <div className="stack">
          <Panel title="Details" icon={User}>
            <KV rows={[["Email", p.email || "—", null, true], ["Phone", p.phone || "—", null, true], ["Role", p.role || "—"]]} />
            {p.notes && <div className="note" style={{ marginTop: 12 }}>{p.notes}</div>}
          </Panel>
          <Panel title="Linked deals" icon={Workflow} pad={false}>
            {p.deals.length === 0 ? <Empty title="No deals linked to this contact" /> : (
              <table className="table">
                <tbody>
                  {p.deals.map((d) => (
                    <tr key={d.id} data-click onClick={() => go(`/deals/${d.id}`)}>
                      <td className="strong">{d.label}</td>
                      <td><Badge tone={stageTone(d.stage)}>{d.stage}</Badge></td>
                      <td className="num"><Priv>{d.value ? money(d.value) : "TBC"}</Priv></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
        <Panel title="Activity" icon={History}><Timeline items={p.activity} /></Panel>
      </div>
      <LogActivity open={open === "log"} onClose={close} action={logContactActivityAction.bind(null, p.id)} />
      {p.email && <SendEmail open={open === "email"} onClose={close} action={sendContactEmailAction.bind(null, p.id)} to={p.name} templates={templates} />}
    </div>
  );
}

/* ─── Contractor (roster record) ───────────────────────────────────────── */
export function ContractorDetail() {
  const { contractor: k, flash } = useStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen">
      <Back to="/incrementum/contractors" label="Contractors" />
      <PageHead title={k.name} sub={k.specialty || "Contractor"}>
        {confirm ? (
          <>
            <span className="small tone-bad">Remove {k.name}?</span>
            <button className="btn btn-sm btn-danger" onClick={() => deleteContractorAction(k.id)}>Yes, remove</button>
            <button className="btn btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirm(true)}><Trash2 size={13} /> Remove contractor</button>
        )}
      </PageHead>
      <Flash items={flash} />
      <div className="grid g-2">
        <Panel title="System access" icon={KeyRound}>
          {k.users.length === 0 ? (
            <form className="stack" style={{ gap: 10 }} action={inviteContractorAction.bind(null, k.id)}>
              <p className="muted small">No login invited yet.</p>
              <div className="form-grid">
                <input className="input" name="email" type="email" placeholder="Contractor email" required />
                <input className="input" name="displayName" placeholder="Display name (optional)" />
              </div>
              <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Send size={13} /> Invite to system</button>
            </form>
          ) : (
            <table className="table">
              <tbody>
                {k.users.map((u) => (
                  <tr key={u.id}><td><Priv>{u.email}</Priv></td><td><Badge tone={u.active ? "good" : "warn"}>{u.active ? "Active" : "Awaiting first sign-in"}</Badge></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Assigned tasks" icon={ListChecks} pad={false}>
          {k.tasks.length === 0 ? <Empty title={k.users.length ? "No tasks assigned yet" : "No login yet, so nothing can be assigned"} /> : (
            <table className="table">
              <tbody>{k.tasks.map((t) => <tr key={t.id}><td className="strong">{t.title}</td><td><Badge tone={t.status === "done" ? "good" : undefined}>{t.status.replace("_", " ")}</Badge></td></tr>)}</tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ─── Onboard client ───────────────────────────────────────────────────── */
const DEFAULT_FEATURES = new Set(["tasks", "documents", "referrals"]);

export function OnboardClient() {
  const { onboard: o } = useStore();
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  return (
    <div className="screen">
      <Back to="/clients" label="All clients" />
      <PageHead
        title="Onboard client"
        sub={o.company ? `Converting ${o.company.name} from prospect to client — the company isn't duplicated` : "Creates the company, client record, portal login, features and starter tasks in one step"}
      />
      {o.error && <div className="note" data-tone="bad"><X size={14} /> Couldn&apos;t onboard: {o.error}</div>}
      <form action={onboardClientAction} className="grid g-2">
        <div className="stack">
          {o.company ? (
            <input type="hidden" name="companyId" value={o.company.id} />
          ) : (
            <Panel title="Company" icon={Building2}>
              <div className="form-grid">
                <label className="field"><span>Company name</span><input className="input" name="companyName" required /></label>
                <label className="field"><span>Source</span><input className="input" name="source" placeholder="e.g. referral" required /></label>
                <label className="field"><span>Industry</span><input className="input" name="industry" /></label>
                <label className="field"><span>Region</span><input className="input" name="region" /></label>
              </div>
              <label className="field" style={{ marginTop: 12 }}><span>Website</span><input className="input" name="website" /></label>
            </Panel>
          )}
          <Panel title="Portal login" icon={UserPlus}>
            <div className="form-grid">
              <label className="field"><span>Client email</span><input className="input" name="email" type="email" required /></label>
              <label className="field"><span>Display name</span><input className="input" name="displayName" /></label>
            </div>
          </Panel>
          <Panel title="Billing" icon={Receipt}>
            <label className="field"><span>Next payment month</span><input className="input" name="nextPaymentDate" type="month" /></label>
          </Panel>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Plus size={14} /> Create client</button>
        </div>
        <div className="stack">
          <Panel title="Portal features" icon={ToggleLeft} right={`${features.size} of ${PORTAL_FEATURES.length} on`}>
            <div className="feature-grid">
              {PORTAL_FEATURES.map(([k, label]) => (
                <div key={k}>
                  {features.has(k) && <input type="hidden" name={`feature:${k}`} value="on" />}
                  <Toggle label={label} checked={features.has(k)} onChange={(on) => {
                    const n = new Set(features);
                    if (on) n.add(k);
                    else n.delete(k);
                    setFeatures(n);
                  }} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Starter tasks (automatic)" icon={ListChecks}>
            {o.starterTasks.map((t) => (
              <div key={t.title} className="row" style={rowStyle}><span style={{ flex: 1 }}>{t.title}</span><span className="muted small">due in {t.dueInDays}d</span></div>
            ))}
          </Panel>
        </div>
      </form>
    </div>
  );
}

/* ─── Owner's Cut past periods ─────────────────────────────────────────── */
const m2 = (n) => money(n, 2);

export function PeriodHistory() {
  const { periods, taxTotal } = useStore();
  const [adding, setAdding] = useState(false);
  return (
    <div className="screen">
      <Back to="/finance/personal" label="Owner's Cut" />
      <PageHead title="Past periods" sub="Historical income-split snapshots, kept for reference — the live calculator doesn't need them">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> New period</button>
      </PageHead>
      <div className="grid g-2">
        <Stat label="Set aside for tax" value={m2(taxTotal)} sub="across all periods" accent />
        <Stat label="Periods" value={periods.length} priv={false} sub="logged" accent />
      </div>
      <Panel title="Periods" icon={History} pad={false}>
        {periods.length === 0 ? <Empty title="No periods logged yet" /> : (
          <table className="table">
            <thead><tr><th>Period</th><th className="num">Gross</th><th className="num">Tax</th></tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} data-click onClick={() => go(`/finance/personal/${p.id}`)}>
                  <td className="strong">{p.label}</td>
                  <td className="num"><Priv>{money(p.gross)}</Priv></td>
                  <td className="num">{p.tax}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Modal open={adding} onClose={() => setAdding(false)} title="New period">
        <form className="stack" style={{ gap: 10 }} action={async (fd) => { await createPeriodAction(fd); setAdding(false); }}>
          <label className="field"><span>Period label</span><input className="input" name="label" placeholder="e.g. March 2026" required /></label>
          <div className="form-grid">
            <label className="field"><span>Gross income (NZD)</span><input className="input" name="grossIncomeNzd" required /></label>
            <label className="field"><span>Tax reduction %</span><input className="input" name="taxReductionPercent" placeholder="17.5" /></label>
            <label className="field"><span>Target weekly draw</span><input className="input" name="targetWeeklyDrawNzd" /></label>
          </div>
          <label className="field"><span>Notes</span><textarea className="textarea" name="notes" /></label>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Plus size={14} /> Create period</button>
        </form>
      </Modal>
    </div>
  );
}

export function PeriodDetail() {
  const { period: p } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [rate, setRate] = useState("");
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const f = p.figures;
  const calc = (r, h) => {
    if (r && h && !Number.isNaN(Number(r)) && !Number.isNaN(Number(h))) setAmount((Number(r) * Number(h)).toFixed(2));
  };
  return (
    <div className="screen">
      <Back to="/finance/personal/history" label="All periods" />
      <PageHead title={p.label} sub={p.notes || undefined}>
        {confirm ? (
          <>
            <span className="small tone-bad">Delete this period?</span>
            <button className="btn btn-sm btn-danger" onClick={() => deletePeriodAction(p.id)}>Yes, delete</button>
            <button className="btn btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirm(true)}><Trash2 size={13} /> Delete period</button>
        )}
      </PageHead>
      <div className="grid g-3">
        <Stat label="Gross income" value={m2(p.gross)} />
        <Stat label={`Going to tax · ${p.tax}%`} value={m2(f.taxAmountNzd)} sub={<><Priv>{m2(p.taxTotal)}</Priv> set aside overall</>} />
        <Stat label="Post-tax cashflow" value={m2(f.postTaxCashflowNzd)} />
        <Stat label="Monthly expenses" value={m2(f.totalExpensesNzd)} sub={<>incl. <Priv>{m2(p.businessExpenses)}</Priv> business expenses</>} />
        <Stat label="Contractor payments" value={m2(f.totalContractorPaymentsNzd)} />
        <Stat label="Take-home pay" value={m2(f.takeHomePayNzd)} tone="good" accent />
      </div>
      <Panel title="Buffer minimums" icon={Wallet} right="3× / 12× expenses">
        <KV
          rows={[
            ["3-month minimum", m2(f.threeMonthBufferMinimumNzd), null, true],
            ["12-month minimum", m2(f.twelveMonthBufferMinimumNzd), null, true],
            f.threeMonthBufferAtTargetDrawNzd != null && ["3-month at target draw", m2(f.threeMonthBufferAtTargetDrawNzd), null, true],
            f.twelveMonthBufferAtTargetDrawNzd != null && ["12-month at target draw", m2(f.twelveMonthBufferAtTargetDrawNzd), null, true],
          ]}
        />
        {p.targetDraw == null ? <p className="muted small" style={{ marginTop: 8 }}>Set a target weekly draw on a period to see the draw-based goals.</p> : (
          <p className="muted small" style={{ marginTop: 8 }}>(Monthly expenses + ${p.targetDraw}/week × 4) × months.</p>
        )}
      </Panel>
      <div className="grid g-2">
        <Panel title="Expenses" icon={Receipt} pad={false}>
          <form className="quickadd" action={addExpenseItemAction.bind(null, p.id)}>
            <input className="input" name="label" style={{ flex: 2 }} placeholder="Expense name" required />
            <input className="input" name="amountNzd" style={{ width: 120 }} placeholder="Amount" required />
            <button className="btn btn-primary"><Plus size={13} /> Add</button>
          </form>
          {p.expenses.length === 0 ? <Empty title="No expenses logged yet" /> : (
            <table className="table">
              <tbody>{p.expenses.map((e) => (
                <tr key={e.id}><td>{e.label}</td><td className="num"><Priv>{m2(e.amount)}</Priv></td><td className="num"><button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => removeExpenseItemAction(e.id, p.id)} aria-label="Remove"><Trash2 size={12} /></button></td></tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
        <Panel title="Contractor payments" icon={Users} pad={false}>
          <form className="quickadd" style={{ flexWrap: "wrap" }} action={async (fd) => { await addContractorPaymentAction(p.id, fd); setAmount(""); setRate(""); setHours(""); }}>
            <input className="input" name="payee" style={{ flex: 1, minWidth: 120 }} placeholder="Paid to" required />
            <input className="input" name="note" style={{ flex: 1, minWidth: 120 }} placeholder="Note (optional)" />
            <input className="input" style={{ width: 90 }} value={rate} onChange={(e) => { setRate(e.target.value); calc(e.target.value, hours); }} placeholder="Rate/hr" aria-label="Hourly rate" />
            <input className="input" style={{ width: 70 }} value={hours} onChange={(e) => { setHours(e.target.value); calc(rate, e.target.value); }} placeholder="Hours" aria-label="Hours" />
            <input className="input" name="amountNzd" style={{ width: 110 }} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" required />
            <button className="btn btn-primary"><Plus size={13} /> Add</button>
          </form>
          {p.payments.length === 0 ? <Empty title="None logged yet" /> : (
            <table className="table">
              <tbody>{p.payments.map((c) => (
                <tr key={c.id}><td className="strong">{c.payee}{c.note && <span className="muted"> — {c.note}</span>}</td><td className="num"><Priv>{m2(c.amount)}</Priv></td><td className="num"><button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => removeContractorPaymentAction(c.id, p.id)} aria-label="Remove"><Trash2 size={12} /></button></td></tr>
              ))}</tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
