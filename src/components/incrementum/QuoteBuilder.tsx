// "What they're after" — the client-needs quote builder, shown on a lead's
// profile (building the quote) and an engagement's profile (live client).
// Every number is adjustable per line: the contractor's rate, the markup,
// or the sell price outright; totals recalculate from the lines.
import type { IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { computeNeed, needCandidates, quoteTotals } from "@/lib/incrementum/compute";
import { money } from "@/lib/incrementum/format";
import { clientsForTarget, toNum } from "@/lib/incrementum/pricing";
import SubmitButton from "@/components/ui/SubmitButton";
import AssignDialog from "./AssignDialog";
import { Chip } from "./ui";
import { createNeedAction, updateNeedAction, assignNeedAction, unassignNeedAction, deleteNeedAction } from "@/app/(incrementum)/incrementum/actions";

const PRICE_SOURCE: Record<string, string> = {
  override: "your price",
  cost_plus: "rate + markup",
  catalogue_floor: "raised to catalogue",
  service: "service price (no rate yet)",
  none: "no price yet",
};

export default function QuoteBuilder({
  s,
  leadId,
  engagementId,
  back,
  readOnly = false,
}: {
  s: IncrementumSnapshot;
  leadId?: string;
  engagementId?: string;
  back: string;
  readOnly?: boolean;
}) {
  const rows = s.state.needs.filter((n) => (engagementId ? n.engagementId === engagementId : n.leadId === leadId && !n.engagementId));
  const views = rows.map((n) => computeNeed(s.state, s.services, n));
  const t = quoteTotals(views);
  const freedom = toNum(s.state.settings.freedomTarget) ?? 10000;
  const services = s.services.filter((x) => x.status === "active");

  return (
    <section className="inc-panel" id="quote" style={{ borderColor: "var(--gh-accent)" }}>
      <div className="inc-cell-head">
        <div>
          <p className="gh-eyebrow">{engagementId ? "Live client" : "Quote"}</p>
          <h2 className="inc-cell-title">
            What they&apos;re <em>after</em>
          </h2>
        </div>
        {t.unassigned > 0 && <Chip tone="warning">{t.unassigned} unassigned</Chip>}
      </div>

      <div className="inc-stats">
        <div className="inc-stat">
          <span className="inc-small">Est. monthly price</span>
          <span className="inc-stat-value">{money(t.monthlyPrice)}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Contractor cost</span>
          <span className="inc-stat-value">{money(t.monthlyCost)}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Your profit / mo</span>
          <span className="inc-stat-value" style={{ color: t.monthlyProfit < 400 && t.monthlyPrice > 0 ? "var(--gh-danger)" : t.monthlyProfit >= 700 ? "var(--gh-success)" : undefined }}>
            {money(t.monthlyProfit)}
          </span>
          <span className="inc-small">{t.marginPct !== null ? `${t.marginPct}% margin` : ""}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">One-off / setup</span>
          <span className="inc-stat-value">{money(t.oneOffPrice)}</span>
          <span className="inc-small">cost {money(t.oneOffCost)}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Clients like this for {money(freedom)}</span>
          <span className="inc-stat-value">{clientsForTarget(freedom, t.monthlyProfit) ?? "—"}</span>
        </div>
      </div>

      {views.length === 0 ? (
        <p className="inc-muted">Add what they need below, then assign a contractor to each line to build the quote.</p>
      ) : (
        <div className="inc-list">
          {views.map((n) => {
            const candidates = needCandidates(s.state, s.services, n);
            return (
              <div key={n.id} className="inc-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--gh-space-2)" }}>
                <div className="inc-inline" style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <strong style={{ fontWeight: 500 }}>
                      {n.service?.name ?? "Service"}
                      {n.title ? <span className="inc-muted"> · {n.title}</span> : null}
                      {toNum(n.quantity) !== 1 ? <span className="inc-muted"> × {n.quantity}</span> : null}
                    </strong>
                    <span className="inc-small">
                      {n.billing === "monthly" ? "Monthly" : "One-off"} · {n.contractorName ? `${n.contractorName} at ${money(n.rate)}` : n.rate !== null ? `est. quote ${money(n.rate)} (unassigned)` : "unassigned"} · {n.markup}% markup ·{" "}
                      {PRICE_SOURCE[n.priceSource]}
                    </span>
                    {n.tags?.length ? (
                      <span className="inc-inline">
                        {n.tags.map((tag) => (
                          <Chip key={tag}>{tag}</Chip>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    <span className="inc-num" style={{ fontWeight: 500 }}>
                      {money(n.price)}
                      {n.billing === "monthly" ? "/mo" : ""}
                    </span>
                    <span className="inc-small">profit {money(n.profit)}</span>
                  </div>
                </div>
                {!readOnly && (
                  <div className="inc-inline">
                    <AssignDialog action={assignNeedAction} needId={n.id} back={`${back}#quote`} serviceName={n.service?.name ?? "Service"} candidates={candidates} assignedId={n.contractorId} markup={n.markup} />
                    {n.contractorId && (
                      <form action={unassignNeedAction}>
                        <input type="hidden" name="_back" value={`${back}#quote`} />
                        <input type="hidden" name="id" value={n.id} />
                        <button className="gh-link-btn" type="submit">
                          Unassign
                        </button>
                      </form>
                    )}
                    <details className="inc-disclosure">
                      <summary>Adjust</summary>
                      <form action={updateNeedAction} className="inc-form">
                        <input type="hidden" name="_back" value={`${back}#quote`} />
                        <input type="hidden" name="id" value={n.id} />
                        <label className="inc-field">
                          Contractor rate ($)
                          <input className="gh-input" name="contractorRate" defaultValue={n.contractorRate ?? ""} inputMode="decimal" disabled={!n.contractorId} />
                        </label>
                        <label className="inc-field">
                          Markup % (blank = {n.service?.effectiveMarkupPct ?? 33}%)
                          <input className="gh-input" name="markupPct" defaultValue={n.markupPct ?? ""} inputMode="decimal" />
                        </label>
                        <label className="inc-field">
                          Your price ($, per unit)
                          <input className="gh-input" name="sellPrice" defaultValue={n.sellPrice ?? ""} inputMode="decimal" placeholder={n.unitPrice !== null ? String(n.unitPrice) : ""} />
                        </label>
                        <label className="inc-field">
                          Quantity
                          <input className="gh-input" name="quantity" defaultValue={n.quantity} inputMode="decimal" />
                        </label>
                        <label className="inc-field">
                          Detail
                          <input className="gh-input" name="title" defaultValue={n.title ?? ""} />
                        </label>
                        <label className="inc-field">
                          Tags
                          <input className="gh-input" name="tags" defaultValue={(n.tags ?? []).join(", ")} />
                        </label>
                        <label className="inc-field inc-field--wide">
                          Notes
                          <input className="gh-input" name="notes" defaultValue={n.notes ?? ""} />
                        </label>
                        {!n.contractorId && <input type="hidden" name="contractorRate" value="" />}
                        <SubmitButton pendingLabel="Saving…">Save line</SubmitButton>
                      </form>
                      <form action={deleteNeedAction} style={{ marginTop: "var(--gh-space-2)" }}>
                        <input type="hidden" name="_back" value={`${back}#quote`} />
                        <input type="hidden" name="id" value={n.id} />
                        <button className="gh-link-btn gh-link-btn--danger" type="submit">
                          Remove line
                        </button>
                      </form>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <form action={createNeedAction} className="inc-form">
          <input type="hidden" name="_back" value={`${back}#quote`} />
          {leadId && <input type="hidden" name="leadId" value={leadId} />}
          {engagementId && <input type="hidden" name="engagementId" value={engagementId} />}
          <label className="inc-field">
            They need
            <select className="gh-input" name="serviceId" required>
              {services.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field">
            Detail
            <input className="gh-input" name="title" placeholder="e.g. 2 locations, Shopify store" />
          </label>
          <label className="inc-field">
            Extra tags
            <input className="gh-input" name="tags" placeholder="shopify, hospitality" />
          </label>
          <label className="inc-field">
            Quantity
            <input className="gh-input" name="quantity" defaultValue="1" inputMode="decimal" />
          </label>
          <SubmitButton className="gh-btn-secondary" pendingLabel="Adding…">
            Add need
          </SubmitButton>
        </form>
      )}
      {engagementId && <p className="inc-small">On a live client, assigning a monthly line also updates the engagement&apos;s contractor team and costs. The signed price only changes when you edit it in Details.</p>}
    </section>
  );
}
