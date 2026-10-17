import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { LAUNCH_GATES, LAUNCH_GATE_LABELS, LAUNCH_ITEM_STATUSES, LAUNCH_ITEM_STATUS_LABELS, METRICS, isMetricKey } from "@/lib/incrementum/registry";
import { formatMetric, shortDate } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";
import { PageHead, Flash, Ring, Bar, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { updateLaunchItemAction, setLaunchStatusAction, createLaunchItemAction, deleteLaunchItemAction, makeTaskFromLaunchAction } from "../actions";

const BACK = "/incrementum/launch";

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const l = s.launch;
  const lists = s.state.taskLists.filter((t) => !t.archivedAt);

  return (
    <>
      <PageHead
        eyebrow="Phase 0 exit criteria"
        title={
          <>
            Launch <em>readiness</em>
          </>
        }
        lede="Ads don't go live until every launch-critical item is done or marked N/A with a reason. Items marked ⚙ tick themselves from live data and can't be ticked by hand."
      />
      <Flash ok={ok} error={error} />

      <div className="inc-grid">
        <div className="inc-cell inc-span-4" style={{ alignItems: "center", justifyContent: "center" }}>
          <Ring pct={l.readinessPct} size={140} label="launch-critical" />
          <p className="inc-small inc-num">
            {l.criticalComplete} of {l.criticalTotal} done or N/A
          </p>
        </div>
        <div className="inc-cell inc-span-8">
          {LAUNCH_GATES.map((g) => {
            const gate = l.byGate.get(g);
            if (!gate) return null;
            return (
              <a key={g} href={`#gate-${g}`} style={{ display: "grid", gridTemplateColumns: "190px 1fr 52px", gap: "var(--gh-space-3)", alignItems: "center" }}>
                <span style={{ fontSize: "var(--gh-text-sm)" }}>
                  <strong>{g}</strong> · {LAUNCH_GATE_LABELS[g]}
                </span>
                <Bar value={gate.complete / gate.total} tone={gate.complete === gate.total ? "good" : undefined} />
                <span className="inc-small inc-num">
                  {gate.complete}/{gate.total}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {LAUNCH_GATES.map((g) => {
        const items = l.items.filter((i) => i.gate === g);
        if (!items.length) return null;
        return (
          <section key={g} id={`gate-${g}`} className="inc-panel">
            <div className="inc-cell-head">
              <h2 className="inc-cell-title">
                Gate {g} · <em>{LAUNCH_GATE_LABELS[g]}</em>
              </h2>
              {g === "P" && <span className="inc-small">Not counted in launch readiness</span>}
            </div>
            <div className="inc-list">
              {items.map((i) => {
                const done = i.effectiveStatus === "done";
                const na = i.effectiveStatus === "na";
                const unit = isMetricKey(i.metricKey) ? METRICS[i.metricKey].unit : "count";
                return (
                  <div key={i.id} className="inc-row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "var(--gh-space-3)", flex: "1 1 360px", minWidth: 0 }}>
                      <span className="inc-check" data-done={done || undefined} data-na={na || undefined} style={{ marginTop: 2 }}>
                        {done ? "✓" : na ? "–" : ""}
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <span style={{ textDecoration: na ? "line-through" : undefined, color: done ? "var(--gh-text-muted)" : undefined }}>
                          {i.auto && "⚙ "}
                          {i.title}
                          {!i.critical && <span className="inc-small"> · optional</span>}
                        </span>
                        {i.detail && <span className="inc-small">{i.detail}</span>}
                        {i.auto && (
                          <span className="inc-small inc-num">
                            Live: {formatMetric(i.metricValue, unit)} / target {formatMetric(toNum(i.metricTarget), unit)}
                          </span>
                        )}
                        {na && i.naReason && <span className="inc-small">N/A: {i.naReason}</span>}
                        {i.notes && <span className="inc-small">Notes: {i.notes}</span>}
                        {i.evidenceUrl && (
                          <a className="inc-link" href={i.evidenceUrl} target="_blank" rel="noreferrer">
                            Evidence ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="inc-inline" style={{ justifyContent: "flex-end" }}>
                      {i.dueDate && <Chip tone={!done && !na && i.dueDate < s.state.today ? "danger" : undefined}>Due {shortDate(i.dueDate)}</Chip>}
                      {i.effectiveStatus === "blocked" && <Chip tone="danger">Blocked</Chip>}
                      {i.effectiveStatus === "in_progress" && <Chip tone="warning">In progress</Chip>}
                      {i.taskId && <Chip tone="accent">Task</Chip>}
                      {!i.auto && !done && (
                        <form action={setLaunchStatusAction}>
                          <input type="hidden" name="_back" value={`${BACK}#gate-${g}`} />
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="status" value="done" />
                          <SubmitButton className="gh-btn-secondary" pendingLabel="…">Done</SubmitButton>
                        </form>
                      )}
                      <details className="inc-disclosure">
                        <summary>Edit</summary>
                        <form action={updateLaunchItemAction} className="inc-form" style={{ minWidth: 280 }}>
                          <input type="hidden" name="_back" value={`${BACK}#gate-${g}`} />
                          <input type="hidden" name="id" value={i.id} />
                          <label className="inc-field">
                            Status
                            <select className="gh-input" name="status" defaultValue={i.status}>
                              {LAUNCH_ITEM_STATUSES.filter((st) => !(i.auto && st === "done")).map((st) => (
                                <option key={st} value={st}>
                                  {LAUNCH_ITEM_STATUS_LABELS[st]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="inc-field">
                            Due
                            <input className="gh-input" type="date" name="dueDate" defaultValue={i.dueDate ?? ""} />
                          </label>
                          <label className="inc-field inc-field--wide">
                            N/A reason (required for N/A)
                            <input className="gh-input" name="naReason" defaultValue={i.naReason ?? ""} />
                          </label>
                          <label className="inc-field inc-field--wide">
                            Notes
                            <input className="gh-input" name="notes" defaultValue={i.notes ?? ""} />
                          </label>
                          <label className="inc-field inc-field--wide">
                            Evidence link
                            <input className="gh-input" name="evidenceUrl" defaultValue={i.evidenceUrl ?? ""} placeholder="https://…" />
                          </label>
                          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                        </form>
                        {!i.taskId && (
                          <form action={makeTaskFromLaunchAction} className="inc-inline" style={{ marginTop: "var(--gh-space-3)" }}>
                            <input type="hidden" name="_back" value={`${BACK}#gate-${g}`} />
                            <input type="hidden" name="id" value={i.id} />
                            <select className="gh-input" name="listId" defaultValue="" aria-label="Task list">
                              <option value="">Main list</option>
                              {lists.map((li) => (
                                <option key={li.id} value={li.id}>
                                  {li.name}
                                </option>
                              ))}
                            </select>
                            <SubmitButton className="gh-btn-secondary" pendingLabel="…">
                              Make task
                            </SubmitButton>
                          </form>
                        )}
                        <form action={deleteLaunchItemAction} style={{ marginTop: "var(--gh-space-3)" }}>
                          <input type="hidden" name="_back" value={`${BACK}#gate-${g}`} />
                          <input type="hidden" name="id" value={i.id} />
                          <button className="gh-link-btn gh-link-btn--danger" type="submit">
                            Remove item
                          </button>
                        </form>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Add an <em>item</em>
        </h2>
        <form action={createLaunchItemAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <label className="inc-field">
            Gate
            <select className="gh-input" name="gate" defaultValue="A">
              {LAUNCH_GATES.map((g) => (
                <option key={g} value={g}>
                  {g} · {LAUNCH_GATE_LABELS[g]}
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field inc-field--wide">
            Item
            <input className="gh-input" name="title" required />
          </label>
          <label className="inc-field inc-field--wide">
            Detail
            <input className="gh-input" name="detail" />
          </label>
          <label className="inc-field">
            Due
            <input className="gh-input" type="date" name="dueDate" />
          </label>
          <label className="inc-inline" style={{ fontSize: "var(--gh-text-sm)" }}>
            <input type="checkbox" name="critical" defaultChecked /> Launch-critical
          </label>
          <SubmitButton pendingLabel="Adding…">Add item</SubmitButton>
        </form>
      </section>
      <IncrementumReadySignal />
    </>
  );
}
