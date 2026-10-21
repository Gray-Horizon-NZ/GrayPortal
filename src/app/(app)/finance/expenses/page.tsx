import { redirect } from "next/navigation";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { getCaller } from "@/lib/dal/auth";
import { listBusinessExpenses } from "@/lib/dal/businessExpenses";
import { createBusinessExpenseAction, updateBusinessExpenseAction, deleteBusinessExpenseAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

function money(v: string | null) {
  return v ? `$${Number(v).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
}

// Business software/tool cost tracker — mirrors Max's Notion "Business
// Expenses" table (category, yearly/monthly, write-off flag, GST). Feeds
// /finance/personal's monthly-expenses figure as a live total.
export default async function BusinessExpensesPage() {
  const caller = await getCaller();
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
  const writeoffs = items.filter((i) => i.isWriteoff).length;

  return (
    <div className="gh-term-page" style={{ maxWidth: 1200 }}>
      <PageHead
        title="Business expenses"
        sub={
          <>
            Recurring software/tool costs and whether they&apos;re a write-off. Feeds{" "}
            <Link href="/finance/personal" className="gh-term-link">Owner&apos;s Cut</Link>&apos;s monthly expense figure.
          </>
        }
      />

      <div className="gh-term-split">
        <div>
          <p className="k">Monthly</p>
          <p className="v">{money(totals.monthly.toFixed(2))}</p>
          <p className="h">all recurring items</p>
        </div>
        <div>
          <p className="k">Yearly</p>
          <p className="v">{money(totals.yearly.toFixed(2))}</p>
          <p className="h">annual subscriptions</p>
        </div>
        <div>
          <p className="k">Write-offs</p>
          <p className="v">{writeoffs}</p>
          <p className="h">of {items.length} items</p>
        </div>
        <div>
          <p className="k">GST</p>
          <p className="v">{money(totals.gstMonthly.toFixed(2))}</p>
          <p className="h">per month · {money(totals.gstYearly.toFixed(2))}/yr</p>
        </div>
      </div>

      <Panel title="Expenses" icon={Receipt} right={`${items.length} items`} pad={false}>
        <div className="gh-table-wrap" style={{ border: 0 }}>
          <table className="gh-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item</th>
                <th className="gh-table-num">Yearly</th>
                <th className="gh-table-num">Monthly</th>
                <th>Write-off</th>
                <th className="gh-table-num">GST (yr)</th>
                <th className="gh-table-num">GST (mo)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="gh-term-small">{i.category || "—"}</td>
                  <td className="gh-term-strong">{i.label}</td>
                  <td className="gh-table-num">{money(i.yearlyAmountNzd)}</td>
                  <td className="gh-table-num">{money(i.monthlyAmountNzd)}</td>
                  <td>
                    <span className="gh-badge" data-status={i.isWriteoff ? "success" : undefined}>{i.isWriteoff ? "Yes" : "No"}</span>
                  </td>
                  <td className="gh-table-num">{money(i.gstYearlyNzd)}</td>
                  <td className="gh-table-num">{money(i.gstMonthlyNzd)}</td>
                  <td>
                    <details className="gh-term-rowedit">
                      <summary>Edit</summary>
                      <div className="gh-term-rowedit-pop">
                        <form action={updateBusinessExpenseAction.bind(null, i.id)} className="gh-term-form" style={{ marginTop: 0 }}>
                          <input className="gh-input" name="category" defaultValue={i.category ?? ""} placeholder="Category" />
                          <input className="gh-input" name="label" defaultValue={i.label} placeholder="Item" required />
                          <input className="gh-input" name="yearlyAmountNzd" defaultValue={i.yearlyAmountNzd ?? ""} placeholder="Yearly" />
                          <input className="gh-input" name="monthlyAmountNzd" defaultValue={i.monthlyAmountNzd ?? ""} placeholder="Monthly" />
                          <label className="gh-term-check">
                            <input type="checkbox" name="isWriteoff" defaultChecked={i.isWriteoff} /> Write-off
                          </label>
                          <input className="gh-input" name="gstYearlyNzd" defaultValue={i.gstYearlyNzd ?? ""} placeholder="GST (yearly)" />
                          <input className="gh-input" name="gstMonthlyNzd" defaultValue={i.gstMonthlyNzd ?? ""} placeholder="GST (monthly)" />
                          <SubmitButton>Save</SubmitButton>
                        </form>
                        <form action={deleteBusinessExpenseAction.bind(null, i.id)}>
                          <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
                        </form>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="gh-term-small">No expenses logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <details className="gh-card">
        <summary className="gh-eyebrow">Add expense</summary>
        <form action={createBusinessExpenseAction} className="gh-term-form" style={{ maxWidth: 420 }}>
          <input className="gh-input" name="category" placeholder="Category (e.g. Finance, CRM)" />
          <input className="gh-input" name="label" placeholder="Item (e.g. Xero)" required />
          <input className="gh-input" name="yearlyAmountNzd" placeholder="Yearly (NZD)" />
          <input className="gh-input" name="monthlyAmountNzd" placeholder="Monthly (NZD)" />
          <label className="gh-term-check">
            <input type="checkbox" name="isWriteoff" /> Write-off
          </label>
          <input className="gh-input" name="gstYearlyNzd" placeholder="GST (yearly)" />
          <input className="gh-input" name="gstMonthlyNzd" placeholder="GST (monthly)" />
          <SubmitButton>Add expense</SubmitButton>
        </form>
      </details>
    </div>
  );
}
