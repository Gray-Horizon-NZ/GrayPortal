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
import { PathPanel, etaLabel } from "@/components/incrementum/terminal/path";
import { longDate, goalTone, GOAL_STATUS_LABELS, n0 } from "@/components/incrementum/terminal/helpers";
import { createGoalAction, updateGoalAction, toggleGoalAction, deleteGoalAction } from "../actions";

const BACK = "/incrementum/goals";

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ goal?: string; line?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const set = s.state.settings;
  const line = sp.line === "stretch" ? "stretch" : "base";
  const profit = s.metrics.monthly_profit ?? 0;
  const others = s.goals.filter((g) => !g.isFreedom);
  // Results are judged against the base: stretch goals don't count as off pace.
  const judged = others.filter((g) => !g.isStretch);
  const count = (st: string) => judged.filter((g) => g.status === st).length;

  return (
    <div className="screen">
      <PageHead title="Goals" sub="A goal is a metric, a target and a period. Tracked goals update themselves; the tick on each ring is where you should be by today." />
      <Console>
        <Csec>
          <TermStatus label="Goals" value={`${count("on_track") + count("hit")} on track`} tone={count("at_risk") + count("missed") ? "warn" : undefined}>
            {count("hit")} hit · {count("at_risk")} at risk · {count("missed")} missed
          </TermStatus>
        </Csec>
        <PathPanel s={s} line={line} base={BACK} />
        <TotalSplit
          items={[
            { label: "This month's profit", value: money(profit), priv: true },
            { label: "Base", value: money(set.freedomTarget), priv: true, sub: `at current pace: ${etaLabel(s.path.base, "base")}` },
            { label: "Stretch", value: money(set.freedomDiamond), priv: true, sub: `at current pace: ${etaLabel(s.path.stretch, "stretch")}` },
          ]}
        />
        <Csec>
          <FreedomBar profit={profit} base={n0(set.freedomTarget)} stretch={n0(set.freedomDiamond)} />
          <p className="muted small">
            Monthly profit = monthly revenue (every active client&apos;s signed price) − contractor costs − this month&apos;s ad spend. One-off profit isn&apos;t counted. Aim effort at the stretch; results and spending are judged against the base. Change both in Settings.
          </p>
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
        <label className="inline-check" style={{ alignSelf: "end" }}>
          <input type="checkbox" name="isStretch" defaultChecked={g?.isStretch ?? false} /> Stretch goal (never flagged off pace)
        </label>
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
