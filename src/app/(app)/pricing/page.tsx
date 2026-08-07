import Link from "next/link";
import { listServiceModules, listServiceItems } from "@/lib/dal/pricing";
import { createServiceItemAction, updateServiceItemAction, softDeleteServiceItemAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

function formatPrice(setup: string | null, monthly: string | null, text: string | null) {
  const parts: string[] = [];
  if (setup) parts.push(`$${Number(setup).toLocaleString()}`);
  if (monthly) parts.push(`$${Number(monthly).toLocaleString()}/mo`);
  if (parts.length === 0) return text || "—";
  return parts.join(" + ");
}

function priceSortValue(item: { suggestedMonthlyPrice: string | null; suggestedSetupPrice: string | null; currentMonthlyPrice: string | null; currentSetupPrice: string | null }) {
  return Number(item.suggestedMonthlyPrice ?? item.suggestedSetupPrice ?? item.currentMonthlyPrice ?? item.currentSetupPrice ?? 0);
}

const BILLING_TYPES = ["one_off", "monthly", "range", "custom"] as const;
const BILLING_LABEL: Record<(typeof BILLING_TYPES)[number], string> = {
  one_off: "One-off",
  monthly: "Monthly",
  range: "Range",
  custom: "Custom",
};

// The 6 Web Dev tiers render as one dedicated tile at the bottom of GA
// instead of as ordinary cards in the flat grid (see the Website Dev tile
// block below) — filtered out of the normal per-module map by id prefix.
const WEBDEV_TIER_IDS = [
  { id: "ga-webdev-single", label: "Single-page site" },
  { id: "ga-webdev-small", label: "<5 pages" },
  { id: "ga-webdev-medium", label: "<10 pages" },
  { id: "ga-webdev-large", label: "<19 pages" },
  { id: "ga-webdev-custom", label: "20+ pages" },
];
const WEBDEV_CLOUDFLARE_ID = "ga-webdev-cloudflare";
const WEBDEV_IDS = new Set([...WEBDEV_TIER_IDS.map((t) => t.id), WEBDEV_CLOUDFLARE_ID]);

type SortKey = "price_asc" | "price_desc";
type BillingFilter = "recurring" | "one_off";

function withParams(params: { q?: string; billing?: string; sort?: string }) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>);
  const s = qs.toString();
  return `/pricing${s ? `?${s}` : ""}`;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; billing?: string; sort?: string }>;
}) {
  const { q, billing, sort } = await searchParams;
  const [modules, allItems] = await Promise.all([listServiceModules(), listServiceItems()]);

  let items = allItems;
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((it) => it.deliverable.toLowerCase().includes(needle));
  }
  if (billing === "recurring") items = items.filter((it) => it.billingType === "monthly");
  if (billing === "one_off") items = items.filter((it) => it.billingType !== "monthly");
  if (sort === "price_asc") items = [...items].sort((a, b) => priceSortValue(a) - priceSortValue(b));
  if (sort === "price_desc") items = [...items].sort((a, b) => priceSortValue(b) - priceSortValue(a));

  const webdevItems = allItems.filter((it) => WEBDEV_IDS.has(it.id));
  const webdevCloudflare = webdevItems.find((it) => it.id === WEBDEV_CLOUDFLARE_ID);

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

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <form className="gh-list-toolbar">
          <input className="gh-input gh-list-toolbar-search" type="text" name="q" defaultValue={q} placeholder="Search deliverables…" />
          {billing && <input type="hidden" name="billing" value={billing} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          <button className="gh-btn-secondary" type="submit">Search</button>
        </form>

        <div className="gh-filter-row">
          <Link className="gh-filter" data-active={!billing ? "true" : undefined} href={withParams({ q, sort })}>All</Link>
          <Link className="gh-filter" data-active={billing === "recurring" ? "true" : undefined} href={withParams({ q, sort, billing: "recurring" as BillingFilter })}>Recurring</Link>
          <Link className="gh-filter" data-active={billing === "one_off" ? "true" : undefined} href={withParams({ q, sort, billing: "one_off" as BillingFilter })}>One-off</Link>
          <Link className="gh-filter" data-active={sort === "price_asc" ? "true" : undefined} href={withParams({ q, billing, sort: "price_asc" as SortKey })}>Price: low → high</Link>
          <Link className="gh-filter" data-active={sort === "price_desc" ? "true" : undefined} href={withParams({ q, billing, sort: "price_desc" as SortKey })}>Price: high → low</Link>
        </div>
      </div>

      {modules.map((mod) => {
        const modItems = items.filter((it) => it.moduleCode === mod.code && !WEBDEV_IDS.has(it.id));
        return (
          <div key={mod.code}>
            <div className="gh-cat-head">
              <div className="gh-cat-code">
                {mod.code}
                <span>{mod.name}</span>
              </div>
              {mod.focus && <div className="gh-cat-desc">{mod.focus}</div>}
            </div>

            <div className="gh-grid-joined gh-grid-joined--3 gh-grid-joined--pricing">
              {modItems.map((item) => (
                <div key={item.id} className="gh-grid-cell gh-grid-cell--interactive">
                  <div className="gh-card-top">
                    <div>
                      <p style={{ fontSize: "var(--gh-text-base)", fontWeight: 600 }}>{item.deliverable}</p>
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
                      <p className="gh-rate-val gh-rate-val--accent">{formatPrice(item.currentSetupPrice, item.currentMonthlyPrice, item.priceText)}</p>
                    </div>
                    {(item.suggestedSetupPrice || item.suggestedMonthlyPrice) && (
                      <div>
                        <p className="gh-rate-label">Suggested</p>
                        <p className="gh-rate-val">
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
                      <SubmitButton>Save</SubmitButton>
                    </form>
                    <form action={softDeleteServiceItemAction.bind(null, item.id)} style={{ marginTop: "var(--gh-space-2)" }}>
                      <SubmitButton
                        className="gh-btn-secondary"
                        style={{ color: "var(--gh-danger)", borderColor: "var(--gh-danger)", fontSize: "var(--gh-text-micro)", padding: "var(--gh-space-1) var(--gh-space-2)" }}
                      >
                        Remove
                      </SubmitButton>
                    </form>
                  </details>
                </div>
              ))}

              {mod.code === "GA" && webdevItems.length > 0 && (
                <div className="gh-grid-cell" style={{ gridColumn: "1 / -1" }}>
                  <div className="gh-card-top">
                    <p style={{ fontSize: "var(--gh-text-base)", fontWeight: 600 }}>Website Development</p>
                    <span className="gh-badge">One-off</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", marginTop: "var(--gh-space-2)" }}>
                    {WEBDEV_TIER_IDS.map((tier) => {
                      const item = webdevItems.find((it) => it.id === tier.id);
                      if (!item) return null;
                      return (
                        <details key={tier.id}>
                          <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-sm)", display: "flex", justifyContent: "space-between", padding: "var(--gh-space-2) 0" }}>
                            <span>{tier.label}</span>
                            <span className="gh-rate-val gh-rate-val--accent" style={{ fontSize: "var(--gh-text-sm)" }}>
                              {formatPrice(item.currentSetupPrice, item.currentMonthlyPrice, item.priceText)}
                            </span>
                          </summary>
                          {item.notes && (
                            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", paddingBottom: "var(--gh-space-2)" }}>{item.notes}</p>
                          )}
                        </details>
                      );
                    })}
                  </div>
                  {webdevCloudflare && (
                    <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-3)", paddingTop: "var(--gh-space-3)", borderTop: "1px solid var(--gh-border)" }}>
                      Included: {webdevCloudflare.deliverable}
                    </p>
                  )}
                </div>
              )}

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
                  <SubmitButton>Add item</SubmitButton>
                </form>
              </details>
            </div>
            {modItems.length === 0 && webdevItems.length === 0 && (
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
