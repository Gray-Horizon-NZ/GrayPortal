// Shared pieces for the contractor workspace (/work). Dark GrayPortal
// styling — the same shell and classes as the admin app.
import { money, shortDate } from "@/lib/incrementum/format";
import type { MyCycle } from "@/lib/dal/contractorPortal";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import { markDeliveredAction, submitInvoiceAction } from "@/app/(contractor)/work/actions";

export function Head({ eyebrow, title, lede }: { eyebrow: string; title: React.ReactNode; lede?: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: "var(--gh-space-6)", borderBottom: "1px solid var(--gh-border)" }}>
      <p className="gh-eyebrow">{eyebrow}</p>
      <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
        {title}
      </h1>
      {lede && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-2)", maxWidth: 640 }}>{lede}</p>}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p role={error ? "alert" : "status"} style={{ border: `1px solid ${error ? "var(--gh-danger)" : "var(--gh-success)"}`, color: error ? "var(--gh-danger)" : "var(--gh-success)", padding: "var(--gh-space-2) var(--gh-space-3)", fontSize: "var(--gh-text-sm)" }}>
      {error ?? ok}
    </p>
  );
}

export function monthLabel(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Where a month is in the pay-when-paid flow, from the contractor's side. */
export function cycleStatus(c: MyCycle): { label: string; status: "success" | "warning" | "accent" | "neutral" } {
  if (c.payout_paid_at) return { label: `Paid ${shortDate(c.payout_paid_at)}`, status: "success" };
  if (c.client_paid) return { label: c.payout_due_at ? `Payout due ${shortDate(c.payout_due_at)}` : "Payout due", status: "accent" };
  if (c.approved_at) return { label: "Approved · waiting on client payment", status: "neutral" };
  if (c.delivered_at) return { label: "Delivered · awaiting Max's approval", status: "warning" };
  return { label: "In progress", status: "neutral" };
}

export function CycleCard({ c, back, showClient = true }: { c: MyCycle; back: string; showClient?: boolean }) {
  const st = cycleStatus(c);
  return (
    <div className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", padding: "var(--gh-space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--gh-space-3)", flexWrap: "wrap" }}>
        <strong style={{ fontWeight: 500 }}>
          {showClient ? `${c.client_name} · ` : ""}
          {monthLabel(c.month)}
        </strong>
        <span style={{ display: "inline-flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "var(--gh-text-sm)" }}>{money(c.my_amount)}</span>
          <Badge status={st.status}>{st.label}</Badge>
        </span>
      </div>
      <div style={{ display: "flex", gap: "var(--gh-space-3)", flexWrap: "wrap", alignItems: "center" }}>
        {!c.delivered_at ? (
          <form action={markDeliveredAction}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="cycleId" value={c.id} />
            <SubmitButton pendingLabel="Saving…">Mark this month delivered</SubmitButton>
          </form>
        ) : (
          <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
            Delivered {shortDate(c.delivered_at)}
            {c.approved_at ? ` · approved ${shortDate(c.approved_at)}` : ""}
          </span>
        )}
        {!c.payout_paid_at && (
          <form action={submitInvoiceAction} style={{ display: "flex", gap: "var(--gh-space-2)" }}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="cycleId" value={c.id} />
            <input className="gh-input" name="ref" defaultValue={c.contractor_bill_ref ?? ""} placeholder="Your invoice #" aria-label="Your invoice number" style={{ width: 140 }} />
            <SubmitButton className="gh-btn-secondary" pendingLabel="…">
              Save
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
