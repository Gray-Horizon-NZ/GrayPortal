// One client month (concept parts.jsx CycleRow). Payments aren't tracked
// (Max's Xero isn't fed from the bank): a month is four work steps plus an
// optional "Settled" tick, which stamps the client payment and the contractor
// payout together so the contractor workspace shows the month as paid.
import { money } from "@/lib/incrementum/format";
import SubmitButton from "@/components/ui/SubmitButton";
import { Badge, Priv, RowFold, Field, BackTo, HiddenFields } from "./kit";
import { fmtDate, longDate, monthName } from "./helpers";
import { stampCycleAction, updateCycleAction, deleteCycleAction } from "@/app/(incrementum)/incrementum/actions";

export type Cycle = {
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

type Step = "deliveredAt" | "approvedAt" | "reportSentAt" | "invoicedAt" | "settled";
const STEPS: [Step, string, string][] = [
  ["deliveredAt", "Delivered", "Delivered"],
  ["approvedAt", "Approved", "Approved"],
  ["reportSentAt", "Report sent", "Report"],
  ["invoicedAt", "Invoiced", "Invoiced"],
  ["settled", "Settled", "Settled"],
];
export const WORK_STEPS: ["deliveredAt" | "approvedAt" | "reportSentAt" | "invoicedAt", string][] = [
  ["deliveredAt", "delivered"],
  ["approvedAt", "approved"],
  ["reportSentAt", "report sent"],
  ["invoicedAt", "invoiced"],
];

const stepDate = (c: Cycle, k: Step) => (k === "settled" ? c.payoutPaidAt : c[k]);

export function CycleRow({ c, back, today, title }: { c: Cycle; back: string; today: string; title?: string }) {
  const toInvoice = !c.invoicedAt && c.month <= today;
  return (
    <RowFold
      className="cycle"
      summary={
        <>
          <span className="cycle-title">
            {title ? <b>{title}</b> : null}
            <span className="muted">{monthName(c.month, true)}</span>
          </span>
          <span className="cycle-steps" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
            {STEPS.map(([f, label, short]) => {
              const d = stepDate(c, f);
              return d ? (
                <span key={f} className="cstep" data-done data-optional={f === "settled" || undefined} title={`${label} ${longDate(d)}`}>
                  {short}
                  <small>{fmtDate(d)}</small>
                </span>
              ) : (
                <form key={f} action={stampCycleAction} style={{ display: "contents" }}>
                  <BackTo path={back} />
                  <HiddenFields values={{ id: c.id, field: f, date: today }} />
                  <button type="submit" className="cstep" data-optional={f === "settled" || undefined} title={f === "settled" ? "Optional: tick once you've paid the contractor" : `Mark ${label.toLowerCase()} today`}>
                    {short}
                    <small>{f === "settled" ? "optional" : "Mark today"}</small>
                  </button>
                </form>
              );
            })}
          </span>
          <span className="cycle-amt">
            <Priv>{money(c.invoiceAmount)}</Priv>
            <small>
              pay out <Priv>{money(c.payoutAmount)}</Priv>
            </small>
          </span>
          {toInvoice ? <Badge tone="warn">To invoice</Badge> : <span />}
        </>
      }
    >
      <form className="form-grid g3" action={updateCycleAction}>
        <BackTo path={back} />
        <HiddenFields values={{ id: c.id, payoutDueAt: c.payoutDueAt }} />
        <Field label="Delivered">
          <input className="input" type="date" name="deliveredAt" defaultValue={c.deliveredAt ?? ""} />
        </Field>
        <Field label="Approved">
          <input className="input" type="date" name="approvedAt" defaultValue={c.approvedAt ?? ""} />
        </Field>
        <Field label="Report sent">
          <input className="input" type="date" name="reportSentAt" defaultValue={c.reportSentAt ?? ""} />
        </Field>
        <Field label="Invoiced">
          <input className="input" type="date" name="invoicedAt" defaultValue={c.invoicedAt ?? ""} />
        </Field>
        <Field label="Settled (optional)">
          <input className="input" type="date" name="settledAt" defaultValue={c.payoutPaidAt ?? ""} />
        </Field>
        <Field label="Invoice amount (signed price)">
          <input className="input" name="invoiceAmount" defaultValue={c.invoiceAmount ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Xero invoice #">
          <input className="input" name="xeroInvoiceNumber" defaultValue={c.xeroInvoiceNumber ?? ""} />
        </Field>
        <Field label="Contractor payout">
          <input className="input" name="payoutAmount" defaultValue={c.payoutAmount ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Contractor bill ref">
          <input className="input" name="contractorBillRef" defaultValue={c.contractorBillRef ?? ""} />
        </Field>
        <Field label="Notes" wide>
          <input className="input" name="notes" defaultValue={c.notes ?? ""} />
        </Field>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save month
          </SubmitButton>
        </div>
      </form>
      <form action={deleteCycleAction} className="row">
        <BackTo path={back} />
        <HiddenFields values={{ id: c.id }} />
        <span className="spacer" />
        <button type="submit" className="linkbtn danger">
          Delete month
        </button>
      </form>
    </RowFold>
  );
}
