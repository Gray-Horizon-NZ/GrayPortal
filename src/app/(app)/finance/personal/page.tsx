import { redirect } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { getTotalActiveMonthlyRevenue } from "@/lib/dal/clientServices";
import { getMonthlyExpenseTotal, getMonthlyWriteoffExpenseTotal } from "@/lib/dal/businessExpenses";
import { listDevCosts, getMonthlyDevCostTotal } from "@/lib/dal/devCosts";
import { getXeroPaidIncomeBetween } from "@/lib/dal/xero";
import { getXeroConnection } from "@/lib/dal/xeroConnection";
import { getSpiderFawcettYtdIncome } from "@/lib/spiderFawcett";
import { nzTaxYearStart } from "@/lib/nzTax";
import { createDevCostAction, deleteDevCostAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import OwnersCutCalculator from "./OwnersCutCalculator";

function money(n: number) {
  return `$${n.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Replaces the old period-by-period income-split flow as the primary view
// (that system now lives at /finance/personal/history, data intact) — a
// live calculator that needs nothing created or re-entered each month:
// income defaults to your real active client revenue, expenses default to
// the live Business Expenses + dev-cost totals.
export default async function OwnersCutCalculatorPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const now = new Date();
  const taxYearStartIso = nzTaxYearStart(now).toISOString().slice(0, 10);
  const startOfThisMonthIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);

  const [
    liveIncomeNzd,
    businessExpensesMonthlyNzd,
    businessExpensesWriteoffMonthlyNzd,
    devCostsMonthlyNzd,
    devCosts,
    xeroYtdPriorNzd,
    xeroConnection,
    spiderFawcettYtdNzd,
  ] = await Promise.all([
    getTotalActiveMonthlyRevenue(),
    getMonthlyExpenseTotal(),
    getMonthlyWriteoffExpenseTotal(),
    getMonthlyDevCostTotal(),
    listDevCosts(),
    getXeroPaidIncomeBetween(taxYearStartIso, startOfThisMonthIso),
    getXeroConnection(),
    getSpiderFawcettYtdIncome(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Owner&apos;s Cut Calculator</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Not client-visible data — a live split of your income into tax, expenses, and take-home, plus
          buffer savings goals. Tax is estimated from real Xero + Spider-Fawcett OS year-to-date income
          run through NZ&apos;s actual bracket rates, not a flat percentage.{" "}
          <Link href="/finance/personal/history" style={{ color: "var(--gh-accent)" }}>Past periods →</Link>
        </p>
      </div>

      <OwnersCutCalculator
        liveIncomeNzd={liveIncomeNzd}
        businessExpensesMonthlyNzd={businessExpensesMonthlyNzd}
        businessExpensesWriteoffMonthlyNzd={businessExpensesWriteoffMonthlyNzd}
        devCostsMonthlyNzd={devCostsMonthlyNzd}
        xeroYtdPriorNzd={xeroYtdPriorNzd}
        xeroConnected={xeroConnection !== null}
        spiderFawcettYtdNzd={spiderFawcettYtdNzd}
      />

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Recurring dev / contractor costs</p>
        <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
          Standing splits paid out of client revenue — e.g. Yuvi&apos;s cut of a client&apos;s fee — subtracted
          every month automatically, not re-entered.
        </p>
        {devCosts.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>
              {d.payee} — {d.label}
              {d.clientName && <span style={{ color: "var(--gh-text-muted)" }}> ({d.clientName})</span>}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)" }}>
              {money(Number(d.monthlyAmountNzd))}/mo
              <form action={deleteDevCostAction.bind(null, d.id)}>
                <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-micro)", padding: "var(--gh-space-1) var(--gh-space-2)" }}>
                  Remove
                </SubmitButton>
              </form>
            </span>
          </div>
        ))}
        {devCosts.length === 0 && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>None logged yet.</p>}
        <form action={createDevCostAction} style={{ display: "flex", gap: "var(--gh-space-2)" }}>
          <input className="gh-input" name="payee" placeholder="Paid to (e.g. Yuvi)" required style={{ flex: 1 }} />
          <input className="gh-input" name="label" placeholder="e.g. DM Rider subscription split" required style={{ flex: 2 }} />
          <input className="gh-input" name="monthlyAmountNzd" placeholder="$/mo" required style={{ width: 90 }} />
          <SubmitButton>Add</SubmitButton>
        </form>
      </section>
    </div>
  );
}
