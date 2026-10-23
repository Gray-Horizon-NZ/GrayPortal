import { METRICS, isMetricKey } from "@/lib/incrementum/registry";
import { formatMetric } from "@/lib/incrementum/format";
import type { GoalView } from "@/lib/incrementum/compute";
import { Badge, Ring, RingTile } from "./kit";
import { fmtDate, goalTone, GOAL_STATUS_LABELS, shortMoney, n0 } from "./helpers";

/** One goal as a hangar ring: value/target, gold arc, a tick where you should be by today. */
export function GoalRingTile({ g, size = 132, href, dialog, active }: { g: GoalView; size?: number; href?: string; dialog?: string; active?: boolean }) {
  const unit = isMetricKey(g.metricKey) ? METRICS[g.metricKey].unit : null;
  const target = n0(g.target);
  let center: React.ReactNode;
  if (!unit) center = g.manualDoneAt ? "Done" : "Open";
  else if (unit === "currency")
    center = (
      <>
        <b>{shortMoney(g.value ?? 0)}</b>/{shortMoney(target)}
      </>
    );
  else if (unit === "percent" || unit === "months" || unit === "hours") center = <b>{formatMetric(g.value, unit)}</b>;
  else
    center = (
      <>
        <b>{Math.round((g.value ?? 0) * 10) / 10}</b>/{Math.round(target * 10) / 10}
      </>
    );
  return (
    <RingTile name={g.title} active={active} href={href} dialog={dialog} done={g.status === "hit"} foot={<Badge tone={g.isStretch ? undefined : goalTone(g.status)}>{g.isStretch ? "Stretch · " : ""}{GOAL_STATUS_LABELS[g.status] ?? g.status}</Badge>}>
      <Ring
        value={unit ? g.progress : g.manualDoneAt ? 1 : 0}
        max={1}
        size={size}
        center={center}
        mark={g.pace !== null && !["hit", "missed"].includes(g.status) ? g.pace : null}
        sub={g.periodEnd ? `by ${fmtDate(g.periodEnd)}` : g.launchOffsetDays !== null ? `launch + ${g.launchOffsetDays}d` : ""}
      />
    </RingTile>
  );
}
