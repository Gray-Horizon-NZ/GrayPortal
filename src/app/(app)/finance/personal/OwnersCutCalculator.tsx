"use client";
import { useState } from "react";
import { estimateMonthlySetAsideFromYtd } from "@/lib/nzTax";

function money(n: number) {
  return `$${n.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Fully client-side — every input (income override, other-income YTD,
 * target weekly draw) recalculates instantly with no server round-trip,
 * since none of it needs to be saved; it's a calculator, not a record. The
 * only server-backed pieces are the live income/expenses/dev-cost/Xero
 * totals passed in as props and the dev-cost list rendered below this
 * component.
 *
 * Tax is NZ's progressive brackets + ACC earner's levy (lib/nzTax.ts),
 * applied as the *marginal* amount on top of a real year-to-date cumulative
 * figure — not a flat percentage of gross, and not a single month
 * annualized in isolation. The brackets are annual and apply to Max's
 * combined personal income across every income source, which is why
 * xeroYtdPriorNzd (Gray Horizon, via lib/dal/xero.ts) and
 * spiderFawcettYtdNzd (the party-performance business, via a live read of
 * its own separate app — lib/spiderFawcett.ts) both feed the cumulative
 * figure, with otherYtdIncome as a manual catch-all for anything not wired
 * up yet. Every dollar of deductible expense lowers the tax bill too, not
 * just the cash left over.
 */
export default function OwnersCutCalculator({
  liveIncomeNzd,
  businessExpensesMonthlyNzd,
  businessExpensesWriteoffMonthlyNzd,
  devCostsMonthlyNzd,
  xeroYtdPriorNzd,
  xeroConnected,
  spiderFawcettYtdNzd,
}: {
  liveIncomeNzd: number;
  businessExpensesMonthlyNzd: number;
  businessExpensesWriteoffMonthlyNzd: number;
  devCostsMonthlyNzd: number;
  xeroYtdPriorNzd: number;
  xeroConnected: boolean;
  spiderFawcettYtdNzd: number | null;
}) {
  const [incomeMode, setIncomeMode] = useState<"live" | "manual">("live");
  const [manualIncome, setManualIncome] = useState("");
  const [otherYtdIncome, setOtherYtdIncome] = useState("");
  const [targetWeeklyDraw, setTargetWeeklyDraw] = useState("");

  const income = incomeMode === "live" ? liveIncomeNzd : Number(manualIncome) || 0;
  const totalExpenses = businessExpensesMonthlyNzd + devCostsMonthlyNzd;
  const deductibleExpenses = businessExpensesWriteoffMonthlyNzd + devCostsMonthlyNzd;
  const taxableIncome = Math.max(income - deductibleExpenses, 0);
  const ytdTaxableBeforeThisMonth =
    xeroYtdPriorNzd + (spiderFawcettYtdNzd ?? 0) + (Number(otherYtdIncome) || 0);
  const setAside = estimateMonthlySetAsideFromYtd(taxableIncome, ytdTaxableBeforeThisMonth);
  const taxAmount = setAside.totalNzd;
  const postTax = income - taxAmount;
  const ownersCut = postTax - totalExpenses;

  const threeMonthMin = totalExpenses * 3;
  const twelveMonthMin = totalExpenses * 12;

  const weeklyDraw = Number(targetWeeklyDraw) || 0;
  const monthlyAtTargetDraw = totalExpenses + weeklyDraw * 4;
  const threeMonthAtTargetDraw = monthlyAtTargetDraw * 3;
  const twelveMonthAtTargetDraw = monthlyAtTargetDraw * 12;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Monthly income</p>
        <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
          <button
            type="button"
            className="gh-btn-secondary"
            style={incomeMode === "live" ? { background: "var(--gh-surface-raised)" } : undefined}
            onClick={() => setIncomeMode("live")}
          >
            Live ({money(liveIncomeNzd)})
          </button>
          <button
            type="button"
            className="gh-btn-secondary"
            style={incomeMode === "manual" ? { background: "var(--gh-surface-raised)" } : undefined}
            onClick={() => setIncomeMode("manual")}
          >
            Manual value
          </button>
        </div>
        {incomeMode === "manual" && (
          <input
            className="gh-input"
            placeholder="Gross monthly income (NZD)"
            value={manualIncome}
            onChange={(e) => setManualIncome(e.target.value)}
          />
        )}
        <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
          {incomeMode === "live"
            ? "Pulled live from your active client services — same total as the dashboard's MRR card."
            : "Overriding the live figure for a what-if calculation."}
        </p>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Tax-year-to-date position</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-sm)" }}>
          <p>
            {xeroConnected ? (
              <>{money(xeroYtdPriorNzd)} paid on Gray Horizon invoices so far this tax year (Xero), before this month.</>
            ) : (
              <span style={{ color: "var(--gh-danger)" }}>
                Xero isn&apos;t connected — counting $0 from Gray Horizon for prior months.
              </span>
            )}
          </p>
          <p>
            {spiderFawcettYtdNzd !== null ? (
              <>{money(spiderFawcettYtdNzd)} paid so far this tax year via Spider-Fawcett OS.</>
            ) : (
              <span style={{ color: "var(--gh-danger)" }}>
                Spider-Fawcett OS isn&apos;t reachable right now — counting $0 from it; check the manual figure
                below covers it.
              </span>
            )}
          </p>
        </div>
        <input
          className="gh-input"
          placeholder="Other taxable income already earned this tax year (anything not wired up above)"
          value={otherYtdIncome}
          onChange={(e) => setOtherYtdIncome(e.target.value)}
        />
        <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
          NZ brackets apply to your combined personal income, not per business — even income you tax
          separately still pushes this month&apos;s marginal rate up. Cumulative taxable income before
          this month: {money(ytdTaxableBeforeThisMonth)}.
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--gh-space-4)" }}>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Gross income</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(income)}</p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>
            Going to tax ({(setAside.effectiveRate * 100).toFixed(1)}%)
          </p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(taxAmount)}</p>
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
            {money(setAside.incomeTaxNzd)} income tax + {money(setAside.accLevyNzd)} ACC levy, marginal on{" "}
            {money(taxableIncome)} taxable this month, stacked on {money(ytdTaxableBeforeThisMonth)} already earned this tax year
          </p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Post-tax sum</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(postTax)}</p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Monthly expenses</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(totalExpenses)}</p>
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
            {money(businessExpensesMonthlyNzd)} business + {money(devCostsMonthlyNzd)} dev costs
            ({money(deductibleExpenses)} of it deductible)
          </p>
        </div>
        <div className="gh-card" style={{ borderTop: "2px solid var(--gh-accent)", gridColumn: "1 / -1" }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Owner&apos;s cut</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{money(ownersCut)}</p>
        </div>
      </div>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Buffer minimums (3×/12× monthly expenses)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--gh-space-3)", fontSize: "var(--gh-text-sm)" }}>
          <div>
            <p style={{ color: "var(--gh-text-muted)" }}>3-month minimum</p>
            <p style={{ fontWeight: 500 }}>{money(threeMonthMin)}</p>
          </div>
          <div>
            <p style={{ color: "var(--gh-text-muted)" }}>12-month minimum</p>
            <p style={{ fontWeight: 500 }}>{money(twelveMonthMin)}</p>
          </div>
        </div>

        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>
            Additional financial security goals
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-3)" }}>
            <input
              className="gh-input"
              placeholder="Target weekly draw (NZD)"
              value={targetWeeklyDraw}
              onChange={(e) => setTargetWeeklyDraw(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--gh-space-3)", fontSize: "var(--gh-text-sm)" }}>
              <div>
                <p style={{ color: "var(--gh-text-muted)" }}>3-month (at target weekly draw)</p>
                <p style={{ fontWeight: 500 }}>{money(threeMonthAtTargetDraw)}</p>
              </div>
              <div>
                <p style={{ color: "var(--gh-text-muted)" }}>12-month (at target weekly draw)</p>
                <p style={{ fontWeight: 500 }}>{money(twelveMonthAtTargetDraw)}</p>
              </div>
            </div>
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", lineHeight: 1.5 }}>
              (Monthly expenses + ${weeklyDraw || 0}/week × 4) × months.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
