import { listServiceModules, listServiceItems } from "@/lib/dal/pricing";
import { createServiceItemAction, updateServiceItemAction, softDeleteServiceItemAction } from "./actions";

function formatPrice(setup: string | null, monthly: string | null, text: string | null) {
  const parts: string[] = [];
  if (setup) parts.push(`$${Number(setup).toLocaleString()}`);
  if (monthly) parts.push(`$${Number(monthly).toLocaleString()}/mo`);
  if (parts.length === 0) return text || "—";
  return parts.join(" + ");
}

const BILLING_TYPES = ["one_off", "monthly", "range", "custom"] as const;
const BILLING_LABEL: Record<(typeof BILLING_TYPES)[number], string> = {
  one_off: "One-off",
  monthly: "Monthly",
  range: "Range",
  custom: "Custom",
};

// Phase — restyled onto the pricing-card reference's grouped-card grid: a
// joined-hairline grid of cards per module (cat-head + card-grid), not a
// stacked list. Current/Suggested render as a two-up rate row per card,
// Suggested picking up the gold accent (the one "featured value" callout
// per brief). Edit/Remove stay server-action forms — the mockup's affordance,
// this app's actual mutation plumbing.
export default async function PricingPage() {
  const [modules, items] = await Promise.all([listServiceModules(), listServiceItems()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 1100 }}>
      <div>
        <p className="gh-eyebrow">Pricing</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          Service <em>Catalogue</em>
        </h1>
      </div>

      <p className="gh-source-note">
        Structured copy of <code>gh_pricing_framework_v5.md</code>. Current is the default rate to quote —
        Suggested isn&apos;t active until authorised. Re-run <code>scripts/import-pricing.mjs</code> after
        the source file changes rather than editing prices in bulk here.
      </p>

      {modules.map((mod) => {
        const modItems = items.filter((it) => it.moduleCode === mod.code);
        return (
          <div key={mod.code}>
            <div className="gh-cat-head">
              <div className="gh-cat-code">
                {mod.code}
                <span>{mod.name}</span>
              </div>
              {mod.focus && <div className="gh-cat-desc">{mod.focus}</div>}
            </div>

            <div className="gh-grid-joined gh-grid-joined--3">
              {modItems.map((item) => (
                <div key={item.id} className="gh-grid-cell gh-grid-cell--interactive">
                  <div className="gh-card-top">
                    <div>
                      <p style={{ fontSize: "var(--gh-text-sm)", fontWeight: 500 }}>{item.deliverable}</p>
                      <span className="gh-card-id">{item.id}</span>
                    </div>
                    <span className="gh-badge">{BILLING_LABEL[item.billingType as (typeof BILLING_TYPES)[number]] ?? item.billingType}</span>
                  </div>

                  {item.notes && (
                    <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", lineHeight: 1.5, marginBottom: "var(--gh-space-3)" }}>
                      {item.notes}
                    </p>
                  )}

                  <div className="gh-rate-row">
                    <div>
                      <p className="gh-rate-label">Current</p>
                      <p className="gh-rate-val">{formatPrice(item.currentSetupPrice, item.currentMonthlyPrice, item.priceText)}</p>
                    </div>
                    {(item.suggestedSetupPrice || item.suggestedMonthlyPrice) && (
                      <div>
                        <p className="gh-rate-label">Suggested</p>
                        <p className="gh-rate-val gh-rate-val--accent">
                          {formatPrice(item.suggestedSetupPrice, item.suggestedMonthlyPrice, item.priceText)}
                        </p>
                      </div>
                    )}
                  </div>

                  <details style={{ marginTop: "var(--gh-space-3)" }}>
                    <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Edit</summary>
                    <form
                      action={updateServiceItemAction.bind(null, item.id)}
                      style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-3)" }}
                    >
                      <input className="gh-input" name="deliverable" defaultValue={item.deliverable} required />
                      <label style={{ fontSize: "var(--gh-text-sm)" }}>
                        <input type="checkbox" name="isRecurring" defaultChecked={item.isRecurring} /> Recurring
                      </label>
                      <select className="gh-input" name="billingType" defaultValue={item.billingType}>
                        {BILLING_TYPES.map((bt) => (
                          <option key={bt} value={bt}>{BILLING_LABEL[bt]}</option>
                        ))}
                      </select>
                      <input className="gh-input" name="currentSetupPrice" defaultValue={item.currentSetupPrice ?? ""} placeholder="Current setup price" />
                      <input className="gh-input" name="currentMonthlyPrice" defaultValue={item.currentMonthlyPrice ?? ""} placeholder="Current monthly price" />
                      <input className="gh-input" name="suggestedSetupPrice" defaultValue={item.suggestedSetupPrice ?? ""} placeholder="Suggested setup price" />
                      <input className="gh-input" name="suggestedMonthlyPrice" defaultValue={item.suggestedMonthlyPrice ?? ""} placeholder="Suggested monthly price" />
                      <input className="gh-input" name="priceText" defaultValue={item.priceText ?? ""} placeholder="Free-text price (ranges/custom)" />
                      <textarea className="gh-input" name="notes" defaultValue={item.notes ?? ""} placeholder="Notes" rows={2} />
                      <button className="gh-btn-primary" type="submit">Save</button>
                    </form>
                  </details>

                  <form action={softDeleteServiceItemAction.bind(null, item.id)} style={{ marginTop: "var(--gh-space-2)" }}>
                    <button
                      className="gh-btn-secondary"
                      type="submit"
                      style={{ color: "var(--gh-danger)", borderColor: "var(--gh-danger)", fontSize: "var(--gh-text-micro)", padding: "var(--gh-space-1) var(--gh-space-2)" }}
                    >
                      Remove
                    </button>
                  </form>
                </div>
              ))}

              <details className="gh-grid-cell" style={{ padding: 0 }}>
                <summary className="gh-add-cell" style={{ padding: "var(--gh-space-6)" }}>+ Add item to {mod.code}</summary>
                <form
                  action={createServiceItemAction.bind(null, mod.code)}
                  style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", padding: "var(--gh-space-6)", paddingTop: 0 }}
                >
                  <input className="gh-input" name="id" placeholder={`${mod.code.toLowerCase()}-new-item-id`} required />
                  <input className="gh-input" name="deliverable" placeholder="Deliverable name" required />
                  <label style={{ fontSize: "var(--gh-text-sm)" }}>
                    <input type="checkbox" name="isRecurring" /> Recurring
                  </label>
                  <select className="gh-input" name="billingType" defaultValue="one_off">
                    {BILLING_TYPES.map((bt) => (
                      <option key={bt} value={bt}>{BILLING_LABEL[bt]}</option>
                    ))}
                  </select>
                  <input className="gh-input" name="currentSetupPrice" placeholder="Current setup price" />
                  <input className="gh-input" name="currentMonthlyPrice" placeholder="Current monthly price" />
                  <input className="gh-input" name="suggestedSetupPrice" placeholder="Suggested setup price" />
                  <input className="gh-input" name="suggestedMonthlyPrice" placeholder="Suggested monthly price" />
                  <input className="gh-input" name="priceText" placeholder="Free-text price (ranges/custom)" />
                  <textarea className="gh-input" name="notes" placeholder="Notes" rows={2} />
                  <button className="gh-btn-primary" type="submit">Add item</button>
                </form>
              </details>
            </div>
            {modItems.length === 0 && (
              <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-3)" }}>
                No items in this module yet.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
