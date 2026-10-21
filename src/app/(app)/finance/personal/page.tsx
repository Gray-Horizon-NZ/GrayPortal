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
import { Users } from "lucide-react";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

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
    <div className="gh-term-page" style={{ maxWidth: 900 }}>
      <PageHead
        title="Owner's cut"
        sub="A live split of your income into tax, expenses and take-home, plus buffer savings goals. Tax uses real Xero + Spider-Fawcett OS year-to-date income through NZ's bracket rates."
      >
        <Link href="/finance/personal/history" className="gh-btn-secondary">Past periods</Link>
      </PageHead>

      <OwnersCutCalculator
        liveIncomeNzd={liveIncomeNzd}
        businessExpensesMonthlyNzd={businessExpensesMonthlyNzd}
        businessExpensesWriteoffMonthlyNzd={businessExpensesWriteoffMonthlyNzd}
        devCostsMonthlyNzd={devCostsMonthlyNzd}
        xeroYtdPriorNzd={xeroYtdPriorNzd}
        xeroConnected={xeroConnection !== null}
        spiderFawcettYtdNzd={spiderFawcettYtdNzd}
      />

      <Panel title="Recurring dev / contractor costs" icon={Users}>
        <p className="gh-term-small" style={{ marginBottom: "var(--gh-space-3)" }}>
          Standing splits paid out of client revenue — e.g. Yuvi&apos;s cut of a client&apos;s fee — subtracted
          every month automatically, not re-entered.
        </p>
        {devCosts.map((d) => (
          <div key={d.id} className="gh-item-row">
            <span>
              {d.payee} — {d.label}
              {d.clientName && <span style={{ color: "var(--gh-text-muted)" }}> ({d.clientName})</span>}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)" }}>
              {money(Number(d.monthlyAmountNzd))}/mo
              <form action={deleteDevCostAction.bind(null, d.id)}>
                <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
              </form>
            </span>
          </div>
        ))}
        {devCosts.length === 0 && <p className="gh-term-muted">None logged yet.</p>}
        <form action={createDevCostAction} className="gh-add-form" style={{ display: "flex", gap: "var(--gh-space-2)", flexWrap: "wrap" }}>
          <input className="gh-input" name="payee" placeholder="Paid to (e.g. Yuvi)" required style={{ flex: 1 }} />
          <input className="gh-input" name="label" placeholder="e.g. DM Rider subscription split" required style={{ flex: 2 }} />
          <input className="gh-input" name="monthlyAmountNzd" placeholder="$/mo" required style={{ width: 90 }} />
          <SubmitButton>Add</SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
