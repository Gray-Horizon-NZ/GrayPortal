import Link from "next/link";
import { FileClock, Send, CheckCheck, Users, type LucideIcon } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { money } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import { PageHead, Priv, Avatar, Console, Csec, TermStatus, TotalSplit, BigAction } from "@/components/incrementum/terminal/kit";
import { CycleRow, type Cycle } from "@/components/incrementum/terminal/cycle-row";
import { monthName, n0 } from "@/components/incrementum/terminal/helpers";
import { settleMonthAction } from "../actions";

const BASE = "/incrementum/payouts";

// ─── Payouts (a schedule, not a bank ledger) ────────────────────────────
// Nothing here reads the bank or Xero: Max's Xero isn't fed from the bank, so
// tracking every payment would mean re-recording it. The page works out what
// to invoice and who to pay from the signed prices; ticks are optional.
export default async function PayoutsPage() {
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const month = `${st.today.slice(0, 7)}-01`;
  const engById = new Map(st.engagements.map((e) => [e.id, e]));
  const name = (eid: string) => {
    const e = engById.get(eid);
    return e ? (e.clientName ?? e.name) : "Client";
  };
  const cycles = [...st.cycles].sort((a, b) => b.month.localeCompare(a.month));
  const toInvoice = cycles.filter((c) => !c.invoicedAt && c.month <= st.today);
  const open = cycles.filter((c) => c.invoicedAt && !c.payoutPaidAt);
  const settled = cycles.filter((c) => c.payoutPaidAt).slice(0, 12);
  const later = cycles.filter((c) => !c.invoicedAt && c.month > st.today);

  // Who to pay this month: every contractor on an active client, at their signed rate.
  const active = st.engagements.filter((e) => e.status === "active");
  const activeIds = new Set(active.map((e) => e.id));
  const profileName = new Map(st.profiles.map((p) => [p.contractorId, p.name]));
  const payees = new Map<string, { name: string; amount: number; clients: string[] }>();
  for (const ec of st.engagementContractors) {
    if (!activeIds.has(ec.engagementId) || !n0(ec.monthlyCost)) continue;
    const cur = payees.get(ec.contractorId) ?? { name: profileName.get(ec.contractorId) ?? "Contractor", amount: 0, clients: [] };
    cur.amount += n0(ec.monthlyCost);
    const client = name(ec.engagementId);
    if (!cur.clients.includes(client)) cur.clients.push(client);
    payees.set(ec.contractorId, cur);
  }
  const payeeRows = [...payees.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const invoiceTotal = active.reduce((a, e) => a + n0(e.monthlyPrice), 0);
  const payTotal = payeeRows.reduce((a, [, p]) => a + p.amount, 0);
  const unsettledThisMonth = cycles.filter((c) => c.month === month && c.invoicedAt && !c.payoutPaidAt);

  const groups: [string, LucideIcon, Cycle[], string][] = [
    ["To invoice", FileClock, toInvoice, "Every month that has started is invoiced."],
    ["Invoiced · not ticked settled", Send, open, "Nothing waiting. (Settled is optional.)"],
    ["Settled", CheckCheck, settled, "Nothing ticked yet. That's fine: the tick is optional."],
    ["Coming up", FileClock, later, "No future months opened."],
  ];
  return (
    <div className="screen">
      <PageHead title="Payouts" sub="What to invoice and who to pay each month, worked out from the signed prices. Nothing here reads your bank or Xero, so there's nothing to re-record: it's a schedule, and the ticks are optional." />
      <Console>
        <Csec>
          <TermStatus label={monthName(month, true)} value={toInvoice.length ? `${toInvoice.length} to invoice` : "All invoiced"} tone={toInvoice.length ? "warn" : undefined}>
            Billed in advance · contractors paid within 5 working days of the client (pay-when-paid)
          </TermStatus>
        </Csec>
        <TotalSplit
          items={[
            { label: "Invoice clients", value: money(invoiceTotal), priv: true, sub: `${active.length} active client${active.length === 1 ? "" : "s"} · per month` },
            { label: "Pay contractors", value: money(payTotal), priv: true, sub: `${payeeRows.length} contractor${payeeRows.length === 1 ? "" : "s"} · per month` },
            { label: "You keep", value: money(invoiceTotal - payTotal), priv: true, tone: "good", sub: "before ad spend" },
          ]}
        />
        <Csec className="flush">
          <div className="agency-list-head">
            <Users size={14} /> Who to pay · {monthName(month, true)}
            <span className="r">from the signed contractor rates</span>
          </div>
          {payeeRows.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 16px" }}>
              No contractors on active clients yet.
            </p>
          ) : (
            <div style={{ padding: "4px 16px" }}>
              <dl className="ledger">
                {payeeRows.map(([cid, p]) => (
                  <Link key={cid} href={`/incrementum/contractors/${cid}`} data-click>
                    <dt className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                      <Avatar name={p.name} size={26} active /> {p.name} <small className="muted">{p.clients.join(", ")}</small>
                    </dt>
                    <dd>
                      <Priv>{money(p.amount)}</Priv>
                    </dd>
                  </Link>
                ))}
              </dl>
            </div>
          )}
        </Csec>
        {groups.map(([title, Icon, rows, empty]) => (
          <Csec key={title} className="flush">
            <div className="agency-list-head">
              <Icon size={14} /> {title}
              <span className="r">{rows.length}</span>
            </div>
            {rows.length === 0 ? (
              <p className="muted small" style={{ padding: "14px 16px" }}>
                {empty}
              </p>
            ) : (
              <div className="rowlist">
                {rows.map((c) => (
                  <CycleRow key={c.id} c={c} title={name(c.engagementId)} back={BASE} today={st.today} />
                ))}
              </div>
            )}
          </Csec>
        ))}
        <BigAction
          label={`Mark ${monthName(month, true)} settled`}
          sub={unsettledThisMonth.length ? "Optional · tick once you've paid everyone for the month" : "Nothing invoiced and unticked this month"}
          value={<Priv>{money(unsettledThisMonth.reduce((a, c) => a + n0(c.payoutAmount), 0))}</Priv>}
          disabled={!unsettledThisMonth.length}
          action={settleMonthAction}
          hidden={{ _back: BASE, ids: unsettledThisMonth.map((c) => c.id).join(","), date: st.today }}
        />
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}
