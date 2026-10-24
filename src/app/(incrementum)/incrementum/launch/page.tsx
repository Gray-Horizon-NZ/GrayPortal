import { ListChecks } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { LAUNCH_GATES, LAUNCH_GATE_LABELS, LAUNCH_ITEM_STATUSES, LAUNCH_ITEM_STATUS_LABELS, METRICS, isMetricKey, type LaunchGate } from "@/lib/incrementum/registry";
import { formatMetric } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, RowFold, AddRow, Check, Field, DueList, Console, Csec, TermStatus, Ring, RingTile, BigAction, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { fmtDate, num } from "@/components/incrementum/terminal/helpers";
import { updateLaunchItemAction, setLaunchStatusAction, createLaunchItemAction, deleteLaunchItemAction, makeTaskFromLaunchAction, setLaunchDateAction } from "../actions";

const BASE = "/incrementum/launch";

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ gate?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const l = s.launch;
  const gateOf = (g: string) => l.byGate.get(g) ?? { total: 0, complete: 0 };
  const firstOpen = LAUNCH_GATES.find((g) => g !== "P" && gateOf(g).complete < gateOf(g).total) ?? "A";
  const gate = (LAUNCH_GATES as readonly string[]).includes(sp.gate ?? "") ? (sp.gate as LaunchGate) : firstOpen;
  const back = `${BASE}?gate=${gate}`;
  const items = l.items.filter((i) => i.gate === gate);
  const lists = s.state.taskLists.filter((t) => !t.archivedAt);
  const ready = l.criticalTotal > 0 && l.criticalComplete === l.criticalTotal;
  const blockedIn = (g: string) => l.items.filter((i) => i.gate === g && i.effectiveStatus === "blocked").length;
  const blocked = l.items.filter((i) => i.critical && i.gate !== "P" && i.effectiveStatus === "blocked").length;

  return (
    <div className="screen">
      <PageHead title="Launch readiness" sub="Ads don't go live until every launch-critical item is done or marked N/A with a reason. Items marked ⚙ tick themselves from live data. The current gate's items are tasks in GrayPortal's Project Incrementum column; ticking either side ticks both." />

      <Console>
        <Csec>
          <div className="launch-top">
            <Ring value={l.criticalComplete} max={l.criticalTotal} size={220} label="Launch ready" center={`${Math.round(l.readinessPct)}%`} sub={`${l.criticalComplete} of ${l.criticalTotal} items`} />
            <div className="stack" style={{ gap: 16, flex: 1, minWidth: 260 }}>
              <TermStatus label="Launch status" value={ready ? "Ready" : "Not ready"} tone={ready ? undefined : "warn"}>
                Gates A–I · {blocked} blocked
              </TermStatus>
              <DueList
                items={l.nextBlockers.map((i) => ({
                  key: i.id,
                  title: i.title,
                  detail: `Gate ${i.gate}${i.effectiveStatus === "blocked" ? " · blocked" : i.effectiveStatus === "in_progress" ? " · in progress" : ""}`,
                  tone: i.effectiveStatus === "blocked" ? "bad" : i.effectiveStatus === "in_progress" ? "warn" : undefined,
                  href: `${BASE}?gate=${i.gate}`,
                }))}
                empty="Nothing launch-critical left."
              />
            </div>
          </div>
        </Csec>
        <Csec>
          <div className="ringgrid" style={{ "--cols": 5 } as React.CSSProperties}>
            {LAUNCH_GATES.map((g) => {
              const x = gateOf(g);
              const done = x.total > 0 && x.complete === x.total;
              const b = blockedIn(g);
              return (
                <RingTile
                  key={g}
                  name={`${g} · ${LAUNCH_GATE_LABELS[g]}`}
                  active={gate === g}
                  done={done}
                  href={`${BASE}?gate=${g}`}
                  foot={b ? <span className="tone-bad">{b} blocked</span> : g === "P" ? "Not counted" : done ? "Complete" : `${x.total - x.complete} to go`}
                >
                  <Ring value={x.complete} max={x.total} size={118} />
                </RingTile>
              );
            })}
          </div>
        </Csec>
        <Csec className="flush">
          <div className="agency-list-head">
            <ListChecks size={14} /> Gate {gate} · {LAUNCH_GATE_LABELS[gate]}
            <span className="r">{gate === "P" ? "Not counted in launch readiness" : `${gateOf(gate).complete} of ${gateOf(gate).total} complete`}</span>
          </div>
          <div className="rowlist g-launch">
            {items.map((i) => {
              const done = i.effectiveStatus === "done";
              const na = i.effectiveStatus === "na";
              const unit = isMetricKey(i.metricKey) ? METRICS[i.metricKey].unit : "count";
              return (
                <RowFold
                  key={i.id}
                  summary={
                    <>
                      <span className="rowfold-main">
                        <Check done={done} na={na} disabled={i.auto} action={setLaunchStatusAction} hidden={{ _back: back, id: i.id, status: done ? "not_started" : "done" }} label={done ? "Reopen" : "Mark done"} />
                        <span data-done-text={done || undefined} data-na-text={na || undefined}>
                          {i.auto && "⚙ "}
                          {i.title}
                          {!i.critical && <span className="muted"> · optional</span>}
                          {(i.detail || i.auto) && <small>{i.auto ? `Live: ${formatMetric(i.metricValue, unit)} / target ${formatMetric(num(i.metricTarget), unit)}` : i.detail}</small>}
                        </span>
                      </span>
                      <span className="chiprow">
                        {i.dueDate && <Badge tone={!done && !na && i.dueDate < s.state.today ? "bad" : undefined}>Due {fmtDate(i.dueDate)}</Badge>}
                        {i.effectiveStatus === "blocked" && <Badge tone="bad">Blocked</Badge>}
                        {i.effectiveStatus === "in_progress" && <Badge tone="warn">In progress</Badge>}
                        {i.taskId && <Badge tone="accent">Task</Badge>}
                      </span>
                    </>
                  }
                >
                  {i.detail && i.auto && <p className="muted small">{i.detail}</p>}
                  {na && i.naReason && <p className="muted small">N/A: {i.naReason}</p>}
                  {i.evidenceUrl && (
                    <a className="linkbtn" href={i.evidenceUrl} target="_blank" rel="noreferrer">
                      Evidence ↗
                    </a>
                  )}
                  <form className="form-grid g3" action={updateLaunchItemAction}>
                    <BackTo path={back} />
                    <HiddenFields values={{ id: i.id }} />
                    <Field label="Status">
                      <select className="select" name="status" defaultValue={i.status}>
                        {LAUNCH_ITEM_STATUSES.filter((k) => !(i.auto && k === "done")).map((k) => (
                          <option key={k} value={k}>
                            {LAUNCH_ITEM_STATUS_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Due">
                      <input className="input" type="date" name="dueDate" defaultValue={i.dueDate ?? ""} />
                    </Field>
                    <Field label="N/A reason (required for N/A)">
                      <input className="input" name="naReason" defaultValue={i.naReason ?? ""} />
                    </Field>
                    <Field label="Notes" wide>
                      <input className="input" name="notes" defaultValue={i.notes ?? ""} />
                    </Field>
                    <Field label="Evidence link" wide>
                      <input className="input" name="evidenceUrl" defaultValue={i.evidenceUrl ?? ""} placeholder="https://…" />
                    </Field>
                    <div className="form-actions">
                      <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                        Save
                      </SubmitButton>
                    </div>
                  </form>
                  <div className="form-actions">
                    {!i.taskId && (
                      <form className="row" action={makeTaskFromLaunchAction}>
                        <BackTo path={back} />
                        <HiddenFields values={{ id: i.id }} />
                        <select className="select" name="listId" defaultValue="" style={{ width: 180 }} aria-label="Task list">
                          <option value="">Main list</option>
                          {lists.map((li) => (
                            <option key={li.id} value={li.id}>
                              {li.name}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="btn" pendingLabel="…">
                          Make task
                        </SubmitButton>
                      </form>
                    )}
                    <span className="spacer" />
                    <form action={deleteLaunchItemAction}>
                      <BackTo path={back} />
                      <HiddenFields values={{ id: i.id }} />
                      <button type="submit" className="linkbtn danger">
                        Remove item
                      </button>
                    </form>
                  </div>
                </RowFold>
              );
            })}
            <AddRow label="Add an item">
              <form className="form-grid g3" action={createLaunchItemAction}>
                <BackTo path={back} />
                <Field label="Gate">
                  <select className="select" name="gate" defaultValue={gate}>
                    {LAUNCH_GATES.map((g) => (
                      <option key={g} value={g}>
                        {g} · {LAUNCH_GATE_LABELS[g]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Item">
                  <input className="input" name="title" required />
                </Field>
                <Field label="Due">
                  <input className="input" type="date" name="dueDate" />
                </Field>
                <Field label="Detail" wide>
                  <input className="input" name="detail" />
                </Field>
                <label className="inline-check">
                  <input type="checkbox" name="critical" defaultChecked /> Launch-critical
                </label>
                <div className="form-actions">
                  <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                    Add item
                  </SubmitButton>
                </div>
              </form>
            </AddRow>
          </div>
        </Csec>
        <BigAction
          label="Ads go live"
          sub={ready ? "Every launch-critical item is done. Sets the launch date to today and switches Home to live." : "Unlocks when every launch-critical item is done or N/A"}
          value={ready ? "Go live" : `${l.criticalTotal - l.criticalComplete} to go`}
          disabled={!ready}
          action={setLaunchDateAction}
          hidden={{ _back: "/incrementum", launchDate: s.state.today }}
        />
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}
