"use client";
// Port of the terminal concept's Finance screens (OS/GrayPortal/terminal-concepts/grayportal-terminal-
// concept/src/screens/Finance.jsx): Finance, Owner's Cut and Expenses.
// Markup unchanged; real data from the store. Differences:
// - dates/periods are real (the concept was fixed at October 2026, FY27);
// - contractor costs are the real recurring dev-cost splits;
// - Owner's Cut tax is the live NZ-bracket calculation (lib/nzTax.ts), not a
//   flat percentage — Max's choice, 22 Oct;
// - the Ads runway panel gains an Edit pop-up so the budget and spend can
//   actually be entered (the concept had no way to);
// - Owner's Cut gains a single-payment tax calculator, since gross only
//   counts retainers and one-off client payments had no way in.
import { useState } from "react";
import { BarChart3, CalendarCheck, Megaphone, Receipt, Info, Plus, Wallet, History, PiggyBank, Coins, Download, ShoppingBag, Pencil, Users, Calculator } from "lucide-react";
import { useStore } from "../store";
import { TODAY, money, fmtDate } from "../format";
import { PageHead, Panel, Priv, KV, Badge, Stat, Seg, Modal, go, downloadCsv } from "../ui";
import { StackedColumns, Legend, RunwayChart, Bullet } from "../charts";
import { estimateMonthlySetAsideFromYtd } from "@/lib/nzTax";
import { tLogAdsSpend, tSetAdsBudget } from "../actions";
import { createBusinessExpenseAction } from "@/app/(app)/finance/expenses/actions";
import { createDevCostAction, deleteDevCostAction } from "@/app/(app)/finance/personal/actions";

