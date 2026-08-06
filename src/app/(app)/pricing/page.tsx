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

export default async function PricingPage() {
  const [modules, items] = await Promise.all([listServiceModules(), listServiceItems()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 900 }}>
      <div>
        <p className="gh-eyebrow">Pricing</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Service Catalogue</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Structured copy of gh_pricing_framework_v5.md. Current is the default rate to quote — Suggested
          isn&apos;t active until authorised. Re-run <code>scripts/import-pricing.mjs</code> after the
          source file changes rather than editing prices in bulk here.
        </p>
      </div>

      {modules.map((mod) => {
        const modItems = items.filter((it) => it.moduleCode === mod.code);
        return (
          <section key={mod.code} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <div>
              <p className="gh-eyebrow">{mod.code} — {mod.name}</p>
              {mod.focus && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{mod.focus}</p>}
            </div>

            {modItems.map((item) => (
              <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
                  <span>
                    {item.deliverable} <span style={{ color: "var(--gh-text-muted)" }}>({item.id})</span>
                  </span>
                  <span className="gh-badge">{item.billingType}</span>
                </div>
                <div style={{ display: "flex", gap: "var(--gh-space-6)", fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
                  <span>Current: {formatPrice(item.currentSetupPrice, item.currentMonthlyPrice, item.priceText)}</span>
                  <span>Suggested: {formatPrice(item.suggestedSetupPrice, item.suggestedMonthlyPrice, item.priceText)}</span>
                </div>
                {item.notes && <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>{item.notes}</p>}
                <details>
                  <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>Edit</summary>
                  <form
                    action={updateServiceItemAction.bind(null, item.id)}
                    style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
                  >
                    <input className="gh-input" name="deliverable" defaultValue={item.deliverable} required />
                    <label style={{ fontSize: "var(--gh-text-sm)" }}>
                      <input type="checkbox" name="isRecurring" defaultChecked={item.isRecurring} /> Recurring
                    </label>
                    <select className="gh-input" name="billingType" defaultValue={item.billingType}>
                      {BILLING_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
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
                <form action={softDeleteServiceItemAction.bind(null, item.id)}>
                  <button className="gh-btn-secondary" type="submit" style={{ color: "var(--gh-danger)" }}>Remove</button>
                </form>
              </div>
            ))}
            {modItems.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No items in this module yet.</p>}

            <details>
              <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add item to {mod.code}</summary>
              <form
                action={createServiceItemAction.bind(null, mod.code)}
                style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-4)" }}
              >
                <input className="gh-input" name="id" placeholder={`${mod.code.toLowerCase()}-new-item-id`} required />
                <input className="gh-input" name="deliverable" placeholder="Deliverable name" required />
                <label style={{ fontSize: "var(--gh-text-sm)" }}>
                  <input type="checkbox" name="isRecurring" /> Recurring
                </label>
                <select className="gh-input" name="billingType" defaultValue="one_off">
                  {BILLING_TYPES.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
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
          </section>
        );
      })}
    </div>
  );
}
