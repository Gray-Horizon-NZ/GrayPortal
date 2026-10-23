"use client";
// Port of the terminal concept's Pipeline (OS/grayportal-terminal-concept/
// src/screens/Pipeline.jsx). Same stage tiles, stage table, stats and deal
// pop-up. Advance / Mark lost save through the real stage change (task
// rules and activity log included); "Open full deal" goes to the deal
// record; "New deal" creates one against a company (the concept's button
// did nothing).
import { useState } from "react";
import { Workflow, ChevronRight, Phone, Mail, Building2, X, Plus } from "lucide-react";
import { useStore } from "../store";
import { STAGES, OPEN_STAGES, STAGE_PROB, TODAY, money, fmtDate, daysBetween } from "../format";
import { PageHead, Panel, Stat, Priv, Modal, KV, Badge, Empty, Seg, go } from "../ui";
import { createDealAction } from "@/app/(app)/deals/actions";

const prob = (d) => d.prob ?? STAGE_PROB[d.stage] ?? 0;

export default function Pipeline({ initialStage, view }) {
  if (view === "list") return <PipelineList />;
  return <PipelineStages initialStage={initialStage} />;
}

// Every deal in one sortable table — the real pipeline's List view (what
// /deals redirects to), in the concept's table markup.
function PipelineList() {
  const { deals } = useStore();
  const [sort, setSort] = useState("next");
  const rows = [...deals].sort((a, b) =>
    sort === "value" ? b.value - a.value : sort === "stage" ? STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) : a.next.localeCompare(b.next),
  );
  return (
    <div className="screen">
      <PageHead title="Pipeline" sub={`${deals.length} deals · every stage`}>
        <Seg small value={sort} onChange={setSort} options={[["next", "Next action"], ["value", "Value"], ["stage", "Stage"]]} />
        <button className="btn" onClick={() => go("/pipeline")}>Stage view</button>
      </PageHead>
      <Panel title="All deals" icon={Workflow} pad={false} right={`${deals.length}`}>
        <table className="table">
          <thead><tr><th>Company</th><th>Stage</th><th className="num">Value / mo</th><th>Next action</th><th>Due</th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} data-click onClick={() => go(`/deals/${d.id}`)}>
                <td className="strong">{d.company}</td>
                <td><Badge tone={d.stage === "Won" ? "good" : d.stage === "Lost" ? "bad" : undefined}>{d.stage}</Badge></td>
                <td className="num"><Priv>{d.value ? money(d.value) : "—"}</Priv></td>
                <td>{d.nextAction || "—"}</td>
                <td className={`nowrap ${OPEN_STAGES.includes(d.stage) && d.next < TODAY ? "tone-bad" : "muted"}`}>{fmtDate(d.next)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="muted">No deals yet.</td></tr>}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function PipelineStages({ initialStage }) {
  const { deals, setDeals, companies = [] } = useStore();
  const furthest = [...OPEN_STAGES].reverse().find((s) => deals.some((d) => d.stage === s)) || "Proposal out";
  const [stage, setStage] = useState(STAGES.includes(initialStage) ? initialStage : furthest);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const won = deals.filter((d) => d.stage === "Won");
  const closed = deals.filter((d) => ["Won", "Lost", "Dormant"].includes(d.stage));
  const total = open.reduce((a, d) => a + d.value, 0);
  const weighted = open.reduce((a, d) => a + d.value * prob(d), 0);
  const winRate = closed.length ? (won.length / closed.length) * 100 : 0;
  const inStage = deals.filter((d) => d.stage === stage).sort((a, b) => a.next.localeCompare(b.next));
  const tile = (s) => {
    const ds = deals.filter((d) => d.stage === s);
    return { count: ds.length, value: ds.reduce((a, d) => a + d.value, 0), weighted: ds.reduce((a, d) => a + d.value * prob(d), 0) };
  };

  const advance = (id) =>
    setDeals((ds) => ds.map((d) => {
      if (d.id !== id) return d;
      const i = STAGES.indexOf(d.stage);
      return i < 5 ? { ...d, stage: STAGES[i + 1], stageSince: TODAY, activity: [{ at: TODAY, type: "Stage", body: `Moved to ${STAGES[i + 1]}` }, ...d.activity] } : d;
    }));
  const markLost = (id, reason) =>
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage: "Lost", lostReason: reason, stageSince: TODAY, activity: [{ at: TODAY, type: "Stage", body: `Lost — ${reason}` }, ...d.activity] } : d)));

  const deal = deals.find((d) => d.id === openId);

  return (
    <div className="screen">
      <PageHead title="Pipeline" sub="Pick a stage to see its deals — open a deal for its profile">
        <button className="btn" onClick={() => go("/pipeline?view=list")}>List view</button>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={14} /> New deal</button>
      </PageHead>

      <div className="stagetiles">
        {OPEN_STAGES.map((s) => {
          const t = tile(s);
          return (
            <button key={s} className="stagetile" data-active={stage === s || undefined} onClick={() => setStage(s)}>
              <span className="name">{s}</span>
              <span className="n">{t.count}</span>
              <span className="v"><Priv>{money(t.value)}</Priv><span className="muted small"> /mo</span></span>
              <span className="w">Weighted <Priv>{money(t.weighted)}</Priv> · {Math.round(STAGE_PROB[s] * 100)}% close rate</span>
            </button>
          );
        })}
      </div>
      <div className="stagetiles closed">
        {["Won", "Lost", "Dormant"].map((s) => {
          const t = tile(s);
          return (
            <button key={s} className="stagetile" data-active={stage === s || undefined} onClick={() => setStage(s)}>
              <span className="name">{s}</span>
              <span className="w"><Priv>{money(t.value)}</Priv></span>
              <span className="n">{t.count}</span>
            </button>
          );
        })}
      </div>

      <Panel title={stage} icon={Workflow} pad={false} right={`${inStage.length} deal${inStage.length === 1 ? "" : "s"}`}>
        {inStage.length === 0 ? (
          <Empty title="No deals in this stage" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Company</th><th className="num">Value / mo</th><th>Next action</th><th className="num">In stage</th><th /></tr>
              </thead>
              <tbody>
                {inStage.map((d) => {
                  const late = OPEN_STAGES.includes(d.stage) && d.next < TODAY;
                  return (
                    <tr key={d.id} data-click onClick={() => setOpenId(d.id)}>
                      <td>
                        <b className="strong">{d.company}</b>
                        <div className="muted small"><Priv>{d.contact || "No contact"}</Priv>{d.source ? ` · ${d.source}` : ""}</div>
                      </td>
                      <td className="num"><Priv>{d.value ? money(d.value) : "TBC"}</Priv></td>
                      <td>
                        <div className={late ? "tone-bad" : ""}>{d.nextAction || d.lostReason || "—"}</div>
                        <div className={`small ${late ? "tone-bad" : "muted"}`}>{OPEN_STAGES.includes(d.stage) ? (late ? `Overdue · ${fmtDate(d.next)}` : fmtDate(d.next)) : ""}</div>
                      </td>
                      <td className="num muted">{daysBetween(d.stageSince, TODAY)}d</td>
                      <td className="num" onClick={(e) => e.stopPropagation()}>
                        {STAGES.indexOf(d.stage) < 5 && (
                          <button className="btn btn-sm btn-primary" onClick={() => advance(d.id)}>
                            Advance <ChevronRight size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid g-4">
        <Stat label="Open pipeline" value={money(total)} sub={`${open.length} deals`} accent />
        <Stat label="Weighted" value={money(weighted)} sub="value × close rate" accent />
        <Stat label="Average deal" value={money(open.length ? total / open.length : 0)} sub="per month, open deals" accent />
        <Stat label="Win rate" value={`${Math.round(winRate)}%`} priv={false} sub={`${won.length} won of ${closed.length} closed`} accent />
      </div>

      <DealModal deal={deal} onClose={() => setOpenId(null)} onAdvance={advance} onLost={markLost} />
      <NewDeal open={creating} onClose={() => setCreating(false)} companies={companies} />
    </div>
  );
}

function DealModal({ deal: d, onClose, onAdvance, onLost }) {
  const [losing, setLosing] = useState(false);
  const [reason, setReason] = useState("");
  if (!d) return null;
  const idx = STAGES.indexOf(d.stage);
  const isOpen = idx < 5;
  return (
    <Modal open={!!d} onClose={() => { setLosing(false); onClose(); }} title={d.company} wide>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <Badge tone="solid">{d.stage}</Badge>
          <span className="muted small">{[d.pkg, d.source && `from ${d.source}`, `${daysBetween(d.stageSince, TODAY)} days in stage`].filter(Boolean).join(" · ")}</span>
        </div>
        <span style={{ fontSize: 26, fontWeight: 600, color: "var(--t-accent)" }}><Priv>{d.value ? money(d.value) : "TBC"}</Priv><span className="muted small"> /mo</span></span>
      </div>

      <div className="stepper">
        {OPEN_STAGES.map((s, i) => (
          <span key={s} data-done={i < idx || d.stage === "Won" || undefined} data-current={s === d.stage || undefined}>{s}</span>
        ))}
        <span data-current={d.stage === "Won" || undefined} data-done={undefined}>Won</span>
      </div>

      <div className="grid g-2">
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}><Building2 size={10} /> Contact</p>
          <KV rows={[["Name", d.contact || "—", null, true], ["Role", d.role || "—"], ["Email", d.email || "—", null, true], ["Phone", d.phone || "—", null, true]]} />
          <div className="row" style={{ marginTop: 10 }}>
            {d.email && <a className="btn btn-sm" href={`mailto:${d.email}`}><Mail size={12} /> Email</a>}
            <button className="btn btn-sm" onClick={() => go(`/deals/${d.id}`)}><Phone size={12} /> Log call</button>
          </div>
        </div>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Next action</p>
          <KV
            rows={[
              ["Action", d.nextAction || "—"],
              ["Due", isOpen ? fmtDate(d.next) : "—", isOpen && d.next < TODAY ? "bad" : undefined],
              ["Weighted value", isOpen ? money(d.value * prob(d)) : "—", null, true],
              d.lostReason && ["Lost reason", d.lostReason, "bad"],
            ]}
          />
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Activity</p>
        {d.activity.length === 0 ? (
          <p className="muted small">No activity logged yet.</p>
        ) : (
          <div className="timeline">
            {d.activity.map((a, i) => (
              <div key={i}><time>{fmtDate(a.at)} · {a.type}</time><span>{a.body}</span></div>
            ))}
          </div>
        )}
      </div>

      <div className="row" style={{ borderTop: "1px solid var(--t-line)", paddingTop: 14 }}>
        {isOpen && losing ? (
          <>
            <input className="input" style={{ flex: 1 }} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Close reason (required)" />
            <button className="btn btn-danger" disabled={!reason.trim()} onClick={() => { onLost(d.id, reason.trim()); setLosing(false); setReason(""); }}>Confirm lost</button>
            <button className="iconbtn" onClick={() => setLosing(false)} aria-label="Cancel"><X size={14} /></button>
          </>
        ) : (
          <>
            {isOpen && <button className="btn btn-danger" onClick={() => setLosing(true)}>Mark lost</button>}
            <span className="spacer" />
            <button className="btn" onClick={() => go(`/deals/${d.id}`)}>Open full deal</button>
            {isOpen && (
              <button className="btn btn-primary" onClick={() => onAdvance(d.id)}>
                Advance to {STAGES[idx + 1]} <ChevronRight size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function NewDeal({ open, onClose, companies }) {
  const [companyId, setCompanyId] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="New deal">
      <form className="stack" style={{ gap: 10 }} action={async (fd) => { if (companyId) await createDealAction(companyId, fd); }}>
        <label className="field">
          <span>Company</span>
          <select className="select" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
            <option value="" disabled>Choose a company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <label className="field"><span>Value / mo</span><input className="input" name="valueNzd" type="number" min="0" /></label>
          <label className="field"><span>Package</span><input className="input" name="packageTier" /></label>
          <label className="field"><span>Next action</span><input className="input" name="nextAction" required /></label>
          <label className="field"><span>Next action date</span><input className="input" name="nextActionDate" type="date" defaultValue={TODAY} required /></label>
        </div>
        <label className="field"><span>Source</span><input className="input" name="source" placeholder="e.g. Referral" /></label>
        <p className="muted small">No company yet? Add it as a prospect on Clients first.</p>
        <button className="btn btn-primary" type="submit" disabled={!companyId}><Plus size={14} /> Create deal</button>
      </form>
    </Modal>
  );
}
