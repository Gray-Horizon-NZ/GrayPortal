import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { mondayOf } from "@/lib/incrementum/evaluate";
import { METRICS } from "@/lib/incrementum/registry";
import { formatMetric, shortDate } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip, Dot, goalTone, GOAL_STATUS_LABELS } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { completeReviewAction } from "../actions";

const BACK = "/incrementum/review";
const KEY_METRICS = ["monthly_profit", "active_clients", "leads_this_month", "leads_unanswered", "contractors_confirmed", "launch_readiness_pct", "max_hours_per_client"] as const;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const monday = mondayOf(new Date(`${s.state.today}T12:00:00Z`));
  const thisWeek = s.state.reviews.find((r) => r.weekOf === monday);
  const past = s.state.reviews.filter((r) => r.weekOf !== monday && r.completedAt).slice(0, 8);
  const offPace = s.goals.filter((g) => g.status === "at_risk" || g.status === "missed");
  const pendingTests = s.state.experiments.filter((e) => e.type === "test" && !e.verdict && e.endsAt && e.endsAt <= s.state.today);

  return (
    <>
      <PageHead
        eyebrow={`Week of ${shortDate(monday, true)}`}
        title={
          <>
            Weekly <em>review</em>
          </>
        }
        lede="Monday ritual: look at the numbers, own what's off pace, commit to three actions. The actions land on the Incrementum main list (and the Master Task View), due Friday."
        actions={<Chip tone={thisWeek?.completedAt ? "good" : "warning"}>{thisWeek?.completedAt ? "Done this week" : "Due"}</Chip>}
      />
      <Flash ok={ok} error={error} />

      <div className="inc-stats">
        {KEY_METRICS.map((k) => (
          <div className="inc-stat" key={k}>
            <span className="inc-small">{METRICS[k].label}</span>
            <span className="inc-stat-value">{formatMetric(s.metrics[k], METRICS[k].unit)}</span>
          </div>
        ))}
      </div>

      <div className="inc-two">
        <section className="inc-panel">
          <h2 className="inc-cell-title">
            What needs <em>owning</em>
          </h2>
          <div className="inc-list">
            {offPace.map((g) => (
              <div className="inc-row" key={g.id}>
                <span>{g.title}</span>
                <Chip tone={goalTone(g.status)}>{GOAL_STATUS_LABELS[g.status]}</Chip>
              </div>
            ))}
            {s.attention.slice(0, 8).map((a) => (
              <a className="inc-row" href={a.href} key={a.key}>
                <span className="inc-row-main">
                  <Dot tone={a.tone} />
                  <span>{a.title}</span>
                </span>
                {a.detail && <span className="inc-small">{a.detail}</span>}
              </a>
            ))}
            {pendingTests.map((t) => (
              <a className="inc-row" href="/incrementum/experiments" key={t.id}>
                <span>Verdict due: {t.title}</span>
                <Chip tone="warning">Test</Chip>
              </a>
            ))}
            {offPace.length + s.attention.length + pendingTests.length === 0 && <p className="inc-muted">Nothing off pace. Good week.</p>}
          </div>
        </section>

        <section className="inc-panel">
          <h2 className="inc-cell-title">
            This week&apos;s <em>review</em>
          </h2>
          <form action={completeReviewAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <input type="hidden" name="_back" value={BACK} />
            <label className="inc-field">
              Wins
              <textarea className="gh-input" name="wins" defaultValue={thisWeek?.wins ?? ""} />
            </label>
            <label className="inc-field">
              What happened / what I learned
              <textarea className="gh-input" name="notes" defaultValue={thisWeek?.notes ?? ""} />
            </label>
            {[1, 2, 3].map((n) => (
              <label className="inc-field" key={n}>
                Action {n}
                <input className="gh-input" name={`action${n}`} placeholder={n === 1 ? "The one thing that moves the phase forward" : ""} />
              </label>
            ))}
            <SubmitButton pendingLabel="Saving…">{thisWeek?.completedAt ? "Update review" : "Complete review"}</SubmitButton>
            {thisWeek?.actions?.length ? <p className="inc-small">Already committed: {thisWeek.actions.join(" · ")}</p> : null}
          </form>
        </section>
      </div>

      {past.length > 0 && (
        <section className="inc-panel">
          <h2 className="inc-cell-title">
            Past <em>reviews</em>
          </h2>
          <div className="inc-timeline">
            {past.map((r) => (
              <div className="inc-event" key={r.id}>
                <p className="inc-event-meta">Week of {shortDate(r.weekOf, true)}</p>
                {r.wins && <p>Wins: {r.wins}</p>}
                {r.notes && <p className="inc-muted">{r.notes}</p>}
                {r.actions?.length ? <p className="inc-small">Actions: {r.actions.join(" · ")}</p> : null}
              </div>
            ))}
          </div>
        </section>
      )}
      <IncrementumReadySignal />
    </>
  );
}
