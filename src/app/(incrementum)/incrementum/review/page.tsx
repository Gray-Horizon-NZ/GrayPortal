import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { METRICS, type MetricKey } from "@/lib/incrementum/registry";
import { formatMetric, money, dateNz } from "@/lib/incrementum/format";
import { mondayOf } from "@/lib/incrementum/evaluate";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import { PageHead, Panel, Priv, Field, DueList, Console, Csec, TermStatus, Ledger, BigAction, BackTo } from "@/components/incrementum/terminal/kit";
import { longDate, fmtDate, addDays, GOAL_STATUS_LABELS } from "@/components/incrementum/terminal/helpers";
import { completeReviewAction } from "../actions";

// Split in two (2026-10-24): effort is in Max's control, so it's read against
// the $20k stretch pace; results are read against the $10k base.
const RESULT_METRICS: MetricKey[] = ["leads_this_month", "leads_unanswered", "ads_payback_months", "launch_readiness_pct", "max_hours_per_client"];
const TONE = { danger: "bad", warning: "warn", neutral: undefined } as const;

export default async function ReviewPage() {
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const monday = mondayOf(new Date(`${st.today}T12:00:00Z`));
  const thisWeek = st.reviews.find((r) => r.weekOf === monday);
  const past = st.reviews.filter((r) => r.weekOf !== monday && r.completedAt).slice(0, 8);
  const offPace = s.goals.filter((g) => g.status === "at_risk" || g.status === "missed");
  const pendingTests = st.experiments.filter((e) => e.type === "test" && !e.verdict && e.endsAt && e.endsAt <= st.today);
  const own = [
    ...offPace.map((g) => ({ key: `g${g.id}`, title: g.title, detail: (GOAL_STATUS_LABELS[g.status] ?? g.status).toLowerCase(), tone: "warn", href: "/incrementum/goals" })),
    ...s.attention
      .filter((a) => !a.key.startsWith("review-") && !a.key.startsWith("goal-"))
      .slice(0, 8)
      .map((a) => ({ key: a.key, title: a.title, detail: a.detail, tone: TONE[a.tone], href: a.href })),
    ...pendingTests.map((t) => ({ key: `x${t.id}`, title: `Verdict due: ${t.title}`, detail: "test", tone: "warn", href: "/incrementum/experiments" })),
  ];
  const friday = addDays(monday, 4);
  const done = !!thisWeek?.completedAt;
  const streak = s.metrics.weekly_review_streak ?? 0;
  const m = s.metrics;
  const outreachTarget = st.settings.weeklyOutreachTarget ?? 20;
  const proposalsThisWeek = st.leads.filter((l) => l.stage === "proposal" && dateNz(l.stageChangedAt) >= monday).length;
  const referralAsks = s.nextMoves.filter((mv) => mv.key.startsWith("referral-")).length;
  const pipeline = st.profiles.filter((p) => ["sourced", "contacted", "meeting_booked", "vetting"].includes(p.stage)).length;
  const stretch = s.path.stretch;
  const base = s.path.base;

  return (
    <div className="screen">
      <PageHead title="Weekly review" sub="Look at the numbers, own what's off pace, commit to three actions. Actions land on the main task list, due Friday." />
      <Console>
        <Csec>
          <TermStatus label="Weekly review" value={done ? "Done" : "Due"} tone={done ? undefined : "warn"}>
            Week of {longDate(monday)} · streak {streak} week{streak === 1 ? "" : "s"}
          </TermStatus>
        </Csec>
        <div className="console-split">
          <Csec>
            <p className="csec-title" style={{ marginBottom: 8 }}>
              Effort vs the stretch
            </p>
            <Ledger
              rows={[
                ["Outreach this week", `${m.outreach_week ?? 0} / ${outreachTarget}`, (m.outreach_week ?? 0) >= outreachTarget ? "good" : "warn", "/incrementum/leads"],
                ["Referral asks due", referralAsks, referralAsks ? "warn" : undefined, "/incrementum"],
                ["Proposals sent this week", proposalsThisWeek, undefined, "/incrementum/leads"],
                ["Contractors in the pipeline", pipeline, undefined, "/incrementum/contractors"],
                ["New clients / month", `${formatMetric(m.new_clients_avg_3m, "count")} vs ${stretch.newPerMonth.needed.toFixed(1)} stretch pace`],
              ]}
            />
            <p className="csec-title" style={{ margin: "16px 0 8px" }}>
              Results vs the base
            </p>
            <Ledger
              rows={[
                ["Monthly profit", <Priv key="p">{`${money(m.monthly_profit ?? 0)} / ${money(base.target)}`}</Priv>],
                ["Active clients", `${m.active_clients ?? 0} / ${base.clientsNeeded}`],
                ...RESULT_METRICS.map((k) => [METRICS[k].label, METRICS[k].unit === "currency" ? <Priv key={k}>{formatMetric(m[k], "currency")}</Priv> : formatMetric(m[k], METRICS[k].unit)] as [string, React.ReactNode]),
              ]}
            />
          </Csec>
          <Csec>
            <p className="csec-title" style={{ marginBottom: 8 }}>
              What needs owning
            </p>
            <DueList items={own} empty="Nothing off pace. Good week." />
          </Csec>
        </div>
        <Csec>
          <form id="review-form" className="form-grid" action={completeReviewAction}>
            <BackTo path="/incrementum/review" />
            <Field label="Wins">
              <textarea className="textarea" name="wins" defaultValue={thisWeek?.wins ?? ""} />
            </Field>
            <Field label="What happened / what I learned">
              <textarea className="textarea" name="notes" defaultValue={thisWeek?.notes ?? ""} />
            </Field>
            {[1, 2, 3].map((n) => (
              <Field key={n} label={`Action ${n}${n === 1 ? " · the one thing that moves the phase" : ""}`} wide>
                <input className="input" name={`action${n}`} />
              </Field>
            ))}
            {thisWeek?.actions?.length ? (
              <p className="muted small" style={{ gridColumn: "1 / -1" }}>
                Already committed: {thisWeek.actions.join(" · ")}
              </p>
            ) : null}
          </form>
        </Csec>
        <BigAction label={done ? "Update this week's review" : "Complete review"} sub={`Actions go to the main list, due ${fmtDate(friday)}`} value="→" formId="review-form" />
      </Console>
      {past.length > 0 && (
        <Panel title="Past reviews">
          <div className="timeline">
            {past.map((r) => (
              <div key={r.id}>
                <time>Week of {fmtDate(r.weekOf)}</time>
                <span>
                  {r.wins && <>Wins: {r.wins}</>}
                  {r.actions?.length ? (
                    <small className="muted" style={{ display: "block" }}>
                      Actions: {r.actions.join(" · ")}
                    </small>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <IncrementumReadySignal />
    </div>
  );
}
