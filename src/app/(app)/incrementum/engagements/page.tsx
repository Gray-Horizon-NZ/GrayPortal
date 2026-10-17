import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listClientsForEngagements } from "@/lib/dal/incrementum/engagements";
import { ENGAGEMENT_HEALTH_LABELS } from "@/lib/incrementum/registry";
import { money, shortDate, todayNz } from "@/lib/incrementum/format";
import { monthsBetween } from "@/lib/incrementum/evaluate";
import { toNum } from "@/lib/incrementum/pricing";
import { PageHead, Flash, Chip, Dot } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { createEngagementAction } from "../actions";

const BACK = "/incrementum/engagements";

export default async function EngagementsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const [s, clients] = await Promise.all([getIncrementumSnapshot(), listClientsForEngagements()]);
  const live = s.state.engagements.filter((e) => e.status !== "ended");
  const costOf = (id: string) => s.state.engagementContractors.filter((ec) => ec.engagementId === id).reduce((a, ec) => a + (toNum(ec.monthlyCost) ?? 0), 0);

  return (
    <>
      <PageHead
        eyebrow="Deliver"
        title={<>Engagements</>}
        lede="Client work run by contractors, month by month: delivered → approved by you → reported → invoiced in advance → client paid → contractor paid. Prices are the signed prices and never change when Services & Pricing does."
      />
      <Flash ok={ok} error={error} />

      <div className="inc-stats">
        <div className="inc-stat">
          <span className="inc-small">Active clients</span>
          <span className="inc-stat-value">{s.metrics.active_clients ?? 0}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">MRR</span>
          <span className="inc-stat-value">{money(s.metrics.mrr)}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Contractor cost</span>
          <span className="inc-stat-value">{money(s.metrics.monthly_contractor_cost)}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Avg profit / client</span>
          <span className="inc-stat-value">{money(s.metrics.avg_profit_per_client)}</span>
        </div>
      </div>

      <section className="inc-panel">
        {live.length === 0 ? (
          <p className="inc-muted">No engagements yet. Onboard a lead as a client, or start one below for an existing client.</p>
        ) : (
          <div className="gh-table-wrap">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Health</th>
                  <th className="gh-table-num">Price</th>
                  <th className="gh-table-num">Cost</th>
                  <th className="gh-table-num">Profit</th>
                  <th className="gh-table-num">Months</th>
                  <th>Min term ends</th>
                </tr>
              </thead>
              <tbody>
                {live.map((e) => {
                  const price = toNum(e.monthlyPrice) ?? 0;
                  const cost = costOf(e.id);
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link href={`${BACK}/${e.id}`}>{e.clientName ?? e.name}</Link>
                        {e.status === "paused" && <> <Chip tone="warning">Paused</Chip></>}
                      </td>
                      <td>
                        <span className="inc-inline">
                          <Dot tone={e.health === "good" ? "good" : e.health === "watch" ? "warning" : "danger"} />
                          {ENGAGEMENT_HEALTH_LABELS[e.health as keyof typeof ENGAGEMENT_HEALTH_LABELS] ?? e.health}
                        </span>
                      </td>
                      <td className="gh-table-num">{money(price)}</td>
                      <td className="gh-table-num">{money(cost)}</td>
                      <td className="gh-table-num" style={{ color: price - cost < 400 ? "var(--gh-danger)" : undefined }}>
                        {money(price - cost)}
                      </td>
                      <td className="gh-table-num">{e.startDate ? monthsBetween(e.startDate, s.state.today).toFixed(1) : "—"}</td>
                      <td>{shortDate(e.minTermEnd, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Start an <em>engagement</em>
        </h2>
        <p className="inc-small">For an existing GrayPortal client. New clients from ads come in through Leads → Onboard client.</p>
        <form action={createEngagementAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <label className="inc-field">
            Client
            <select className="gh-input" name="clientId" required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field">
            Package
            <select className="gh-input" name="packageId" defaultValue="">
              <option value="">None</option>
              {s.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {money(p.totals.monthlyPrice)}/mo
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field">
            Name
            <input className="gh-input" name="name" required placeholder="Client · Foundation" />
          </label>
          <label className="inc-field">
            Signed monthly price
            <input className="gh-input" name="monthlyPrice" inputMode="decimal" required />
          </label>
          <label className="inc-field">
            Setup fee
            <input className="gh-input" name="setupPrice" inputMode="decimal" />
          </label>
          <label className="inc-field">
            Start
            <input className="gh-input" type="date" name="startDate" defaultValue={todayNz()} required />
          </label>
          <label className="inc-field">
            Min term (months)
            <input className="gh-input" type="number" name="minTermMonths" defaultValue={3} />
          </label>
          <SubmitButton pendingLabel="Starting…">Start engagement</SubmitButton>
        </form>
      </section>
      <IncrementumReadySignal />
    </>
  );
}
