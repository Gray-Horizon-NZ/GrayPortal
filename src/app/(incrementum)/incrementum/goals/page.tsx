import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { METRICS, METRIC_KEYS, isMetricKey } from "@/lib/incrementum/registry";
import { formatTarget, money, shortDate, todayNz } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";
import { PageHead, Flash, Bar, Chip, MetricValue, goalTone, GOAL_STATUS_LABELS } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { createGoalAction, updateGoalAction, toggleGoalAction, deleteGoalAction } from "../actions";

const BACK = "/incrementum/goals";

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const freedom = s.goals.find((g) => g.isFreedom);
  const others = s.goals.filter((g) => !g.isFreedom);
  const target = toNum(s.state.settings.freedomTarget) ?? 10000;
  const gold = toNum(s.state.settings.freedomGold) ?? 15000;
  const diamond = toNum(s.state.settings.freedomDiamond) ?? 20000;
  const profit = s.metrics.monthly_profit ?? 0;
  const phaseName = new Map(s.phases.phases.map((p) => [p.id, `Phase ${p.number} · ${p.name}`]));

  return (
    <>
      <PageHead
        eyebrow="Accountability"
        title={<>Goals</>}
        lede="A goal is a metric, a target and a period. Tracked goals update themselves from live data; the pace line shows where you should be by today."
      />
      <Flash ok={ok} error={error} />

      <section className="inc-panel" style={{ borderColor: "var(--gh-accent)" }}>
        <p className="gh-eyebrow">The north star</p>
        <h2 className="inc-cell-title" style={{ fontSize: "var(--gh-text-xl)" }}>
          Freedom <em>number</em>
        </h2>
        <div className="inc-stats">
          <div className="inc-stat">
            <span className="inc-small">This month&apos;s profit</span>
            <span className="inc-stat-value">{money(profit)}</span>
          </div>
          <div className="inc-stat">
            <span className="inc-small">Target</span>
            <span className="inc-stat-value">{money(target)}</span>
          </div>
          <div className="inc-stat">
            <span className="inc-small">Gold</span>
            <span className="inc-stat-value">{money(gold)}</span>
          </div>
          <div className="inc-stat">
            <span className="inc-small">Diamond</span>
            <span className="inc-stat-value">{money(diamond)}</span>
          </div>
        </div>
        <Bar value={profit / diamond} markers={[target / diamond, gold / diamond]} />
        <p className="inc-small">
          Monthly profit = Incrementum MRR − contractor costs − this month&apos;s ad spend. Change the tiers in Settings. Your personal numbers live on{" "}
          <Link className="inc-link" href="/finance/personal">
            Owner&apos;s Cut
          </Link>
          .
        </p>
        {freedom && <GoalStatusLine g={freedom} />}
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          All <em>goals</em>
        </h2>
        <div className="inc-list">
          {others.map((g) => (
            <div key={g.id} className="inc-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--gh-space-2)" }}>
              <div className="inc-inline" style={{ justifyContent: "space-between" }}>
                <div className="inc-row-main">
                  {!g.metricKey && (
                    <form action={toggleGoalAction}>
                      <input type="hidden" name="_back" value={BACK} />
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="done" value={g.manualDoneAt ? "" : "on"} />
                      <button type="submit" className="inc-check" data-done={g.manualDoneAt ? true : undefined} aria-label="Toggle goal">
                        {g.manualDoneAt ? "✓" : ""}
                      </button>
                    </form>
                  )}
                  <strong style={{ fontWeight: 500 }}>{g.title}</strong>
                </div>
                <div className="inc-inline">
                  {g.phaseId && <Chip>{phaseName.get(g.phaseId)}</Chip>}
                  <Chip tone={goalTone(g.status)}>{GOAL_STATUS_LABELS[g.status]}</Chip>
                </div>
              </div>
              {g.metricKey && <Bar value={g.progress} markers={g.pace !== null && g.status !== "missed" && g.status !== "hit" ? [g.pace] : []} tone={g.status === "hit" ? "good" : g.status === "at_risk" ? "warn" : g.status === "missed" ? "danger" : undefined} />}
              <GoalStatusLine g={g} />
              <details className="inc-disclosure">
                <summary>Edit</summary>
                <form action={updateGoalAction} className="inc-form">
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={g.id} />
                  <label className="inc-field inc-field--wide">
                    Title
                    <input className="gh-input" name="title" defaultValue={g.title} />
                  </label>
                  {g.metricKey && (
                    <label className="inc-field">
                      Target
                      <input className="gh-input" name="target" defaultValue={g.target ?? ""} />
                    </label>
                  )}
                  <label className="inc-field">
                    From
                    <input className="gh-input" type="date" name="periodStart" defaultValue={g.periodStart ?? ""} />
                  </label>
                  <label className="inc-field">
                    By
                    <input className="gh-input" type="date" name="periodEnd" defaultValue={g.periodEnd ?? ""} />
                  </label>
                  <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                </form>
                <form action={deleteGoalAction} style={{ marginTop: "var(--gh-space-2)" }}>
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={g.id} />
                  <button className="gh-link-btn gh-link-btn--danger" type="submit">
                    Remove goal
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          New <em>goal</em>
        </h2>
        <form action={createGoalAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <label className="inc-field inc-field--wide">
            Goal
            <input className="gh-input" name="title" required placeholder="e.g. 6 Google Ads clients by June" />
          </label>
          <label className="inc-field">
            Tracked metric
            <select className="gh-input" name="metricKey" defaultValue="">
              <option value="">Manual milestone</option>
              {METRIC_KEYS.filter((k) => k !== "launch_readiness_pct").map((k) => (
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
          <label className="inc-field">
            From
            <input className="gh-input" type="date" name="periodStart" defaultValue={todayNz()} />
          </label>
          <label className="inc-field">
            By
            <input className="gh-input" type="date" name="periodEnd" />
          </label>
          <label className="inc-field">
            Phase
            <select className="gh-input" name="phaseId" defaultValue="">
              <option value="">—</option>
              {s.phases.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  Phase {p.number} · {p.name}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton pendingLabel="Adding…">Add goal</SubmitButton>
        </form>
        <p className="inc-small">Client-count goals (Active clients) feed the Capacity forecast, which works out the contractors you&apos;ll need and when to start recruiting.</p>
      </section>
      <IncrementumReadySignal />
    </>
  );
}

function GoalStatusLine({ g }: { g: { metricKey: string | null; value: number | null; comparator: string; target: string | null; periodEnd: string | null; launchOffsetDays: number | null } }) {
  return (
    <span className="inc-small inc-inline">
      <MetricValue metricKey={g.metricKey} value={g.value} />
      {isMetricKey(g.metricKey) && <span>{formatTarget(g.comparator, toNum(g.target), METRICS[g.metricKey].unit)}</span>}
      {g.periodEnd && <span>· by {shortDate(g.periodEnd, true)}</span>}
      {!g.periodEnd && g.launchOffsetDays !== null && <span>· by launch + {g.launchOffsetDays} days (launch date TBD)</span>}
    </span>
  );
}
