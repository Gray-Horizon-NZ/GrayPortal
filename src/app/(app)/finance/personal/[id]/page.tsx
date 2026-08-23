import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { getPeriod, computePeriodFigures, getOverallTaxTotal } from "@/lib/dal/personalFinance";
import { getMonthlyExpenseTotal } from "@/lib/dal/businessExpenses";
import {
  addExpenseItemAction,
  removeExpenseItemAction,
  addContractorPaymentAction,
  removeContractorPaymentAction,
  deletePeriodAction,
} from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import HourlyRateHelper from "./HourlyRateHelper";

function money(n: number) {
  return `$${n.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PersonalFinancePeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const data = await getPeriod(id);
  if (!data) notFound();
  const { period, expenseItems, contractorPayments } = data;

  const [businessExpensesMonthlyNzd, overallTaxTotalNzd] = await Promise.all([
    getMonthlyExpenseTotal(),
    getOverallTaxTotal(),
  ]);

  const figures = computePeriodFigures(period, expenseItems, contractorPayments, businessExpensesMonthlyNzd);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--gh-space-3)" }}>
        <div>
          <Link href="/finance/personal" style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-accent)" }}>← All periods</Link>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", marginTop: "var(--gh-space-2)" }}>{period.label}</h1>
          {period.notes && (
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-1)" }}>{period.notes}</p>
          )}
        </div>
        <form action={deletePeriodAction.bind(null, period.id)}>
          <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Deleting…">Delete period</SubmitButton>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--gh-space-4)" }}>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Gross income</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(Number(period.grossIncomeNzd))}</p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Going to tax ({period.taxReductionPercent}%)</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(figures.taxAmountNzd)}</p>
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
            {money(overallTaxTotalNzd)} set aside overall
          </p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Post-tax cashflow</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(figures.postTaxCashflowNzd)}</p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Monthly expenses</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(figures.totalExpensesNzd)}</p>
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
            incl. {money(businessExpensesMonthlyNzd)} from{" "}
            <Link href="/finance/expenses" style={{ color: "var(--gh-accent)" }}>Business Expenses</Link>
          </p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Contractor payments</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(figures.totalContractorPaymentsNzd)}</p>
        </div>
        <div className="gh-card" style={{ borderTop: "2px solid var(--gh-accent)" }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Take-home pay</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{money(figures.takeHomePayNzd)}</p>
        </div>
      </div>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Buffer minimums (3×/12× expenses)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--gh-space-3)", fontSize: "var(--gh-text-sm)" }}>
          <div>
            <p style={{ color: "var(--gh-text-muted)" }}>3-month minimum</p>
            <p style={{ fontWeight: 500 }}>{money(figures.threeMonthBufferMinimumNzd)}</p>
          </div>
          <div>
            <p style={{ color: "var(--gh-text-muted)" }}>12-month minimum</p>
            <p style={{ fontWeight: 500 }}>{money(figures.twelveMonthBufferMinimumNzd)}</p>
          </div>
        </div>

        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>
            Additional financial security goals
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--gh-space-3)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-3)" }}>
            {figures.threeMonthBufferAtTargetDrawNzd != null ? (
              <>
                <div>
                  <p style={{ color: "var(--gh-text-muted)" }}>3-month (at target weekly draw)</p>
                  <p style={{ fontWeight: 500 }}>{money(figures.threeMonthBufferAtTargetDrawNzd)}</p>
                </div>
                <div>
                  <p style={{ color: "var(--gh-text-muted)" }}>12-month (at target weekly draw)</p>
                  <p style={{ fontWeight: 500 }}>{money(figures.twelveMonthBufferAtTargetDrawNzd ?? 0)}</p>
                </div>
              </>
            ) : (
              <p style={{ color: "var(--gh-text-muted)" }}>Set a target weekly draw on this period to see these.</p>
            )}
          </div>
          {period.targetWeeklyDrawNzd != null && (
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", lineHeight: 1.5, marginTop: "var(--gh-space-3)" }}>
              (Monthly expenses + ${period.targetWeeklyDrawNzd}/week × 4) × months.
            </p>
          )}
        </details>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Expenses</p>
        {expenseItems.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{e.label}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)" }}>
              {money(Number(e.amountNzd))}
              <form action={removeExpenseItemAction.bind(null, e.id, period.id)}>
                <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-micro)", padding: "var(--gh-space-1) var(--gh-space-2)" }}>
                  Remove
                </SubmitButton>
              </form>
            </span>
          </div>
        ))}
        {expenseItems.length === 0 && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No expenses logged yet.</p>}
        <form action={addExpenseItemAction.bind(null, period.id)} style={{ display: "flex", gap: "var(--gh-space-2)" }}>
          <input className="gh-input" name="label" placeholder="Expense name" required style={{ flex: 2 }} />
          <input className="gh-input" name="amountNzd" placeholder="Amount (NZD)" required style={{ flex: 1 }} />
          <SubmitButton>Add</SubmitButton>
        </form>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Contractor payments</p>
        {contractorPayments.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>
              {c.payee}
              {c.note && <span style={{ color: "var(--gh-text-muted)" }}> — {c.note}</span>}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)" }}>
              {money(Number(c.amountNzd))}
              <form action={removeContractorPaymentAction.bind(null, c.id, period.id)}>
                <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-micro)", padding: "var(--gh-space-1) var(--gh-space-2)" }}>
                  Remove
                </SubmitButton>
              </form>
            </span>
          </div>
        ))}
        {contractorPayments.length === 0 && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>None logged yet.</p>}
        <form action={addContractorPaymentAction.bind(null, period.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
            <input className="gh-input" name="payee" placeholder="Paid to (e.g. Yuvi)" required style={{ flex: 1 }} />
            <input className="gh-input" name="note" placeholder="Note (e.g. Dugal job)" style={{ flex: 1 }} />
          </div>
          <HourlyRateHelper />
          <SubmitButton>Add</SubmitButton>
        </form>
      </section>
    </div>
  );
}
