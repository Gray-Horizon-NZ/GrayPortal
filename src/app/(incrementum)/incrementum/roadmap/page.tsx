import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { METRICS, METRIC_KEYS } from "@/lib/incrementum/registry";
import { shortDate, formatTarget } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";
import { PageHead, Flash, Bar, Chip, PhaseSteps, MetricValue } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
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

const BACK = "/incrementum/roadmap";

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const { phases, current, next } = s.phases;

  return (
    <>
      <PageHead
        eyebrow="Growth phases"
        title={
          <>
            Roadmap &amp; <em>deadlines</em>
          </>
        }
        lede={`${s.state.settings.launchDate ? `Ads go live ${shortDate(s.state.settings.launchDate, true)}. ` : "Launch date not set yet: dates that count from ads going live show as TBD (set it in Settings). "}Each phase has exit criteria. The next phase only unlocks when every one holds, and advancing is a deliberate step with a retro. Edits to targets are logged, so the bar can't be quietly lowered.`}
      />
      <Flash ok={ok} error={error} />
      <PhaseSteps phases={phases} />

      {phases.map((p) => {
        const isCurrent = current?.id === p.id;
        return (
          <section key={p.id} className="inc-panel" id={`phase-${p.number}`} style={isCurrent ? { borderColor: "var(--gh-accent)" } : undefined}>
            <div className="inc-cell-head">
              <div>
                <p className="gh-eyebrow">
                  Phase {p.number} {p.status === "done" ? "· done" : isCurrent ? "· active" : "· upcoming"}
                </p>
                <h2 className="inc-cell-title" style={{ fontSize: "var(--gh-text-xl)" }}>
                  <em>{p.name}</em>
                </h2>
                <p className="inc-muted">{p.purpose}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="inc-small">
                  Ads {p.adBudget ?? "—"} · {p.services ?? "—"} service(s)
                </p>
                <p className="inc-small inc-num">
                  Clients {p.clientMin ?? 0}–{p.clientMax ?? "+"} · Contractors {p.contractorTarget ?? "—"}
                </p>
                <p className="inc-small">
                  Target {p.targetDate ? shortDate(p.targetDate, true) : p.launchOffsetDays !== null ? "TBD (launch date not set)" : "—"}
                  {p.launchOffsetDays !== null && p.targetDate ? ` · launch + ${p.launchOffsetDays}d` : ""}
                </p>
                {p.targetDate && p.status !== "done" && p.targetDate < s.state.today && <Chip tone="danger">Past target date</Chip>}
              </div>
            </div>

            {p.criteria.length > 0 && (
              <>
                <Bar value={p.criteria.length ? p.metCount / p.criteria.length : 0} tone={p.allMet ? "good" : undefined} />
                <div className="inc-list">
                  {p.criteria.map((c) => (
                    <div className="inc-row" key={c.id} style={{ flexWrap: "wrap" }}>
                      <div className="inc-row-main" style={{ flex: "1 1 300px" }}>
                        {c.metricKey ? (
                          <span className="inc-check" data-done={c.met || undefined}>{c.met ? "✓" : ""}</span>
                        ) : (
                          <form action={toggleCriterionAction}>
                            <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="done" value={c.met ? "" : "on"} />
                            <button className="inc-check" data-done={c.met || undefined} type="submit" aria-label={c.met ? "Untick" : "Tick"}>
                              {c.met ? "✓" : ""}
                            </button>
                          </form>
                        )}
                        <span>{c.label}</span>
                      </div>
                      <div className="inc-inline">
                        <MetricValue metricKey={c.metricKey} value={c.value} />
                        {c.metricKey && METRICS[c.metricKey as keyof typeof METRICS] && (
                          <span className="inc-small">{formatTarget(c.comparator, toNum(c.target), METRICS[c.metricKey as keyof typeof METRICS].unit)}</span>
                        )}
                        {p.status !== "done" && (
                          <details className="inc-disclosure">
                            <summary>Edit</summary>
                            <form action={updateCriterionAction} className="inc-inline">
                              <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                              <input type="hidden" name="id" value={c.id} />
                              <input className="gh-input" name="label" defaultValue={c.label} aria-label="Label" />
                              {c.metricKey && <input className="gh-input" name="target" defaultValue={c.target ?? ""} aria-label="Target" style={{ width: 90 }} />}
                              <SubmitButton pendingLabel="…">Save</SubmitButton>
                            </form>
                            <form action={deleteCriterionAction}>
                              <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                              <input type="hidden" name="id" value={c.id} />
                              <button className="gh-link-btn gh-link-btn--danger" type="submit">
                                Remove
                              </button>
                            </form>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div>
              <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>
                Milestones
              </p>
              <div className="inc-list">
                {p.milestones.map((m) => (
                  <div className="inc-row" key={m.id}>
                    <form action={toggleMilestoneAction} className="inc-row-main">
                      <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="done" value={m.doneAt ? "" : "on"} />
                      <button className="inc-check" data-done={m.doneAt ? true : undefined} type="submit" aria-label="Toggle milestone">
                        {m.doneAt ? "✓" : ""}
                      </button>
                      <span style={{ textDecoration: m.doneAt ? "line-through" : undefined }}>{m.title}</span>
                    </form>
                    <div className="inc-inline">
                      {m.dueDate && <Chip tone={!m.doneAt && m.dueDate < s.state.today ? "danger" : undefined}>{shortDate(m.dueDate, true)}</Chip>}
                      {!m.dueDate && m.launchOffsetDays !== null && <Chip>{m.launchOffsetDays === 0 ? "On launch day" : `Launch + ${m.launchOffsetDays}d`} · TBD</Chip>}
                      <form action={deleteMilestoneAction}>
                        <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                        <input type="hidden" name="id" value={m.id} />
                        <button className="gh-link-btn" type="submit" aria-label="Remove milestone">
                          ×
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
              <form action={createMilestoneAction} className="inc-inline" style={{ marginTop: "var(--gh-space-2)" }}>
                <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                <input type="hidden" name="phaseId" value={p.id} />
                <input className="gh-input" name="title" placeholder="Add a milestone" required style={{ flex: 1 }} />
                <input className="gh-input" type="date" name="dueDate" aria-label="Due date" />
                <SubmitButton className="gh-btn-secondary" pendingLabel="…">Add</SubmitButton>
              </form>
            </div>

            {isCurrent && next && (
              <div className="inc-callout" data-tone={p.allMet ? undefined : undefined}>
                {p.allMet ? (
                  <form action={advancePhaseAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
                    <input type="hidden" name="_back" value={BACK} />
                    <input type="hidden" name="phaseId" value={p.id} />
                    <strong>
                      Every exit criterion is met. Advance to Phase {next.number} · {next.name}?
                    </strong>
                    <textarea className="gh-input" name="retro" required placeholder="Retro: what worked, what didn't, what changes in the next phase" />
                    <SubmitButton pendingLabel="Advancing…">Advance to Phase {next.number}</SubmitButton>
                  </form>
                ) : (
                  <span>
                    {p.criteria.length - p.metCount} criteria still to meet before Phase {next.number} · {next.name} unlocks.
                  </span>
                )}
              </div>
            )}

            {p.retro && (
              <p className="inc-small">
                <strong>Retro:</strong> {p.retro}
              </p>
            )}

            {p.status !== "done" && (
              <details className="inc-disclosure">
                <summary>Edit phase · add criterion</summary>
                <form action={updatePhaseAction} className="inc-form">
                  <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                  <input type="hidden" name="id" value={p.id} />
                  <label className="inc-field">
                    Name
                    <input className="gh-input" name="name" defaultValue={p.name} />
                  </label>
                  <label className="inc-field">
                    Ad budget
                    <input className="gh-input" name="adBudget" defaultValue={p.adBudget ?? ""} />
                  </label>
                  <label className="inc-field">
                    Services
                    <input className="gh-input" name="services" defaultValue={p.services ?? ""} />
                  </label>
                  <label className="inc-field">
                    Clients from
                    <input className="gh-input" name="clientMin" type="number" defaultValue={p.clientMin ?? ""} />
                  </label>
                  <label className="inc-field">
                    Clients to
                    <input className="gh-input" name="clientMax" type="number" defaultValue={p.clientMax ?? ""} />
                  </label>
                  <label className="inc-field">
                    Contractors
                    <input className="gh-input" name="contractorTarget" type="number" defaultValue={p.contractorTarget ?? ""} />
                  </label>
                  <label className="inc-field">
                    Target date
                    <input className="gh-input" name="targetDate" type="date" defaultValue={p.targetDate ?? ""} />
                  </label>
                  <label className="inc-field inc-field--wide">
                    Purpose
                    <input className="gh-input" name="purpose" defaultValue={p.purpose ?? ""} />
                  </label>
                  <SubmitButton pendingLabel="Saving…">Save phase</SubmitButton>
                </form>
                <form action={createCriterionAction} className="inc-form" style={{ marginTop: "var(--gh-space-4)" }}>
                  <input type="hidden" name="_back" value={`${BACK}#phase-${p.number}`} />
                  <input type="hidden" name="phaseId" value={p.id} />
                  <label className="inc-field inc-field--wide">
                    New criterion
                    <input className="gh-input" name="label" required placeholder="e.g. ≥ 2 paying clients" />
                  </label>
                  <label className="inc-field">
                    Tracked metric
                    <select className="gh-input" name="metricKey" defaultValue="">
                      <option value="">Manual (tick by hand)</option>
                      {METRIC_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {METRICS[k].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inc-field">
                    Comparator
                    <select className="gh-input" name="comparator" defaultValue="gte">
                      <option value="gte">at least (≥)</option>
                      <option value="lte">at most (≤)</option>
                    </select>
                  </label>
                  <label className="inc-field">
                    Target
                    <input className="gh-input" name="target" />
                  </label>
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">Add criterion</SubmitButton>
                </form>
              </details>
            )}
          </section>
        );
      })}

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Every <em>deadline</em> (next 14 days)
        </h2>
        {s.deadlines.length === 0 ? (
          <p className="inc-muted">Nothing due.</p>
        ) : (
          <div className="inc-list">
            {s.deadlines.map((d) => (
              <a className="inc-row" key={d.key} href={d.href}>
                <span>{d.title}</span>
                <span className="inc-inline">
                  <Chip>{d.kind}</Chip>
                  <Chip tone={d.overdue ? "danger" : undefined}>{shortDate(d.date)}</Chip>
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
      <IncrementumReadySignal />
    </>
  );
}
