import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { money } from "@/lib/incrementum/format";
import Badge from "@/components/ui/Badge";
import { Head, Flash, cycleStatus, monthLabel } from "@/components/contractor/ui";

export default async function MyPayouts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const w = await getMyWorkspace();
  const paid = w.cycles.filter((c) => c.payout_paid_at);
  const total = (rows: typeof w.cycles) => rows.reduce((a, c) => a + Number(c.my_amount ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 1000 }}>
      <Head
        eyebrow="Me"
        title={<>Payouts</>}
        lede={`How it works: you invoice Gray Horizon monthly. Once the client pays for that month, your payout is due${w.me?.payment_terms ? ` (${w.me.payment_terms})` : ""}.`}
      />
      <Flash ok={ok} error={error} />
      <div className="gh-grid-joined gh-grid-joined--3">
        <div className="gh-grid-cell">
          <p className="gh-eyebrow">Due to you now</p>
          <p style={{ fontSize: "var(--gh-text-xl)", fontVariantNumeric: "tabular-nums" }}>{money(total(w.cycles.filter((c) => c.client_paid && !c.payout_paid_at)))}</p>
        </div>
        <div className="gh-grid-cell">
          <p className="gh-eyebrow">Waiting on the client</p>
          <p style={{ fontSize: "var(--gh-text-xl)", fontVariantNumeric: "tabular-nums" }}>{money(total(w.cycles.filter((c) => !c.client_paid)))}</p>
        </div>
        <div className="gh-grid-cell">
          <p className="gh-eyebrow">Paid to date</p>
          <p style={{ fontSize: "var(--gh-text-xl)", fontVariantNumeric: "tabular-nums" }}>{money(total(paid))}</p>
        </div>
      </div>
      <div className="gh-table-wrap">
        <table className="gh-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Client</th>
              <th className="gh-table-num">Amount</th>
              <th>Your invoice #</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {w.cycles.map((c) => {
              const st = cycleStatus(c);
              return (
                <tr key={c.id}>
                  <td>{monthLabel(c.month)}</td>
                  <td>{c.client_name}</td>
                  <td className="gh-table-num">{money(c.my_amount)}</td>
                  <td>{c.contractor_bill_ref ?? "—"}</td>
                  <td>
                    <Badge status={st.status}>{st.label}</Badge>
                  </td>
                </tr>
              );
            })}
            {w.cycles.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--gh-text-muted)" }}>
                  Nothing yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
