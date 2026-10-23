import { Plus } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { METRICS, METRIC_KEYS, isMetricKey } from "@/lib/incrementum/registry";
import { money, formatMetric, formatTarget } from "@/lib/incrementum/format";
import type { GoalView } from "@/lib/incrementum/compute";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Field, FreedomBar, Console, Csec, TermStatus, TotalSplit, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog, OpenDialog } from "@/components/incrementum/terminal/client";
import { GoalRingTile } from "@/components/incrementum/terminal/goals";
import { longDate, goalTone, GOAL_STATUS_LABELS, n0 } from "@/components/incrementum/terminal/helpers";
import { createGoalAction, updateGoalAction, toggleGoalAction, deleteGoalAction } from "../actions";

const BACK = "/incrementum/goals";

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const set = s.state.settings;
  const profit = s.metrics.monthly_profit ?? 0;
  const others = s.goals.filter((g) => !g.isFreedom);
  const count = (st: string) => others.filter((g) => g.status === st).length;

  return (
    <div className="screen">
      <PageHead title="Goals" sub="A goal is a metric, a target and a period. Tracked goals update themselves; the tick on each ring is where you should be by today." />
      <Console>
        <Csec>
          <TermStatus label="Goals" value={`${count("on_track") + count("hit")} on track`} tone={count("at_risk") + count("missed") ? "warn" : undefined}>
            {count("hit")} hit · {count("at_risk")} at risk · {count("missed")} missed
          </TermStatus>
        </Csec>
        <TotalSplit
          items={[
            { label: "This month's profit", value: money(profit), priv: true },
            { label: "Freedom number", value: money(set.freedomTarget), priv: true, sub: `Gold ${money(set.freedomGold)} · Diamond ${money(set.freedomDiamond)}` },
          ]}
        />
        <Csec>
          <FreedomBar profit={profit} target={n0(set.freedomTarget)} gold={n0(set.freedomGold)} diamond={n0(set.freedomDiamond)} />
          <p className="muted small">Monthly profit = monthly revenue (every active client&apos;s signed price) − contractor costs − this month&apos;s ad spend. Change the tiers in Settings.</p>
        </Csec>
        <Csec>
          <div className="ringgrid" style={{ "--cols": 4 } as React.CSSProperties}>
            {others.map((x) => (
              <GoalRingTile key={x.id} g={x} dialog={`goal-${x.id}`} />
            ))}
            <OpenDialog target="goal-new" className="ringtile ringtile-add">
              <Plus size={22} />
              <span>New goal</span>
            </OpenDialog>
          </div>
        </Csec>
      </Console>

      {others.map((g) => (
        <GoalDialog key={g.id} g={g} openOnLoad={sp.goal === g.id} today={s.state.today} phases={[]} />
      ))}
      <GoalDialog g={null} today={s.state.today} phases={s.phases.phases.map((p) => ({ id: p.id, label: `Phase ${p.number} · ${p.name}` }))} />
      <IncrementumReadySignal />
    </div>
  );
}

function GoalDialog({ g, openOnLoad, today, phases }: { g: GoalView | null; openOnLoad?: boolean; today: string; phases: { id: string; label: string }[] }) {
  const unit = g && isMetricKey(g.metricKey) ? METRICS[g.metricKey].unit : null;
  const tone = g ? goalTone(g.status) : undefined;
  return (
    <Dialog id={g ? `goal-${g.id}` : "goal-new"} title={g ? g.title : "New goal"} wide openOnLoad={openOnLoad}>
      {g && (
        <>
          <Ledger
            rows={[
              ["Now", unit ? formatMetric(g.value, unit) : g.manualDoneAt ? "Done" : "Open"],
              ["Target", unit ? formatTarget(g.comparator, n0(g.target), unit) : "Manual milestone"],
              ["Period", `${g.periodStart ? longDate(g.periodStart) : "—"} → ${g.periodEnd ? longDate(g.periodEnd) : g.launchOffsetDays !== null ? `launch + ${g.launchOffsetDays} days (TBD)` : "—"}`],
              ["Status", GOAL_STATUS_LABELS[g.status] ?? g.status, tone === "bad" ? "bad" : tone === "warn" ? "warn" : undefined],
            ]}
          />
          {!unit && (
            <form action={toggleGoalAction} data-keep-open="">
              <BackTo path={BACK} />
              <HiddenFields values={{ id: g.id, done: g.manualDoneAt ? "" : "on" }} />
              <SubmitButton className="btn" pendingLabel="…">
                {g.manualDoneAt ? "Reopen" : "Mark done"}
              </SubmitButton>
            </form>
          )}
        </>
      )}
      <form className="form-grid g3" action={g ? updateGoalAction : createGoalAction}>
        <BackTo path={BACK} />
        {g && <HiddenFields values={{ id: g.id }} />}
        <Field label="Goal" wide>
          <input className="input" name="title" defaultValue={g?.title ?? ""} required placeholder="e.g. 6 Google Ads clients by June" />
        </Field>
        {!g && (
          <>
            <Field label="Tracked metric">
              <select className="select" name="metricKey" defaultValue="">
                <option value="">Manual milestone</option>
                {METRIC_KEYS.filter((k) => k !== "launch_readiness_pct").map((k) => (
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
          </>
        )}
        {(!g || unit) && (
          <Field label="Target">
            <input className="input" name="target" defaultValue={g?.target ?? ""} />
          </Field>
        )}
        <Field label="From">
          <input className="input" type="date" name="periodStart" defaultValue={g ? (g.periodStart ?? "") : today} />
        </Field>
        <Field label="By">
          <input className="input" type="date" name="periodEnd" defaultValue={g?.periodEnd ?? ""} />
        </Field>
        {!g && (
          <Field label="Phase">
            <select className="select" name="phaseId" defaultValue="">
              <option value="">—</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="form-actions">
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            {g ? "Save" : "Add goal"}
          </SubmitButton>
          <span className="muted small">Client-count goals (Active clients) feed the Capacity forecast.</span>
        </div>
      </form>
      {g && (
        <form action={deleteGoalAction} className="row">
          <BackTo path={BACK} />
          <HiddenFields values={{ id: g.id }} />
          <span className="spacer" />
          <button type="submit" className="linkbtn danger">
            Remove goal
          </button>
        </form>
      )}
    </Dialog>
  );
}
