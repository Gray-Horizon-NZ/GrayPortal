import { redirect } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { listBusinessExpenses } from "@/lib/dal/businessExpenses";
import { createBusinessExpenseAction, updateBusinessExpenseAction, deleteBusinessExpenseAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

function money(v: string | null) {
  return v ? `$${Number(v).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
}

// Business software/tool cost tracker — mirrors Max's Notion "Business
// Expenses" table (category, yearly/monthly, write-off flag, GST). Feeds
// /finance/personal's monthly-expenses figure as a live total.
export default async function BusinessExpensesPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const items = await listBusinessExpenses();
  const totals = items.reduce(
    (acc, i) => ({
      yearly: acc.yearly + Number(i.yearlyAmountNzd ?? 0),
      monthly: acc.monthly + Number(i.monthlyAmountNzd ?? 0),
      gstYearly: acc.gstYearly + Number(i.gstYearlyNzd ?? 0),
      gstMonthly: acc.gstMonthly + Number(i.gstMonthlyNzd ?? 0),
    }),
    { yearly: 0, monthly: 0, gstYearly: 0, gstMonthly: 0 }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 1000 }}>
      <div>
        <p className="gh-eyebrow">Internal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Business Expenses</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Recurring software/tool costs and whether they&apos;re a write-off. Feeds{" "}
          <Link href="/finance/personal" style={{ color: "var(--gh-accent)" }}>Personal Finance</Link>&apos;s monthly expense figure.
        </p>
      </div>

      <section style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--gh-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--gh-border)", textAlign: "left" }}>
              <th style={{ padding: "var(--gh-space-2)" }}>Category</th>
              <th style={{ padding: "var(--gh-space-2)" }}>Item</th>
              <th style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>Yearly</th>
              <th style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>Monthly</th>
              <th style={{ padding: "var(--gh-space-2)", textAlign: "center" }}>Write-off</th>
              <th style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>GST (yr)</th>
              <th style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>GST (mo)</th>
              <th style={{ padding: "var(--gh-space-2)" }} />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} style={{ borderBottom: "1px solid var(--gh-border)" }}>
                <td style={{ padding: "var(--gh-space-2)", fontWeight: 500 }}>{i.category || "—"}</td>
                <td style={{ padding: "var(--gh-space-2)" }}>{i.label}</td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(i.yearlyAmountNzd)}</td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(i.monthlyAmountNzd)}</td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "center" }}>
                  <span className="gh-badge" data-status={i.isWriteoff ? "success" : "danger"}>{i.isWriteoff ? "Yes" : "No"}</span>
                </td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(i.gstYearlyNzd)}</td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(i.gstMonthlyNzd)}</td>
                <td style={{ padding: "var(--gh-space-2)" }}>
                  <details>
                    <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Edit</summary>
                    <form
                      action={updateBusinessExpenseAction.bind(null, i.id)}
                      style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)", minWidth: 220 }}
                    >
                      <input className="gh-input" name="category" defaultValue={i.category ?? ""} placeholder="Category" />
                      <input className="gh-input" name="label" defaultValue={i.label} placeholder="Item" required />
                      <input className="gh-input" name="yearlyAmountNzd" defaultValue={i.yearlyAmountNzd ?? ""} placeholder="Yearly" />
                      <input className="gh-input" name="monthlyAmountNzd" defaultValue={i.monthlyAmountNzd ?? ""} placeholder="Monthly" />
                      <label style={{ fontSize: "var(--gh-text-sm)" }}>
                        <input type="checkbox" name="isWriteoff" defaultChecked={i.isWriteoff} /> Write-off
                      </label>
                      <input className="gh-input" name="gstYearlyNzd" defaultValue={i.gstYearlyNzd ?? ""} placeholder="GST (yearly)" />
                      <input className="gh-input" name="gstMonthlyNzd" defaultValue={i.gstMonthlyNzd ?? ""} placeholder="GST (monthly)" />
                      <SubmitButton>Save</SubmitButton>
                    </form>
                    <form action={deleteBusinessExpenseAction.bind(null, i.id)} style={{ marginTop: "var(--gh-space-2)" }}>
                      <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-micro)" }}>
                        Remove
                      </SubmitButton>
                    </form>
                  </details>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "var(--gh-space-4)", color: "var(--gh-text-muted)" }}>No expenses logged yet.</td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 600 }}>
                <td style={{ padding: "var(--gh-space-2)" }} colSpan={2}>Total</td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(totals.yearly.toFixed(2))}</td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(totals.monthly.toFixed(2))}</td>
                <td />
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(totals.gstYearly.toFixed(2))}</td>
                <td style={{ padding: "var(--gh-space-2)", textAlign: "right" }}>{money(totals.gstMonthly.toFixed(2))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Add expense</p>
        <form action={createBusinessExpenseAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", maxWidth: 400 }}>
          <input className="gh-input" name="category" placeholder="Category (e.g. Finance, CRM)" />
          <input className="gh-input" name="label" placeholder="Item (e.g. Xero)" required />
          <input className="gh-input" name="yearlyAmountNzd" placeholder="Yearly (NZD)" />
          <input className="gh-input" name="monthlyAmountNzd" placeholder="Monthly (NZD)" />
          <label style={{ fontSize: "var(--gh-text-sm)" }}>
            <input type="checkbox" name="isWriteoff" /> Write-off
          </label>
          <input className="gh-input" name="gstYearlyNzd" placeholder="GST (yearly)" />
          <input className="gh-input" name="gstMonthlyNzd" placeholder="GST (monthly)" />
          <SubmitButton>Add expense</SubmitButton>
        </form>
      </section>
    </div>
  );
}
