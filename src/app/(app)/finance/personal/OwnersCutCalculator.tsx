"use client";
import { useState } from "react";

function money(n: number) {
  return `$${n.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Fully client-side — every input (income override, tax %, target weekly
 * draw) recalculates instantly with no server round-trip, since none of it
 * needs to be saved; it's a calculator, not a record. The only server-
 * backed pieces are the live income/expenses/dev-cost totals passed in as
 * props and the dev-cost list rendered below this component.
 */
export default function OwnersCutCalculator({
  liveIncomeNzd,
  businessExpensesMonthlyNzd,
  devCostsMonthlyNzd,
}: {
  liveIncomeNzd: number;
  businessExpensesMonthlyNzd: number;
  devCostsMonthlyNzd: number;
}) {
  const [incomeMode, setIncomeMode] = useState<"live" | "manual">("live");
  const [manualIncome, setManualIncome] = useState("");
  const [taxPercent, setTaxPercent] = useState("17.5");
  const [targetWeeklyDraw, setTargetWeeklyDraw] = useState("");

  const income = incomeMode === "live" ? liveIncomeNzd : Number(manualIncome) || 0;
  const taxFraction = (Number(taxPercent) || 0) / 100;
  const taxAmount = income * taxFraction;
  const postTax = income - taxAmount;
  const totalExpenses = businessExpensesMonthlyNzd + devCostsMonthlyNzd;
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--gh-space-4)" }}>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Gross income</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(income)}</p>
        </div>
        <div className="gh-card">
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>
            Going to tax (
            <input
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              style={{ width: 40, background: "transparent", border: "none", borderBottom: "1px solid var(--gh-border)", color: "inherit", font: "inherit" }}
            />
            %)
          </p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>{money(taxAmount)}</p>
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
