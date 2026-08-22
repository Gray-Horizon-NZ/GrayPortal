import { redirect } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { listPeriods } from "@/lib/dal/personalFinance";
import { createPeriodAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

// Phase 23 — Max's own income-split calculator (tax reduction, expenses,
// contractor payments, buffer goals, take-home pay). Deliberately separate
// from /finance, which is client/business Xero data — this has no client
// in it at all.
export default async function PersonalFinancePage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const periods = await listPeriods();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Personal Finance</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Not connected to Xero or client data — a period-by-period split of your own income into
          tax, expenses, contractor payments, and take-home pay, plus buffer savings goals.
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
