import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { METRICS, METRIC_KEYS, isMetricKey } from "@/lib/incrementum/registry";
import { formatMetric, formatTarget } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Panel, Badge, RowFold, AddRow, Check, Field, DueList, Console, Csec, TermStatus, LevelBars, BigAction, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog } from "@/components/incrementum/terminal/client";
import { longDate, fmtDate, relativeTo, n0 } from "@/components/incrementum/terminal/helpers";
import {
  advancePhaseAction,
  updatePhaseAction,
  createCriterionAction,
  updateCriterionAction,
  toggleCriterionAction,
  deleteCriterionAction,
  createMilestoneAction,
  toggleMilestoneAction,
  deleteMilestoneAction,
} from "../actions";

const BASE = "/incrementum/roadmap";

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const { phases, current, next } = s.phases;
  const today = s.state.today;
  const sel = sp.phase !== undefined ? Number(sp.phase) : (current?.number ?? phases[0]?.number ?? 0);
  const p = phases.find((x) => x.number === sel) ?? phases[0];
  const launch = s.state.settings.launchDate;
  if (!p) {
    return (
      <div className="screen">
        <PageHead title="Roadmap & deadlines" sub="No phases yet." />
      </div>
    );
  }
  const back = `${BASE}?phase=${p.number}`;
  const isCurrent = current?.id === p.id;
  const msDone = p.milestones.filter((m) => m.doneAt).length;
  const clients = s.metrics.active_clients ?? 0;
  const bench = s.metrics.contractors_confirmed ?? 0;
  const locked = p.status === "done";

  return (
    <div className="screen">
      <PageHead
        title="Roadmap & deadlines"
        sub={`${launch ? `Ads go live ${longDate(launch)}. ` : "Launch date not set: dates that count from ads going live show as TBD. "}A phase only unlocks when every exit criterion holds; advancing is a deliberate step with a retro.`}
      />
      <div className="hangtabs">
        {phases.map((x) => (
          <Link key={x.id} className="hangtab" data-active={x.number === p.number || undefined} data-done={x.status === "done" || undefined} href={`${BASE}?phase=${x.number}`} scroll={false}>
            Phase {x.number} · {x.name}
          </Link>
        ))}
      </div>

      <Console>
        <Csec>
          <TermStatus label={`Phase ${p.number} status`} value={p.status === "done" ? "Done" : isCurrent ? "Active" : "Upcoming"} tone={p.status === "upcoming" && !isCurrent ? "warn" : undefined}>
            {p.targetDate ? `Target ${longDate(p.targetDate)}` : p.launchOffsetDays !== null ? "Target TBD (launch date not set)" : "No target date"}
          </TermStatus>
          {p.purpose && (
            <p className="csec-desc" style={{ marginTop: 10 }}>
              {p.purpose}
            </p>
          )}
        </Csec>
        <Csec>
          <LevelBars
            rows={[
              p.criteria.length > 0 && { label: "Exit criteria met", value: p.metCount / p.criteria.length, right: `${p.metCount}/${p.criteria.length}`, tone: p.allMet ? "good" : undefined },
              p.milestones.length > 0 && { label: "Milestones done", value: msDone / p.milestones.length, right: `${msDone}/${p.milestones.length}` },
              { label: "Contractors", value: p.contractorTarget ? bench / p.contractorTarget : 0, right: `${bench}/${p.contractorTarget ?? "—"}` },
              { label: "Active clients", value: p.clientMax ? clients / p.clientMax : clients >= (p.clientMin ?? 0) ? 1 : 0, right: `${clients} · aim ${p.clientMin ?? 0}–${p.clientMax ?? "+"}` },
            ]}
          />
        </Csec>
        <div className="console-split">
          <Csec className="flush">
            <div className="agency-list-head">Exit criteria</div>
            <div className="rowlist">
              {p.criteria.map((c) => {
                const unit = isMetricKey(c.metricKey) ? METRICS[c.metricKey].unit : null;
                return (
                  <RowFold
                    key={c.id}
                    summary={
                      <>
                        <span className="rowfold-main">
                          <Check done={c.met} disabled={!!c.metricKey || locked} action={toggleCriterionAction} hidden={{ _back: back, id: c.id, done: c.met ? "" : "on" }} label={c.met ? "Untick" : "Tick"} />
                          <span>{c.label}</span>
                        </span>
                        <span className="muted small num">
                          {unit ? (
                            <>
                              <b className="strong">{formatMetric(c.value, unit)}</b> {formatTarget(c.comparator, n0(c.target), unit)}
                            </>
                          ) : (
                            "by hand"
                          )}
                        </span>
                      </>
                    }
                  >
                    {locked ? (
                      <p className="muted small">This phase is done; its criteria are locked.</p>
                    ) : (
                      <>
                        <form className="form-grid g3" action={updateCriterionAction}>
                          <BackTo path={back} />
                          <HiddenFields values={{ id: c.id }} />
                          <Field label="Label" wide>
                            <input className="input" name="label" defaultValue={c.label} />
                          </Field>
                          {c.metricKey && (
                            <Field label="Target">
                              <input className="input" name="target" defaultValue={c.target ?? ""} />
                            </Field>
                          )}
                          <div className="form-actions">
                            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                              Save
                            </SubmitButton>
                          </div>
                        </form>
                        <form action={deleteCriterionAction} className="row">
                          <BackTo path={back} />
                          <HiddenFields values={{ id: c.id }} />
                          <span className="spacer" />
                          <button type="submit" className="linkbtn danger">
                            Remove
                          </button>
                        </form>
                      </>
                    )}
                  </RowFold>
                );
              })}
              {p.criteria.length === 0 && (
                <p className="muted small" style={{ padding: "14px 16px" }}>
                  No exit criteria: this is the open-ended phase.
                </p>
              )}
              {!locked && (
                <AddRow label="Add criterion">
                  <form className="form-grid g3" action={createCriterionAction}>
                    <BackTo path={back} />
                    <HiddenFields values={{ phaseId: p.id }} />
                    <Field label="New criterion" wide>
                      <input className="input" name="label" required placeholder="e.g. ≥ 2 paying clients" />
                    </Field>
                    <Field label="Tracked metric">
                      <select className="select" name="metricKey" defaultValue="">
                        <option value="">Manual (tick by hand)</option>
                        {METRIC_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {METRICS[k].label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Comparator">
                      <select className="select" name="comparator" defaultValue="gte">
                        <option value="gte">at least (≥)</option>
                        <option value="lte">at most (≤)</option>
                      </select>
                    </Field>
                    <Field label="Target">
                      <input className="input" name="target" />
                    </Field>
                    <div className="form-actions">
                      <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                        Add criterion
                      </SubmitButton>
                    </div>
                  </form>
                </AddRow>
              )}
            </div>
          </Csec>
          <Csec>
            <p className="csec-title" style={{ marginBottom: 8 }}>
              Milestones
            </p>
            <div className="checklist">
              {p.milestones.map((ms) => (
                <div key={ms.id}>
                  <Check done={!!ms.doneAt} action={toggleMilestoneAction} hidden={{ _back: back, id: ms.id, done: ms.doneAt ? "" : "on" }} label="Toggle milestone" />
                  <span style={{ flex: 1, textDecoration: ms.doneAt ? "line-through" : undefined, color: ms.doneAt ? "var(--t-muted)" : undefined }}>{ms.title}</span>
                  {ms.dueDate ? (
                    <Badge tone={!ms.doneAt && ms.dueDate < today ? "bad" : undefined}>{fmtDate(ms.dueDate)}</Badge>
                  ) : ms.launchOffsetDays !== null ? (
                    <Badge>{ms.launchOffsetDays === 0 ? "Launch day" : `Launch + ${ms.launchOffsetDays}d`}</Badge>
                  ) : null}
                  <form action={deleteMilestoneAction} style={{ display: "contents" }}>
                    <BackTo path={back} />
                    <HiddenFields values={{ id: ms.id }} />
                    <button type="submit" className="linkbtn muted" aria-label="Remove milestone">
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <form className="row" style={{ marginTop: 10 }} action={createMilestoneAction}>
              <BackTo path={back} />
              <HiddenFields values={{ phaseId: p.id }} />
              <input className="input" name="title" placeholder="Add a milestone" required style={{ flex: 1, width: "auto" }} />
              <input className="input" type="date" name="dueDate" aria-label="Due date" style={{ width: 150 }} />
              <SubmitButton className="btn" pendingLabel="…">
                Add
              </SubmitButton>
            </form>
            <p className="csec-title" style={{ margin: "22px 0 8px" }}>
              Phase facts
            </p>
            <Ledger
              rows={[
                ["Ad budget", p.adBudget ?? "—"],
                ["Services", p.services ?? "—"],
                ["Clients", `${p.clientMin ?? 0}–${p.clientMax ?? "+"}`],
                ["Contractors", p.contractorTarget ?? "—"],
              ]}
            />
            {!locked && (
              <details className="inline-details">
                <summary>Edit phase</summary>
                <form className="form-grid" action={updatePhaseAction}>
                  <BackTo path={back} />
                  <HiddenFields values={{ id: p.id }} />
                  <Field label="Name">
                    <input className="input" name="name" defaultValue={p.name} />
                  </Field>
                  <Field label="Ad budget">
                    <input className="input" name="adBudget" defaultValue={p.adBudget ?? ""} />
                  </Field>
                  <Field label="Services">
                    <input className="input" name="services" defaultValue={p.services ?? ""} />
                  </Field>
                  <Field label="Contractors">
                    <input className="input" name="contractorTarget" defaultValue={p.contractorTarget ?? ""} />
                  </Field>
                  <Field label="Clients from">
                    <input className="input" name="clientMin" defaultValue={p.clientMin ?? ""} />
                  </Field>
                  <Field label="Clients to">
                    <input className="input" name="clientMax" defaultValue={p.clientMax ?? ""} />
                  </Field>
                  <Field label="Target date" wide>
                    <input className="input" type="date" name="targetDate" defaultValue={p.launchOffsetDays === null ? (p.targetDate ?? "") : ""} />
                  </Field>
                  <Field label="Purpose" wide>
                    <input className="input" name="purpose" defaultValue={p.purpose ?? ""} />
                  </Field>
                  <div className="form-actions">
                    <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                      Save phase
                    </SubmitButton>
                  </div>
                </form>
              </details>
            )}
            {p.retro && (
              <p className="note" style={{ marginTop: 16 }}>
                <span>
                  <b>Retro:</b> {p.retro}
                </span>
              </p>
            )}
          </Csec>
        </div>
        {isCurrent && next && (
          <BigAction
            label={`Advance to Phase ${next.number} · ${next.name}`}
            sub={p.allMet ? "Every exit criterion is met. A retro is required." : `${p.criteria.length - p.metCount} criteria still to meet`}
            value={p.allMet ? "Advance" : `${p.metCount}/${p.criteria.length}`}
            disabled={!p.allMet}
            dialog="phase-advance"
          />
        )}
      </Console>

      <Panel title="Every deadline · next 14 days" icon={CalendarClock}>
        <DueList
          items={s.deadlines.map((d) => ({ key: d.key, title: d.title, detail: `${d.kind} · ${d.overdue ? "overdue" : relativeTo(d.date, today)}`, tone: d.overdue ? "bad" : undefined, href: d.href }))}
          empty="Nothing due."
        />
      </Panel>

      {isCurrent && next && p.allMet && (
        <Dialog id="phase-advance" title={`Advance to Phase ${next.number} · ${next.name}`}>
          <form className="form-grid" action={advancePhaseAction}>
            <BackTo path={`${BASE}?phase=${next.number}`} />
            <HiddenFields values={{ phaseId: p.id }} />
            <Field label="Retro: what worked, what didn't, what changes in the next phase" wide>
              <textarea className="textarea" name="retro" required rows={5} />
            </Field>
            <div className="form-actions">
              <SubmitButton className="btn btn-primary" pendingLabel="Advancing…">
                Advance
              </SubmitButton>
            </div>
          </form>
        </Dialog>
      )}
      <IncrementumReadySignal />
    </div>
  );
}
