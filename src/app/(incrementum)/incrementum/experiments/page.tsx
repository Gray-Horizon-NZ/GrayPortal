import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { EXPERIMENT_TYPES, EXPERIMENT_TYPE_LABELS, METRICS, METRIC_KEYS, isMetricKey } from "@/lib/incrementum/registry";
import { formatMetric, shortDate, todayNz } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { createExperimentAction, recordExperimentResultAction, deleteExperimentAction } from "../actions";

const BACK = "/incrementum/experiments";

export default async function ExperimentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; type?: string }> }) {
  const { ok, error, type } = await searchParams;
  const s = await getIncrementumSnapshot();
  const rows = s.state.experiments.filter((e) => !type || e.type === type);

  return (
    <>
      <PageHead
        eyebrow="Learn"
        title={<>Experiments</>}
        lede="At $400/month there's too little data for charts to say much on their own. You learn from deliberate, logged changes: what changed, why, what you expect, and the result. Tests carry pass/kill lines written in advance."
        actions={
          <>
            <a className={!type ? "gh-btn-primary" : "gh-btn-secondary"} href={BACK}>
              All
            </a>
            {EXPERIMENT_TYPES.map((t) => (
              <a key={t} className={type === t ? "gh-btn-primary" : "gh-btn-secondary"} href={`${BACK}?type=${t}`}>
                {EXPERIMENT_TYPE_LABELS[t]}
              </a>
            ))}
          </>
        }
      />
      <Flash ok={ok} error={error} />

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Log a <em>change or test</em>
        </h2>
        <form action={createExperimentAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <label className="inc-field">
            Type
            <select className="gh-input" name="type" defaultValue="change">
              {EXPERIMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXPERIMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field inc-field--wide">
            What
            <input className="gh-input" name="title" required placeholder="e.g. Added 'from $1,426/month' to headline 2" />
          </label>
          <label className="inc-field inc-field--wide">
            Why / expected effect
            <textarea className="gh-input" name="body" />
          </label>
          <label className="inc-field">
            Metric to watch
            <select className="gh-input" name="metricKey" defaultValue="">
              <option value="">—</option>
              {METRIC_KEYS.map((k) => (
                <option key={k} value={k}>
                  {METRICS[k].label}
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field">
            Pass line
            <input className="gh-input" name="passLine" />
          </label>
          <label className="inc-field">
            Kill line
            <input className="gh-input" name="killLine" />
          </label>
          <label className="inc-field">
            Started
            <input className="gh-input" type="date" name="startedAt" defaultValue={todayNz()} />
          </label>
          <label className="inc-field">
            Check on
            <input className="gh-input" type="date" name="endsAt" />
          </label>
          <SubmitButton pendingLabel="Logging…">Log it</SubmitButton>
        </form>
      </section>

      <section className="inc-panel">
        {rows.length === 0 ? (
          <p className="inc-muted">Nothing logged yet.</p>
        ) : (
          <div className="inc-timeline">
            {rows.map((e) => {
              const due = e.type === "test" && !e.verdict && e.endsAt && e.endsAt <= s.state.today;
              return (
                <div className="inc-event" key={e.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <p className="inc-event-meta">
                    {EXPERIMENT_TYPE_LABELS[e.type as keyof typeof EXPERIMENT_TYPE_LABELS] ?? e.type} · {shortDate(e.startedAt ?? e.createdAt, true)}
                    {e.endsAt ? ` → check ${shortDate(e.endsAt)}` : ""}
                  </p>
                  <div className="inc-inline">
                    <strong style={{ fontWeight: 500 }}>{e.title}</strong>
                    {e.verdict && <Chip tone={e.verdict === "pass" ? "good" : e.verdict === "fail" ? "danger" : undefined}>{e.verdict}</Chip>}
                    {due && <Chip tone="warning">Verdict due</Chip>}
                  </div>
                  {e.body && <p className="inc-muted" style={{ whiteSpace: "pre-wrap" }}>{e.body}</p>}
                  {(e.passLine || e.killLine) && (
                    <p className="inc-small">
                      {e.passLine ? `Pass: ${e.passLine}` : ""}
                      {e.passLine && e.killLine ? " · " : ""}
                      {e.killLine ? `Kill: ${e.killLine}` : ""}
                    </p>
                  )}
                  {isMetricKey(e.metricKey) && (
                    <p className="inc-small">
                      {METRICS[e.metricKey].label} now: <strong className="inc-num">{formatMetric(s.metrics[e.metricKey], METRICS[e.metricKey].unit)}</strong>
                    </p>
                  )}
                  {e.result && <p>Result: {e.result}</p>}
                  {e.type !== "retro" && (
                    <details className="inc-disclosure">
                      <summary>{e.verdict ? "Edit result" : "Record result"}</summary>
                      <form action={recordExperimentResultAction} className="inc-form">
                        <input type="hidden" name="_back" value={BACK} />
                        <input type="hidden" name="id" value={e.id} />
                        <label className="inc-field inc-field--wide">
                          Result
                          <textarea className="gh-input" name="result" defaultValue={e.result ?? ""} />
                        </label>
                        <label className="inc-field">
                          Verdict
                          <select className="gh-input" name="verdict" defaultValue={e.verdict ?? ""}>
                            <option value="">—</option>
                            <option value="pass">Pass</option>
                            <option value="fail">Fail</option>
                            <option value="inconclusive">Inconclusive</option>
                          </select>
                        </label>
                        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                      </form>
                      <form action={deleteExperimentAction} style={{ marginTop: "var(--gh-space-2)" }}>
                        <input type="hidden" name="_back" value={BACK} />
                        <input type="hidden" name="id" value={e.id} />
                        <button className="gh-link-btn gh-link-btn--danger" type="submit">
                          Delete
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <IncrementumReadySignal />
    </>
  );
}
