// One engagement month in the pay-when-paid ledger: six steps, each a
// one-click stamp (today) or editable in full. Shared by the engagement
// page and the Payouts tab.
import { money, shortDate, todayNz } from "@/lib/incrementum/format";
import SubmitButton from "@/components/ui/SubmitButton";
import { Chip } from "./ui";
import { stampCycleAction, updateCycleAction, deleteCycleAction } from "@/app/(incrementum)/incrementum/actions";

type Cycle = {
  id: string;
  month: string;
  deliveredAt: string | null;
  approvedAt: string | null;
  reportSentAt: string | null;
  invoicedAt: string | null;
  xeroInvoiceNumber: string | null;
  invoiceAmount: string | null;
  clientPaidAt: string | null;
  contractorBillRef: string | null;
  payoutAmount: string | null;
  payoutDueAt: string | null;
  payoutPaidAt: string | null;
  notes: string | null;
};

const STEPS = [
  { field: "deliveredAt", label: "Delivered" },
  { field: "approvedAt", label: "Approved" },
  { field: "reportSentAt", label: "Report sent" },
  { field: "invoicedAt", label: "Invoiced" },
  { field: "clientPaidAt", label: "Client paid" },
  { field: "payoutPaidAt", label: "Contractor paid" },
] as const;

export function CycleRow({ c, back, title }: { c: Cycle; back: string; title?: string }) {
  const today = todayNz();
  const payoutOverdue = c.clientPaidAt && !c.payoutPaidAt && c.payoutDueAt && c.payoutDueAt < today;
  return (
    <div className="inc-panel" style={{ padding: "var(--gh-space-4)", gap: "var(--gh-space-3)" }}>
      <div className="inc-cell-head">
        <strong style={{ fontWeight: 500 }}>
          {title ? `${title} · ` : ""}
          {shortDate(c.month, true).replace(/^1 /, "")}
        </strong>
        <span className="inc-inline">
          <span className="inc-small inc-num">
            Invoice {money(c.invoiceAmount)} · Payout {money(c.payoutAmount)}
          </span>
          {payoutOverdue && <Chip tone="danger">Payout overdue</Chip>}
          {c.invoicedAt && !c.clientPaidAt && <Chip tone="warning">Awaiting client</Chip>}
        </span>
      </div>
      <div className="inc-steps" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {STEPS.map((st) => {
          const v = c[st.field];
          return (
            <div key={st.field} className="inc-step" data-state={v ? "done" : undefined}>
              <span className="inc-step-num">{st.label}</span>
              {v ? (
                <span className="inc-small">✓ {shortDate(v)}</span>
              ) : (
                <form action={stampCycleAction}>
                  <input type="hidden" name="_back" value={back} />
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="field" value={st.field} />
                  <input type="hidden" name="date" value={today} />
                  <button type="submit" className="gh-link-btn">
                    Mark today
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
      <details className="inc-disclosure">
        <summary>Edit month</summary>
        <form action={updateCycleAction} className="inc-form">
          <input type="hidden" name="_back" value={back} />
          <input type="hidden" name="id" value={c.id} />
          {STEPS.map((st) => (
            <label className="inc-field" key={st.field}>
              {st.label}
              <input className="gh-input" type="date" name={st.field} defaultValue={c[st.field] ?? ""} />
            </label>
          ))}
          <label className="inc-field">
            Invoice amount
            <input className="gh-input" name="invoiceAmount" defaultValue={c.invoiceAmount ?? ""} />
          </label>
          <label className="inc-field">
            Xero invoice #
            <input className="gh-input" name="xeroInvoiceNumber" defaultValue={c.xeroInvoiceNumber ?? ""} />
          </label>
          <label className="inc-field">
            Payout amount
            <input className="gh-input" name="payoutAmount" defaultValue={c.payoutAmount ?? ""} />
          </label>
          <label className="inc-field">
            Payout due
            <input className="gh-input" type="date" name="payoutDueAt" defaultValue={c.payoutDueAt ?? ""} />
          </label>
          <label className="inc-field">
            Contractor bill ref
            <input className="gh-input" name="contractorBillRef" defaultValue={c.contractorBillRef ?? ""} />
          </label>
          <label className="inc-field inc-field--wide">
            Notes
            <input className="gh-input" name="notes" defaultValue={c.notes ?? ""} />
          </label>
          <SubmitButton pendingLabel="Saving…">Save month</SubmitButton>
        </form>
        <form action={deleteCycleAction} style={{ marginTop: "var(--gh-space-2)" }}>
          <input type="hidden" name="_back" value={back} />
          <input type="hidden" name="id" value={c.id} />
          <button className="gh-link-btn gh-link-btn--danger" type="submit">
            Delete month
          </button>
        </form>
      </details>
    </div>
  );
}
