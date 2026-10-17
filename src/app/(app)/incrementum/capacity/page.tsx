import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { shortDate } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";
import { contractorsNeeded, recruitByDate } from "@/lib/incrementum/evaluate";
import { PageHead, Flash, Bar, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";

export default async function CapacityPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const slotsPer = toNum(s.state.settings.defaultSlotsPerContractor) ?? 4;
  const recruitDays = s.state.settings.defaultRecruitDays ?? 21;
  const active = s.metrics.active_clients ?? 0;
  const confirmed = s.metrics.contractors_confirmed ?? 0;
  const ratio = active ? confirmed / active : null;

  // Measured average Sourced → Confirmed time, from stage history, once there is any.
  const confirmedEvents = s.state.profiles
    .filter((p) => p.stage === "confirmed" || p.stage === "onboarded")
    .map((p) => (new Date(p.stageChangedAt).getTime() - new Date(p.createdAt).getTime()) / 86_400_000)
    .filter((d) => d > 0);
  const measuredDays = confirmedEvents.length ? Math.round(confirmedEvents.reduce((a, b) => a + b, 0) / confirmedEvents.length) : null;
  const daysToRecruit = measuredDays ?? recruitDays;

  const clientGoals = s.goals.filter((g) => g.metricKey === "active_clients" && g.periodEnd && g.status !== "hit");

  return (
    <>
      <PageHead
        eyebrow="Deliver"
        title={
          <>
            Capacity: contractors per <em>client</em>
          </>
        }
        lede={`Measured in client slots per service. Each contractor's declared capacity, or ${slotsPer} slots until they declare one (Settings). Minimum bench is 2 per service, so every service has a backup.`}
      />
      <Flash ok={ok} error={error} />

      <div className="inc-stats">
        <div className="inc-stat">
          <span className="inc-small">Active clients</span>
          <span className="inc-stat-value">{active}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Confirmed contractors</span>
          <span className="inc-stat-value">{confirmed}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Contractors per client</span>
          <span className="inc-stat-value">{ratio === null ? "—" : ratio.toFixed(2)}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Time to recruit</span>
          <span className="inc-stat-value">{daysToRecruit} days</span>
          <span className="inc-small">{measuredDays ? "measured" : "default until measured"}</span>
        </div>
      </div>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          By <em>service</em>
        </h2>
        {s.capacity.length === 0 ? (
          <p className="inc-muted">Put services in a package (Services &amp; Pricing) and record contractor quotes to see capacity.</p>
        ) : (
          <div className="gh-table-wrap">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th className="gh-table-num">Contractors</th>
                  <th className="gh-table-num">Slots</th>
                  <th className="gh-table-num">Used</th>
                  <th className="gh-table-num">Free</th>
                  <th style={{ width: 160 }}>Utilisation</th>
                  <th>Bench</th>
                  <th>Next phase</th>
                </tr>
              </thead>
              <tbody>
                {s.capacity.map((c) => (
                  <tr key={c.serviceId}>
                    <td>{c.serviceName}</td>
                    <td className="gh-table-num">{c.confirmed}</td>
                    <td className="gh-table-num">{c.slotsTotal}</td>
                    <td className="gh-table-num">{c.slotsUsed}</td>
                    <td className="gh-table-num">{c.slotsFree}</td>
                    <td>
                      <Bar value={c.slotsTotal ? c.slotsUsed / c.slotsTotal : 0} tone={c.slotsTotal && c.slotsFree <= 1 ? "warn" : undefined} />
                    </td>
                    <td>
                      <Chip tone={c.benchOk ? "good" : "warning"}>{c.benchOk ? "OK" : "No backup"}</Chip>
                    </td>
                    <td className="inc-small">{c.needed !== null ? (c.gap ? `Need ${c.gap} more · recruit by ${shortDate(c.recruitBy, true)}` : `Covered (${c.needed} needed)`) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Forecast in <em>plain words</em>
        </h2>
        <div className="inc-list">
          {s.capacity.map((c) => (
            <p className="inc-row" key={c.serviceId}>
              {c.gap
                ? `${c.serviceName}: ${c.gap} more contractor${c.gap === 1 ? "" : "s"} needed for Phase ${s.phases.next?.number ?? "next"} (${s.phases.next?.clientMax ?? s.phases.next?.clientMin ?? "?"} clients) by ${shortDate(c.targetDate, true)}. Start sourcing by ${shortDate(c.recruitBy, true)}.`
                : `${c.serviceName}: bench covers the next phase.`}
            </p>
          ))}
          {clientGoals.map((g) => {
            const target = toNum(g.target) ?? 0;
            const needed = contractorsNeeded(target, 1, slotsPer, 2);
            const gap = Math.max(0, needed - confirmed);
            return (
              <p className="inc-row" key={g.id}>
                Goal &quot;{g.title}&quot;: {target} clients needs about {needed} contractors. {gap ? `Recruit ${gap} more, starting by ${shortDate(recruitByDate(g.periodEnd!, daysToRecruit), true)}.` : "You have enough."}
              </p>
            );
          })}
        </div>
        <p className="inc-small">
          Contractors needed = ceil(clients × slot weight ÷ slots per contractor), never below 2. Recruit-by = target date − time to recruit. Once you log hours, measured hours per client can replace declared slots.{" "}
          <Link className="inc-link" href="/incrementum/settings">
            Assumptions
          </Link>
        </p>
      </section>
      <IncrementumReadySignal />
    </>
  );
}
