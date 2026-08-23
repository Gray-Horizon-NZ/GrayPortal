import { redirect } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { listPeriods, getOverallTaxTotal } from "@/lib/dal/personalFinance";
import { createPeriodAction } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";

// The old period-by-period income-split records (Phase 23), kept for
// historical reference now that /finance/personal itself is the live
// Owner's Cut Calculator — nothing here was deleted in that redesign, it
// just moved one level in.
export default async function PersonalFinanceHistoryPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const [periods, overallTaxTotal] = await Promise.all([listPeriods(), getOverallTaxTotal()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <Link href="/finance/personal" style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-accent)" }}>← Owner&apos;s Cut Calculator</Link>
        <p className="gh-eyebrow" style={{ marginTop: "var(--gh-space-2)" }}>Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Past Periods</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Historical income-split snapshots — each one a manual record of gross income, tax, expenses,
          and contractor payments for that period. The live calculator no longer needs these created
          each month, but they stay here for reference.
        </p>
      </div>

      <div className="gh-card" style={{ maxWidth: 260 }}>
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Set aside for tax, overall</p>
        <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
          ${overallTaxTotal.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {periods.map((p) => (
          <Link
            key={p.id}
            href={`/finance/personal/${p.id}`}
            className="gh-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontWeight: 500 }}>{p.label}</span>
            <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              Gross ${Number(p.grossIncomeNzd).toLocaleString("en-NZ")} · {p.taxReductionPercent}% tax
            </span>
          </Link>
        ))}
        {periods.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No periods logged yet.</p>}
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">New period</p>
        <form action={createPeriodAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <input className="gh-input" name="label" placeholder="Period label (e.g. March 2026)" required />
          <input className="gh-input" name="grossIncomeNzd" placeholder="Gross income (NZD)" required />
          <input className="gh-input" name="taxReductionPercent" placeholder="Tax reduction % (default 17.5)" />
          <input className="gh-input" name="targetWeeklyDrawNzd" placeholder="Target weekly draw (NZD, optional)" />
          <textarea className="gh-input" name="notes" placeholder="Notes (optional)" rows={2} />
          <SubmitButton>Create period</SubmitButton>
        </form>
      </section>
    </div>
  );
}
