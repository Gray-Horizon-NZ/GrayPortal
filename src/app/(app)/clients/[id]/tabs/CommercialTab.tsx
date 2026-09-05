import SubmitButton from "@/components/ui/SubmitButton";
import {
  updateClientDiscountAction,
  removeClientServiceAction,
  updateClientServicePriceAction,
  addClientServiceAction,
  addClientDealAction,
  createReferralAction,
  markGrayscaleRequestContactedAction,
} from "../../actions";
import ReferralStatusSelect from "../ReferralStatusSelect";
import type {
  ClientRecord,
  ClientServiceItem,
  ServiceCatalogueItem,
  ClientReferral,
  ActiveDiscount,
  GrayscaleRequest,
  CompanyDetailData,
} from "./types";

export default function CommercialTab({
  client,
  clientServices,
  serviceCatalogue,
  activeMonthlyTotal,
  overallDiscountPercent,
  finalMonthlyTotal,
  companyData,
  referrals,
  activeDiscounts,
  grayscaleRequests,
}: {
  client: ClientRecord;
  clientServices: ClientServiceItem[];
  serviceCatalogue: ServiceCatalogueItem[];
  activeMonthlyTotal: number;
  overallDiscountPercent: number;
  finalMonthlyTotal: number;
  companyData: CompanyDetailData | null;
  referrals: ClientReferral[];
  activeDiscounts: ActiveDiscount[];
  grayscaleRequests: GrayscaleRequest[];
}) {
  return (
    <div className="gh-tab-grid">
      <div className="gh-tab-grid-col">
      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="gh-eyebrow">Services</p>
          <div style={{ textAlign: "right", fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
            <div>Subtotal: ${activeMonthlyTotal.toLocaleString("en-NZ")}</div>
            {overallDiscountPercent > 0 && (
              <div>
                {overallDiscountPercent}% off → <strong style={{ color: "var(--gh-text-primary)" }}>${finalMonthlyTotal.toLocaleString("en-NZ")}</strong>/mo
              </div>
            )}
            {overallDiscountPercent === 0 && (
              <div><strong style={{ color: "var(--gh-text-primary)" }}>${finalMonthlyTotal.toLocaleString("en-NZ")}</strong>/mo</div>
            )}
          </div>
        </div>

        <details>
          <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
            Overall discount ({overallDiscountPercent}%)
          </summary>
          <form
            action={updateClientDiscountAction.bind(null, client.id)}
            style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
          >
            <input
              className="gh-input"
              name="overallDiscountPercent"
              placeholder="Overall discount %"
              defaultValue={client.overallDiscountPercent ?? ""}
              style={{ maxWidth: 200 }}
            />
            <SubmitButton className="gh-btn-secondary" pendingLabel="Saving…">Save</SubmitButton>
          </form>
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
            Applied on top of the subtotal below — e.g. a $2,400 package at 33% off nets $1,608/mo. Leave blank for no discount.
          </p>
        </details>

        {clientServices.map((s) => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", paddingBottom: "var(--gh-space-2)", borderBottom: "1px solid var(--gh-border)" }}>
            <div className="gh-item-row" style={{ border: "none", padding: 0 }}>
              <div className="gh-item-row-info">
                <span className="t">
                  {s.deliverable} <span className="gh-badge" data-status={s.status === "active" ? "success" : undefined}>{s.status}</span>
                </span>
                <div className="d">
                  ${s.customMonthlyPrice ?? s.currentMonthlyPrice ?? s.customSetupPrice ?? s.currentSetupPrice ?? "—"}
                  {s.customMonthlyPrice != null && s.currentMonthlyPrice != null && s.customMonthlyPrice !== s.currentMonthlyPrice && (
                    <> (catalogue: ${s.currentMonthlyPrice})</>
                  )}
                  {s.discountPercent != null && Number(s.discountPercent) > 0 && <> — {s.discountPercent}% off this item</>}
                </div>
              </div>
              <div className="gh-item-row-actions">
                <form action={removeClientServiceAction.bind(null, s.id, client.id)}>
                  <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
                </form>
              </div>
            </div>
            <details>
              <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                Override rate / discount
              </summary>
              <form
                action={updateClientServicePriceAction.bind(null, s.id, client.id)}
                style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)", flexWrap: "wrap" }}
              >
                <input
                  className="gh-input"
                  name="customMonthlyPrice"
                  placeholder="Custom monthly price"
                  defaultValue={s.customMonthlyPrice ?? ""}
                  style={{ maxWidth: 200 }}
                />
                <input
                  className="gh-input"
                  name="customSetupPrice"
                  placeholder="Custom setup price"
                  defaultValue={s.customSetupPrice ?? ""}
                  style={{ maxWidth: 200 }}
                />
                <input
                  className="gh-input"
                  name="discountPercent"
                  placeholder="This item's discount %"
                  defaultValue={s.discountPercent ?? ""}
                  style={{ maxWidth: 200 }}
                />
                <SubmitButton className="gh-btn-secondary" pendingLabel="Saving…">Save</SubmitButton>
              </form>
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                Leave price blank to revert to the catalogue price (${s.currentMonthlyPrice ?? s.currentSetupPrice ?? "—"}). Leave discount blank for none.
              </p>
            </details>
          </div>
        ))}
        {clientServices.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No services attached yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Add service</summary>
            <form action={addClientServiceAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <select className="gh-input" name="serviceItemId" required defaultValue="">
                <option value="" disabled>Select a catalogue item…</option>
                {serviceCatalogue.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.moduleCode} — {item.deliverable}
                  </option>
                ))}
              </select>
              <input className="gh-input" name="customMonthlyPrice" placeholder="Custom monthly price (optional)" />
              <input className="gh-input" name="customSetupPrice" placeholder="Custom setup price (optional)" />
              <input className="gh-input" name="discountPercent" placeholder="Discount % on this item (optional)" />
              <input className="gh-input" name="startedOn" type="date" />
              <SubmitButton>Add service</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Referrals</p>
        {referrals.map((r) => (
          <div key={r.id} className="gh-item-row">
            <span>{r.referredName}</span>
            <ReferralStatusSelect referralId={r.id} clientId={client.id} status={r.status} />
          </div>
        ))}
        {referrals.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No referrals yet.</p>}
        {activeDiscounts.length > 0 && (
          <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
            Active discount: {activeDiscounts.reduce((sum, d) => sum + Number(d.discountPercent), 0)}%
            {" "}(from {activeDiscounts.length} converted referral{activeDiscounts.length === 1 ? "" : "s"})
          </p>
        )}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Log referral</summary>
            <form action={createReferralAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="referredName" placeholder="Who they referred" required />
              <textarea className="gh-input" name="notes" placeholder="Notes" rows={2} />
              <SubmitButton>Log referral</SubmitButton>
            </form>
          </details>
        </div>
      </section>
      </div>

      <div className="gh-tab-grid-col">
      {grayscaleRequests.length > 0 && (
        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">GrayScale requests</p>
          {grayscaleRequests.map((r) => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "var(--gh-text-sm)" }}>
                <span>{r.products.join(", ")}</span>
                <span className="gh-badge" data-status={r.status === "new" ? "warning" : "success"}>
                  {r.status}
                </span>
              </div>
              {r.note && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>{r.note}</p>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
                  {new Date(r.createdAt).toLocaleDateString("en-NZ")}
                </span>
                {r.status === "new" && (
                  <form action={markGrayscaleRequestContactedAction.bind(null, client.id, r.id)}>
                    <SubmitButton className="gh-btn-secondary">Mark contacted</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {client.companyId && (
        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">New deal</p>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
            For upselling an existing client — creates a real pipeline deal against this client&apos;s company, same as Pipeline or the company page.
          </p>
          <form
            action={addClientDealAction.bind(null, client.id, client.companyId)}
            style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
          >
            {companyData && companyData.contacts.length > 0 && (
              <select className="gh-input" name="primaryContactId" defaultValue="">
                <option value="">Primary contact (optional)…</option>
                {companyData.contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            )}
            <input className="gh-input" name="nextAction" placeholder="Next action (required)" required />
            <input className="gh-input" name="nextActionDate" type="date" required />
            <input className="gh-input" name="valueNzd" placeholder="Value (NZD)" />
            <input className="gh-input" name="packageTier" placeholder="Package tier" />
            <input className="gh-input" name="source" placeholder="Source" defaultValue="Upsell" />
            <SubmitButton pendingLabel="Creating…">Create deal</SubmitButton>
          </form>
        </section>
      )}
      </div>
    </div>
  );
}