// NZ financial year: 1 April – 31 March, labelled by the year it ends in.
const FY_START = Number(TODAY.slice(5, 7)) >= 4 ? `${TODAY.slice(0, 4)}-04-01` : `${Number(TODAY.slice(0, 4)) - 1}-04-01`;
const FY_LABEL = `FY${String(Number(FY_START.slice(0, 4)) + 1).slice(2)}`;
const FY_MONTHS = (Number(TODAY.slice(0, 4)) - Number(FY_START.slice(0, 4))) * 12 + Number(TODAY.slice(5, 7)) - 3;
const MONTH = new Date(`${TODAY.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-NZ", { month: "long" });
const FY_RANGE = `Apr–${new Date(`${TODAY.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-NZ", { month: "short" })}`;

function expenseRows(expenses, expenseBudgets, purchases = []) {
  const byCat = {};
  expenses.forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + (e.monthly || e.yearly / 12);
  });
  // One-off purchases are spread over 12 months for the budget view.
  purchases.forEach((p) => {
    byCat[p.category] = (byCat[p.category] || 0) + p.amount / 12;
  });
  return Object.entries(expenseBudgets).map(([label, target]) => ({ label, actual: byCat[label] || 0, target }));
}

const xeroBadge = (status) =>
  status === "PAID" ? <Badge tone="good">Paid</Badge> : status ? <Badge>Awaiting payment</Badge> : <Badge tone="warn">Not raised</Badge>;

export function Finance() {
  const { billing, oneOffs, clients, purchases, incomeByMonth, ads, expenses, expenseBudgets, contractorMonthly } = useStore();
  const [editAds, setEditAds] = useState(false);

  const fyMonths = incomeByMonth.slice(-FY_MONTHS);
  const recurringFy = fyMonths.reduce((a, m) => a + m.recurring, 0);
  const oneOffFy = fyMonths.reduce((a, m) => a + m.oneoff, 0);
  const earnings = recurringFy + oneOffFy;
  const invoiceCount = clients.reduce((a, c) => a + c.invoices.filter((i) => i.date >= FY_START).length, 0);
  const invoiced = billing.filter((b) => b.invoice).reduce((a, b) => a + b.amount, 0);
  const paid = billing.filter((b) => b.xero === "PAID").reduce((a, b) => a + b.amount, 0);
  // Every recurring expense plus one-off purchases spread over 12 months.
  const monthlyExpenses = expenses.reduce((a, e) => a + (e.monthly || e.yearly / 12), 0) + purchases.reduce((a, p) => a + p.amount / 12, 0);
  const contractorFy = contractorMonthly * FY_MONTHS;
  const adsLeft = ads.budget - ads.spend[ads.spend.length - 1].amount;
  const fundedThrough = new Date(`${TODAY}T00:00:00`);
  fundedThrough.setDate(fundedThrough.getDate() + Math.round((ads.monthly ? adsLeft / ads.monthly : 0) * 30.4));

  const exportIncome = () =>
    downloadCsv(
      `gray-horizon-income-${FY_LABEL}.csv`,
      ["Date", "Client", "Type", "Description", "Xero invoice", "Amount (NZD)", "Status"],
      [
        ...clients.flatMap((c) => c.invoices.filter((i) => i.date >= FY_START).map((i) => [i.date, c.name, "Invoice", "Retainer / services", i.num, i.total, i.status === "PAID" ? "Paid" : "Awaiting"])),
        ...oneOffs.filter((p) => p.date >= FY_START).map((p) => [p.date, p.client, "One-off", p.label, p.invoice || "", p.amount, p.status === "paid" ? "Paid" : "Awaiting"]),
      ],
    );

  return (
    <div className="screen">
      <PageHead title="Finance" sub="Invoice status comes from Xero (read-only)">
        <button className="btn" onClick={exportIncome}><Download size={14} /> Export income CSV</button>
        <button className="btn" onClick={() => go("/finance/expenses")}>Expenses →</button>
      </PageHead>

      <section className="panel">
        <div className="split" style={{ "--n": 4 }}>
          <div><div className="k">Total earnings</div><div className="v"><Priv>{money(earnings)}</Priv></div><div className="h">{FY_LABEL} to date · {FY_RANGE}</div></div>
          <div><div className="k">Recurring</div><div className="v"><Priv>{money(recurringFy)}</Priv></div><div className="h">{earnings ? Math.round((recurringFy / earnings) * 100) : 0}% of earnings</div></div>
          <div><div className="k">One-off & setup</div><div className="v"><Priv>{money(oneOffFy)}</Priv></div><div className="h">{earnings ? Math.round((oneOffFy / earnings) * 100) : 0}% of earnings</div></div>
          <div><div className="k">Invoices raised</div><div className="v">{invoiceCount}</div><div className="h">synced from Xero</div></div>
        </div>
      </section>

      <div className="grid g-lead">
        <Panel title="Income by month" icon={BarChart3} right={<Legend items={[["Recurring", "c1"], ["One-off & setup", "c2"]]} />}>
          <StackedColumns
            data={incomeByMonth.map((m) => ({ label: m.m.split(" ")[0], recurring: m.recurring, oneoff: m.oneoff }))}
            series={[{ key: "recurring", label: "Recurring", cls: "c1" }, { key: "oneoff", label: "One-off & setup", cls: "c2" }]}
            height={220}
            ariaLabel="Income by month, last 12 months"
          />
        </Panel>
        <Panel title="Earnings breakdown" icon={Coins} right={`${FY_LABEL} to date`}>
          <KV
            rows={[
              ["Recurring income", money(recurringFy), null, true],
              ["One-off & setup income", money(oneOffFy), null, true],
              ["Business expenses", `− ${money(monthlyExpenses * FY_MONTHS)}`, null, true],
              ["Contractor costs", `− ${money(contractorFy)}`, null, true],
              ["Net before tax", money(earnings - monthlyExpenses * FY_MONTHS - contractorFy), "good", true],
            ]}
          />
          <button className="cta" data-variant="ghost" style={{ marginTop: 14 }} onClick={() => go("/finance/owners-cut")}>
            Owner&apos;s Cut calculator <small>→</small>
          </button>
        </Panel>
      </div>

      <div className="grid g-2">
        <Panel title={`Retainer invoices · ${MONTH}`} icon={CalendarCheck} pad={false} right={<span>Paid <b className="strong"><Priv>{money(paid)}</Priv></b> of <Priv>{money(invoiced)}</Priv></span>}>
          <table className="table">
            <thead><tr><th>Client</th><th>Invoice</th><th>Due</th><th className="num">Amount</th><th>Xero</th></tr></thead>
            <tbody>
              {billing.map((b) => (
                <tr key={b.id} data-click onClick={() => go(`/clients/${b.clientId}`)}>
                  <td className="strong">{b.client}</td>
                  <td className="mono">{b.invoice || "—"}</td>
                  <td className="nowrap">{fmtDate(b.due)}</td>
                  <td className="num"><Priv>{money(b.amount)}</Priv></td>
                  <td>{xeroBadge(b.xero)}</td>
                </tr>
              ))}
              {billing.length === 0 && <tr><td colSpan={5} className="muted">No retainer invoices this month.</td></tr>}
            </tbody>
          </table>
        </Panel>
        <Panel title="One-off & setup payments" icon={Receipt} pad={false} right="Recorded on client profiles">
          <table className="table">
            <thead><tr><th>Date</th><th>Client</th><th>For</th><th className="num">Amount</th><th>Xero</th></tr></thead>
            <tbody>
              {oneOffs.map((p) => (
                <tr key={p.id} data-click onClick={() => go(`/clients/${p.clientId}`)}>
                  <td className="nowrap">{fmtDate(p.date)}</td>
                  <td className="strong">{p.client}</td>
                  <td>{p.label}</td>
                  <td className="num"><Priv>{money(p.amount, 2)}</Priv></td>
                  <td>{xeroBadge(p.status === "paid" ? "PAID" : p.invoice ? "AUTHORISED" : null)}</td>
                </tr>
              ))}
              {oneOffs.length === 0 && <tr><td colSpan={5} className="muted">None yet — record them on a client&apos;s Commercial tab.</td></tr>}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid g-2">
        <Panel
          title="Ads runway"
          icon={Megaphone}
          right={
            <>
              <Legend items={[["Actual", "c1"], ["Plan", "c3"]]} />
              <button className="btn btn-sm" onClick={() => setEditAds(true)}><Pencil size={12} /> Edit</button>
            </>
          }
        >
          {ads.isSet ? (
            <>
              <div className="row" style={{ gap: 24, marginBottom: 10 }}>
                <span><span className="eyebrow">Left</span><br /><b className="strong" style={{ fontSize: 20 }}><Priv>{money(adsLeft)}</Priv></b></span>
                <span><span className="eyebrow">Runway</span><br /><b className="strong" style={{ fontSize: 20 }}>{(adsLeft / ads.monthly).toFixed(1)} months</b></span>
                <span><span className="eyebrow">Funded through</span><br /><b className="strong" style={{ fontSize: 20 }}>{fundedThrough.toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}</b></span>
              </div>
              <RunwayChart budget={ads.budget} monthly={ads.monthly} spend={ads.spend} startedOn={ads.startedOn} today={TODAY} />
              <p className="muted small">Each marker is one month of budget at <Priv>{money(ads.monthly)}</Priv>/mo.</p>
            </>
          ) : (
            <p className="muted small">No ads budget set yet — use Edit to enter the budget and monthly spend.</p>
          )}
        </Panel>
        <Panel title="Expenses vs budget" icon={Wallet} right={<button className="linkbtn" onClick={() => go("/finance/expenses")}>All expenses →</button>}>
          <p className="muted small" style={{ marginBottom: 14 }}>Monthly, by category. Solid bar is actual, outlined bar the budget, tick the limit. One-off purchases are spread over 12 months.</p>
          {Object.keys(expenseBudgets).length === 0 ? (
            <p className="muted small">No budgets set yet — add them in Settings.</p>
          ) : (
            <Bullet rows={expenseRows(expenses, expenseBudgets, purchases)} />
          )}
        </Panel>
      </div>

      <AdsEditor open={editAds} onClose={() => setEditAds(false)} ads={ads} />
    </div>
  );
}

function AdsEditor({ open, onClose, ads }) {
  const [budget, setBudget] = useState({ budget: ads.budget || "", monthly: ads.monthly || "", startedOn: ads.startedOn });
  const [spend, setSpend] = useState({ date: TODAY, amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Ads runway">
      <form
        className="stack"
        style={{ gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          run(() => tSetAdsBudget({ budget: Number(budget.budget), monthly: Number(budget.monthly), startedOn: budget.startedOn }));
        }}
      >
        <p className="eyebrow">Budget</p>
        <div className="form-grid">
          <label className="field"><span>Total budget</span><input className="input" type="number" min="0" step="0.01" value={budget.budget} onChange={(e) => setBudget({ ...budget, budget: e.target.value })} required /></label>
          <label className="field"><span>Planned monthly spend</span><input className="input" type="number" min="0.01" step="0.01" value={budget.monthly} onChange={(e) => setBudget({ ...budget, monthly: e.target.value })} required /></label>
          <label className="field"><span>Started on</span><input className="input" type="date" value={budget.startedOn} onChange={(e) => setBudget({ ...budget, startedOn: e.target.value })} required /></label>
        </div>
        <button className="btn btn-primary" disabled={busy} style={{ alignSelf: "flex-start" }}>Save budget</button>
      </form>
      <form
        className="stack"
        style={{ gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!(Number(spend.amount) > 0)) return;
          run(async () => {
            await tLogAdsSpend({ date: spend.date, amount: Number(spend.amount), note: spend.note });
            setSpend({ ...spend, amount: "", note: "" });
          });
        }}
      >
        <p className="eyebrow">Log spend</p>
        <div className="form-grid">
          <label className="field"><span>Date</span><input className="input" type="date" value={spend.date} onChange={(e) => setSpend({ ...spend, date: e.target.value })} /></label>
          <label className="field"><span>Amount spent</span><input className="input" type="number" min="0" step="0.01" value={spend.amount} onChange={(e) => setSpend({ ...spend, amount: e.target.value })} placeholder="$" /></label>
        </div>
        <input className="input" value={spend.note} onChange={(e) => setSpend({ ...spend, note: e.target.value })} placeholder="Note (optional)" />
        <button className="btn" disabled={busy || !ads.isSet} style={{ alignSelf: "flex-start" }}><Plus size={14} /> Log spend</button>
      </form>
    </Modal>
  );
}

export function OwnersCut() {
  const { withdrawals, setWithdrawals, owners, oneOffs, prefs, setPref } = useStore();
  const [form, setForm] = useState({ date: TODAY, amount: "", note: "Weekly draw" });
  const [single, setSingle] = useState("");
  const o = owners;
  const month = TODAY.slice(0, 7);
  // Gross is the retainers plus the one-off payments recorded on client
  // profiles this month.
  const monthOneOffs = oneOffs.filter((p) => p.date?.startsWith(month));
  const gross = o.gross + monthOneOffs.reduce((a, p) => a + p.amount, 0);
  // Live tax: NZ brackets + ACC levy on top of real year-to-date income
  // (the same calculation the previous Owner's Cut page used).
  const deductible = o.writeoffExpenses + o.contractorPayments.reduce((a, c) => a + c.amount, 0);
  const setAside = estimateMonthlySetAsideFromYtd(Math.max(gross - deductible, 0), o.ytdPrior);
  const tax = setAside.totalNzd;
  const taxPct = gross > 0 ? Math.round((tax / gross) * 1000) / 10 : 0;
  const exp = o.expenseItems.reduce((a, e) => a + e.amount, 0);
  const contractors = o.contractorPayments.reduce((a, c) => a + c.amount, 0);
  const available = gross - tax - exp - contractors;
  const thisPeriod = withdrawals.filter((w) => w.date.startsWith(month));
  const drawn = thisPeriod.reduce((a, w) => a + w.amount, 0);
  const weeksElapsed = Math.max(1, Math.ceil(Number(TODAY.slice(8, 10)) / 7));
  const targetWeekly = Number(prefs.targetWeekly) || 0;
  // A single payment is taxed at the margin, on top of the year so far and
  // this month's retainers.
  const singleAmount = parseFloat(single) || 0;
  const singleTax = estimateMonthlySetAsideFromYtd(singleAmount, o.ytdPrior + Math.max(gross - deductible, 0)).totalNzd;
  const singlePct = singleAmount > 0 ? Math.round((singleTax / singleAmount) * 1000) / 10 : 0;

  return (
    <div className="screen">
      <PageHead title="Owner's Cut" sub={`${o.period} · entered by hand — the portal can't see your bank account`}>
        <button className="btn" onClick={() => go("/finance/personal/history")}>Past periods →</button>
      </PageHead>
      <div className="grid g-4">
        <Stat label="Available to draw" value={money(available)} sub="after tax, expenses, contractors" accent />
        <Stat label="Drawn this period" value={money(drawn)} sub={`${thisPeriod.length} withdrawals logged`} accent />
        <Stat label="Remaining" value={money(available - drawn)} tone={available - drawn < 0 ? "bad" : "good"} sub="left to draw this period" accent />
        <Stat label="Tax set aside" value={money(tax)} sub={`${taxPct}% of gross · NZ brackets + ACC`} accent />
      </div>
      <div className="grid g-lead">
        <Panel title="Calculation" icon={PiggyBank} right={o.period}>
          <KV
            rows={[
              ["Gross income", money(gross, 2), null, true],
              ...(monthOneOffs.length ? [["Retainers", money(o.gross), "muted", true]] : []),
              ...monthOneOffs.map((p) => [`One-off · ${p.client}`, money(p.amount, 2), "muted", true]),
              [`Tax set-aside (${taxPct}%)`, `− ${money(tax)}`, null, true],
              ...o.expenseItems.map((e) => [e.label, `− ${money(e.amount)}`, "muted", true]),
              ...o.contractorPayments.map((c) => [`Contractor · ${c.payee}`, `− ${money(c.amount)}`, "muted", true]),
              ["Available to draw", money(available), "good", true],
              ["Already withdrawn", `− ${money(drawn)}`, null, true],
              ["Remaining", money(available - drawn), available - drawn < 0 ? "bad" : "good", true],
            ]}
          />
          <p className="muted small" style={{ marginTop: 10 }}>
            Gross is this month&apos;s retainers plus one-off payments recorded on client profiles. Tax is the marginal NZ amount on top of <Priv>{money(o.ytdPrior)}</Priv> earned earlier this tax year (Xero + Spider-Fawcett).
          </p>
        </Panel>
        <div className="stack">
          <Panel title="Weekly draw vs target" icon={Coins}>
            <Bullet rows={[{ label: `${weeksElapsed} week${weeksElapsed === 1 ? "" : "s"}`, actual: drawn, target: targetWeekly * weeksElapsed }]} />
            <p className="muted small row" style={{ marginTop: 10 }}>
              Target
              <input className="input" style={{ width: 90, height: 26 }} type="number" min="0" step="0.01" value={prefs.targetWeekly ?? ""} onChange={(e) => setPref("targetWeekly", e.target.value)} placeholder="$" />
              /week.
            </p>
          </Panel>
          <Panel title="Log a withdrawal" icon={Wallet}>
            <form
              className="stack"
              style={{ gap: 10 }}
              onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat(form.amount);
                if (!(amount > 0)) return;
                setWithdrawals((ws) => [{ id: Date.now(), date: form.date, amount, note: form.note }, ...ws]);
                setForm({ ...form, amount: "" });
              }}
            >
              <div className="form-grid">
                <label className="field"><span>Date</span><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                <label className="field"><span>Amount</span><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="$" /></label>
              </div>
              <label className="field"><span>Note</span><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
              <button className="cta" type="submit">Log withdrawal <small>after you&apos;ve moved the money</small></button>
            </form>
          </Panel>
          <Panel title="Tax on a single payment" icon={Calculator}>
            <label className="field"><span>Payment received</span><input className="input" type="number" min="0" step="0.01" value={single} onChange={(e) => setSingle(e.target.value)} placeholder="$ e.g. a one-off setup fee" /></label>
            {singleAmount > 0 && (
              <KV
                rows={[
                  [`Move to tax account (${singlePct}%)`, money(singleTax, 2), null, true],
                  ["Yours to take", money(singleAmount - singleTax, 2), "good", true],
                ]}
              />
            )}
            <p className="muted small" style={{ marginTop: 10 }}>A quick check at your current marginal rate (NZ brackets + ACC). To count it above, record it on the client&apos;s profile.</p>
          </Panel>
        </div>
      </div>
      <div className="grid g-2">
        <Panel title="Withdrawals" icon={History} pad={false}>
          <table className="table">
            <thead><tr><th>Date</th><th>Note</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {withdrawals.map((w) => <tr key={w.id}><td>{fmtDate(w.date)}</td><td>{w.note}</td><td className="num"><Priv>{money(w.amount)}</Priv></td></tr>)}
              {withdrawals.length === 0 && <tr><td colSpan={3} className="muted">No withdrawals logged yet.</td></tr>}
            </tbody>
          </table>
        </Panel>
        <Panel title="Past periods" icon={History} pad={false}>
          <table className="table">
            <thead><tr><th>Period</th><th className="num">Gross</th><th className="num">Tax %</th></tr></thead>
            <tbody>
              {o.history.map((h) => <tr key={h.id} data-click onClick={() => go(`/finance/personal/${h.id}`)}><td>{h.label}</td><td className="num"><Priv>{money(h.gross)}</Priv></td><td className="num">{h.tax}%</td></tr>)}
              {o.history.length === 0 && <tr><td colSpan={3} className="muted">No past periods.</td></tr>}
            </tbody>
          </table>
        </Panel>
      </div>
      {/* Standing splits paid out of client revenue — the real Owner's Cut
          page's add/remove, kept in the concept's panel + quick-add. */}
      <Panel title="Recurring contractor costs" icon={Users} pad={false} right="Subtracted every month">
        <form className="quickadd" style={{ flexWrap: "wrap" }} action={createDevCostAction}>
          <input className="input" style={{ width: 160 }} name="payee" placeholder="Paid to (e.g. Yuvi)" required />
          <input className="input" style={{ flex: 1, minWidth: 200 }} name="label" placeholder="What for (e.g. DM Rider subscription split)" required />
          <input className="input" style={{ width: 110 }} name="monthlyAmountNzd" type="number" min="0" step="0.01" placeholder="$/mo" required />
          <button className="btn btn-primary"><Plus size={14} /> Add</button>
        </form>
        <table className="table">
          <tbody>
            {o.contractorPayments.map((c) => (
              <tr key={c.id}>
                <td className="strong">{c.payee}</td>
                <td>{c.label}{c.client && <span className="muted"> · {c.client}</span>}</td>
                <td className="num"><Priv>{money(c.amount)}</Priv>/mo</td>
                <td className="num"><button className="btn btn-sm btn-danger" onClick={() => deleteDevCostAction(c.id)}>Remove</button></td>
              </tr>
            ))}
            {o.contractorPayments.length === 0 && <tr><td colSpan={4} className="muted">None logged yet.</td></tr>}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

const CATEGORIES = ["Equipment", "Software", "Marketing", "Admin", "Travel", "Other"];

// NZ GST is 15%, and a purchase price is GST-inclusive, so the GST in it is
// 3/23 of the amount paid.
const gstOf = (amount) => Math.round((amount * 3 / 23) * 100) / 100;

export function Expenses() {
  const { purchases, setPurchases, expenses, expenseBudgets } = useStore();
  const [form, setForm] = useState({ date: TODAY, item: "", category: "Equipment", amount: "", writeoff: false, notes: "" });
  const [exportWhat, setExportWhat] = useState("all");
  const monthly = expenses.reduce((a, e) => a + (e.monthly || 0), 0);
  const yearly = expenses.reduce((a, e) => a + (e.yearly || e.monthly * 12), 0);
  const gst = expenses.reduce((a, e) => a + (e.gst || 0), 0);
  const purchaseTotal = purchases.filter((p) => p.date >= FY_START).reduce((a, p) => a + p.amount, 0);

  const exportCsv = () => {
    const header = ["Type", "Date", "Category", "Item", "Monthly (NZD)", "Yearly (NZD)", "Amount (NZD)", "GST (NZD)", "Write-off", "Notes"];
    const recurring = expenses.map((e) => ["Recurring", "", e.category, e.label, e.monthly || "", e.yearly || "", "", e.gst || "", e.writeoff ? "Yes" : "No", ""]);
    const oneOff = purchases.map((p) => ["One-off", p.date, p.category, p.item, "", "", p.amount, p.gst || "", p.writeoff ? "Yes" : "No", p.notes]);
    const rows = exportWhat === "recurring" ? recurring : exportWhat === "oneoff" ? oneOff : [...recurring, ...oneOff];
    downloadCsv(`gray-horizon-expenses-${exportWhat}-${FY_LABEL}.csv`, header, rows);
  };

  return (
    <div className="screen">
      <PageHead title="Business expenses" sub="Recurring subscriptions and one-off purchases, kept separate for the tax export">
        <Seg small value={exportWhat} onChange={setExportWhat} options={[["all", "All"], ["recurring", "Recurring"], ["oneoff", "One-off"]]} />
        <button className="btn" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </PageHead>
      <div className="grid g-4">
        <Stat label="Recurring · monthly" value={money(monthly)} accent />
        <Stat label="Recurring · yearly" value={money(yearly)} accent />
        <Stat label="One-off purchases · FY" value={money(purchaseTotal, 2)} sub={`${purchases.length} recorded`} accent />
        <Stat label="GST component" value={money(gst + purchases.reduce((a, p) => a + (p.gst || 0), 0), 2)} sub="claimable once registered" accent />
      </div>

      <div className="grid g-side">
        <Panel title="Recurring expenses" icon={Receipt} pad={false} right={<RecurringAdd />}>
          <table className="table">
            <thead><tr><th>Category</th><th>Item</th><th className="num">Monthly</th><th className="num">Yearly</th><th className="num">GST</th><th /></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="muted">{e.category}</td>
                  <td className="strong">{e.label}</td>
                  <td className="num"><Priv>{e.monthly ? money(e.monthly) : "—"}</Priv></td>
                  <td className="num"><Priv>{e.yearly ? money(e.yearly) : "—"}</Priv></td>
                  <td className="num"><Priv>{e.gst ? money(e.gst, 2) : "—"}</Priv></td>
                  <td>{e.writeoff && <Badge tone="accent">Write-off</Badge>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2}>Total</td><td className="num"><Priv>{money(monthly)}</Priv></td><td className="num"><Priv>{money(yearly)}</Priv></td><td className="num"><Priv>{money(gst, 2)}</Priv></td><td /></tr></tfoot>
          </table>
        </Panel>
        <Panel title="Budget by category" icon={Wallet} right="Monthly">
          {Object.keys(expenseBudgets).length === 0 ? <p className="muted small">No budgets set yet.</p> : <Bullet rows={expenseRows(expenses, expenseBudgets, purchases)} />}
          <div className="note" style={{ marginTop: 16 }}><Info size={14} /> Budgets live in Settings. One-off purchases are spread over 12 months here.</div>
        </Panel>
      </div>

      <Panel title="One-off purchases" icon={ShoppingBag} pad={false} right="Kept for the tax export">
        <form
          className="quickadd"
          style={{ flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            const amount = parseFloat(form.amount);
            if (!form.item.trim() || !(amount > 0)) return;
            setPurchases((ps) => [{ id: Date.now(), ...form, item: form.item.trim(), amount, gst: gstOf(amount) }, ...ps]);
            setForm({ ...form, item: "", amount: "", notes: "", writeoff: false });
          }}
        >
          <input className="input" style={{ width: 150 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className="input" style={{ flex: 1, minWidth: 180 }} value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="What you bought (e.g. iPhone 17)" />
          <select className="select" style={{ width: 130 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="input" style={{ width: 110 }} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" />
          <span className="muted small nowrap">GST {parseFloat(form.amount) > 0 ? money(gstOf(parseFloat(form.amount)), 2) : "—"}</span>
          <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={form.writeoff} onChange={(e) => setForm({ ...form, writeoff: e.target.checked })} /> Write-off</label>
          <input className="input" style={{ flex: 1, minWidth: 160 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes for your accountant" />
          <button className="btn btn-primary"><Plus size={14} /> Add purchase</button>
        </form>
        <table className="table">
          <thead><tr><th>Date</th><th>Item</th><th>Category</th><th className="num">Amount</th><th className="num">GST</th><th>Notes</th><th /></tr></thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className="nowrap">{fmtDate(p.date)}</td>
                <td className="strong">{p.item}</td>
                <td className="muted">{p.category}</td>
                <td className="num"><Priv>{money(p.amount, 2)}</Priv></td>
                <td className="num"><Priv>{p.gst ? money(p.gst, 2) : "—"}</Priv></td>
                <td className="muted small">{p.notes || "—"}</td>
                <td>{p.writeoff && <Badge tone="accent">Write-off</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// The concept's "+ Add" on Recurring expenses, wired to the real create
// action (the concept button did nothing).
function RecurringAdd() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}><Plus size={12} /> Add</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add recurring expense">
        <form
          className="stack"
          style={{ gap: 10 }}
          action={async (fd) => {
            await createBusinessExpenseAction(fd);
            setOpen(false);
          }}
        >
          <div className="form-grid">
            <label className="field"><span>Category</span><input className="input" name="category" placeholder="e.g. Software" /></label>
            <label className="field"><span>Item</span><input className="input" name="label" required placeholder="e.g. Xero" /></label>
            <label className="field"><span>Monthly</span><input className="input" name="monthlyAmountNzd" type="number" step="0.01" /></label>
            <label className="field"><span>Yearly</span><input className="input" name="yearlyAmountNzd" type="number" step="0.01" /></label>
            <label className="field"><span>GST (monthly)</span><input className="input" name="gstMonthlyNzd" type="number" step="0.01" /></label>
            <label className="field"><span>GST (yearly)</span><input className="input" name="gstYearlyNzd" type="number" step="0.01" /></label>
          </div>
          <label className="row small" style={{ gap: 6 }}><input type="checkbox" name="isWriteoff" /> Write-off</label>
          <button className="btn btn-primary" type="submit"><Plus size={14} /> Add expense</button>
        </form>
      </Modal>
    </>
  );
}
