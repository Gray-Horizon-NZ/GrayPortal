import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { money } from "@/lib/incrementum/format";
import { toNum } from "@/lib/incrementum/pricing";
import { PageHead, Flash } from "@/components/incrementum/ui";
import { CycleRow } from "@/components/incrementum/CycleRow";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";

const BACK = "/incrementum/payouts";

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const name = new Map(s.state.engagements.map((e) => [e.id, e.clientName ?? e.name]));
  const cycles = s.state.cycles;
  const due = cycles.filter((c) => c.clientPaidAt && !c.payoutPaidAt);
  const awaiting = cycles.filter((c) => c.invoicedAt && !c.clientPaidAt);
  const notInvoiced = cycles.filter((c) => !c.invoicedAt);
  const settled = cycles.filter((c) => c.payoutPaidAt).slice(0, 12);
  const sum = (rows: typeof cycles, k: "invoiceAmount" | "payoutAmount") => rows.reduce((a, r) => a + (toNum(r[k]) ?? 0), 0);

  return (
    <>
      <PageHead
        eyebrow="Money"
        title={
          <>
            Pay-when-<em>paid</em>
          </>
        }
        lede="Client invoiced in advance → client pays → contractor payout due (7 days) → paid. The client paying is what unlocks the payout, so a late payer holds the contractor's money, not yours. Xero stays the books; record invoice numbers here."
      />
      <Flash ok={ok} error={error} />
      <div className="inc-stats">
        <div className="inc-stat">
          <span className="inc-small">Payouts due now</span>
          <span className="inc-stat-value">{money(sum(due, "payoutAmount"))}</span>
          <span className="inc-small">{due.length} month(s)</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Awaiting client payment</span>
          <span className="inc-stat-value">{money(sum(awaiting, "invoiceAmount"))}</span>
          <span className="inc-small">{awaiting.length} invoice(s)</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Payouts on time</span>
          <span className="inc-stat-value">{s.metrics.payouts_on_time_pct === null ? "—" : `${Math.round(s.metrics.payouts_on_time_pct)}%`}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Profit vs ad spend</span>
          <span className="inc-stat-value">{money(s.metrics.cumulative_profit_vs_spend)}</span>
        </div>
      </div>
      <Group names={name} title={<>Pay the <em>contractor</em></>} rows={due} empty="Nothing to pay. Every client payment received has been passed on." />
      <Group names={name} title={<>Awaiting the <em>client</em></>} rows={awaiting} empty="No unpaid invoices." />
      <Group names={name} title={<>Not yet <em>invoiced</em></>} rows={notInvoiced} empty="Every open month has been invoiced. Open months from an engagement page." />
      <Group names={name} title={<>Settled</>} rows={settled} empty="No settled months yet." />
      <IncrementumReadySignal />
    </>
  );
}

type Cycle = Awaited<ReturnType<typeof getIncrementumSnapshot>>["state"]["cycles"][number];

function Group({ title, rows, empty, names }: { title: React.ReactNode; rows: Cycle[]; empty: string; names: Map<string, string> }) {
  return (
    <section className="inc-panel">
      <h2 className="inc-cell-title">{title}</h2>
      {rows.length === 0 ? <p className="inc-muted">{empty}</p> : rows.map((c) => <CycleRow key={c.id} c={c} back={BACK} title={names.get(c.engagementId)} />)}
    </section>
  );
}
