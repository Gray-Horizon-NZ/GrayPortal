import { redirect } from "next/navigation";
import Link from "next/link";
import { getCaller } from "@/lib/dal/auth";
import { listPeriods, getOverallTaxTotal } from "@/lib/dal/personalFinance";
import { createPeriodAction } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { History } from "lucide-react";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

// The old period-by-period income-split records (Phase 23), kept for
// historical reference now that /finance/personal itself is the live
// Owner's Cut Calculator — nothing here was deleted in that redesign, it
// just moved one level in.
export default async function PersonalFinanceHistoryPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");

  const [periods, overallTaxTotal] = await Promise.all([listPeriods(), getOverallTaxTotal()]);

  return (
    <div className="gh-term-page" style={{ maxWidth: 900 }}>
      <Link href="/finance/personal" className="gh-term-backlink">← Owner&apos;s cut</Link>
      <PageHead
        title="Past periods"
        sub="Historical income-split snapshots — gross income, tax, expenses and contractor payments per period. Kept for reference; the live calculator doesn't need them."
      />

      <div className="gh-term-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <p className="k">Set aside for tax</p>
          <p className="v">${overallTaxTotal.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="h">across all periods</p>
        </div>
        <div>
          <p className="k">Periods</p>
          <p className="v">{periods.length}</p>
          <p className="h">logged</p>
        </div>
      </div>

      <Panel title="Periods" icon={History} pad={periods.length === 0}>
        {periods.length === 0 ? (
          <p className="gh-term-muted">No periods logged yet.</p>
        ) : (
          <div className="gh-term-rows">
            {periods.map((p) => (
              <Link key={p.id} href={`/finance/personal/${p.id}`} className="gh-term-row">
                <span className="gh-term-strong">{p.label}</span>
                <span className="gh-term-small" style={{ marginLeft: "auto" }}>
                  Gross ${Number(p.grossIncomeNzd).toLocaleString("en-NZ")} · {p.taxReductionPercent}% tax
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <details className="gh-card">
        <summary className="gh-eyebrow">New period</summary>
        <form action={createPeriodAction} className="gh-term-form">
          <input className="gh-input" name="label" placeholder="Period label (e.g. March 2026)" required />
          <input className="gh-input" name="grossIncomeNzd" placeholder="Gross income (NZD)" required />
          <input className="gh-input" name="taxReductionPercent" placeholder="Tax reduction % (default 17.5)" />
          <input className="gh-input" name="targetWeeklyDrawNzd" placeholder="Target weekly draw (NZD, optional)" />
          <textarea className="gh-input" name="notes" placeholder="Notes (optional)" rows={2} />
          <SubmitButton>Create period</SubmitButton>
        </form>
      </details>
    </div>
  );
}
