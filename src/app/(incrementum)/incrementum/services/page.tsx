import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listCatalogueItems, listPriceHistory } from "@/lib/dal/incrementum/services";
import { SERVICE_BILLING, SERVICE_BILLING_LABELS, QUOTE_BASES, QUOTE_BASIS_LABELS } from "@/lib/incrementum/registry";
import { money, shortDate } from "@/lib/incrementum/format";
import { clientsForTarget, toNum } from "@/lib/incrementum/pricing";
import { PageHead, Flash, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import type { ServiceView } from "@/lib/incrementum/compute";
import {
  createServiceAction,
  updateServiceAction,
  setServiceStatusAction,
  deleteServiceAction,
  createPackageAction,
  updatePackageAction,
  deletePackageAction,
  addPackageServiceAction,
  togglePackageServiceWaivedAction,
  removePackageServiceAction,
} from "../actions";

const BACK = "/incrementum/services";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual override",
  cost_plus: "Quote + markup",
  catalogue_floor: "Raised to catalogue",
  catalogue: "Catalogue (no quote yet)",
  none: "No price",
};

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const [s, catalogue, history] = await Promise.all([getIncrementumSnapshot(), listCatalogueItems(), listPriceHistory()]);
  const defaultMarkup = toNum(s.state.settings.defaultMarkupPct) ?? 33;
  const freedom = toNum(s.state.settings.freedomTarget) ?? 10000;
  const active = s.services.filter((x) => x.status === "active");
  const retired = s.services.filter((x) => x.status !== "active");

  return (
    <>
      <PageHead
        eyebrow="Sell"
        title={
          <>
            Services &amp; <em>Pricing</em>
          </>
        }
        lede={`Sell price = contractor quote × (1 + markup). Default markup ${defaultMarkup}% (Settings). A layer over the main catalogue: nothing here changes /pricing or Apexus. Every price move is logged.`}
      />
      <Flash ok={ok} error={error} />

      <div className="inc-callout">
        <strong>The {defaultMarkup}% rule, honestly:</strong> a {defaultMarkup}% markup keeps ~{Math.round((defaultMarkup / (100 + defaultMarkup)) * 100)}% of the price, so profit depends on what the contractor charges and a
        cheaper contractor means a cheaper price, not more profit. Tick <em>Catalogue floor</em> on a service to sell at whichever is higher: quote + markup, or the catalogue price.
      </div>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Price <em>list</em>
        </h2>
        <div className="gh-table-wrap">
          <table className="gh-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Billing</th>
                <th className="gh-table-num">Quote</th>
                <th className="gh-table-num">Markup</th>
                <th className="gh-table-num">Sell price</th>
                <th className="gh-table-num">Catalogue</th>
                <th className="gh-table-num">Profit</th>
                <th>Price from</th>
              </tr>
            </thead>
            <tbody>
              {active.map((sv) => (
                <tr key={sv.id}>
                  <td>
                    <a className="inc-link" href={`#svc-${sv.id}`} style={{ textTransform: "none", letterSpacing: 0, fontSize: "var(--gh-text-sm)" }}>
                      {sv.name}
                    </a>
                    {sv.usuallyWaived && <> <Chip tone="accent">Usually waived</Chip></>}
                    {sv.tags?.length ? <div className="inc-small">{sv.tags.join(" · ")}</div> : null}
                  </td>
                  <td>{SERVICE_BILLING_LABELS[sv.billing as keyof typeof SERVICE_BILLING_LABELS] ?? sv.billing}</td>
                  <td className="gh-table-num">
                    {money(sv.price.quote)}
                    <div className="inc-small">{sv.price.quoteSource === "bench" ? `${sv.benchQuotes.length} bench quote${sv.benchQuotes.length === 1 ? "" : "s"}` : sv.price.quoteSource === "expected" ? "expected" : ""}</div>
                  </td>
                  <td className="gh-table-num">{sv.effectiveMarkupPct}%</td>
                  <td className="gh-table-num">
                    <strong>{sv.billing === "range" ? "By size" : money(sv.price.sellPrice)}</strong>
                  </td>
                  <td className="gh-table-num">{sv.billing === "range" ? sv.cataloguePriceText ?? "—" : money(sv.price.cataloguePrice)}</td>
                  <td className="gh-table-num">
                    {money(sv.price.profit)}
                    <div className="inc-small">{sv.price.marginPct !== null ? `${sv.price.marginPct}% margin` : ""}</div>
                  </td>
                  <td className="inc-small">{SOURCE_LABEL[sv.price.priceSource]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="inc-panel">
        <div className="inc-cell-head">
          <h2 className="inc-cell-title">
            Packages <em>(offers)</em>
          </h2>
          <span className="inc-small">Bundle discounts from the pricing framework: 8 / 12 / 15% recurring, 5 / 10% setup</span>
        </div>
        <div className="inc-grid">
          {s.packages.map((p) => {
            const t = p.totals;
            const toTarget = clientsForTarget(freedom, t.monthlyProfit);
            const belowPass = t.monthlyProfit < 700;
            return (
              <div className="inc-cell inc-span-6" key={p.id} id={`pkg-${p.id}`}>
                <div className="inc-cell-head">
                  <h3 className="inc-cell-title">
                    <em>{p.name}</em>
                  </h3>
                  <Chip tone={p.status === "live" ? "good" : p.status === "retired" ? undefined : "accent"}>{p.status}</Chip>
                </div>
                {p.description && <p className="inc-muted">{p.description}</p>}
                <div className="inc-stats">
                  <div className="inc-stat">
                    <span className="inc-small">Monthly price</span>
                    <span className="inc-stat-value">{money(t.monthlyPrice)}</span>
                    <span className="inc-small">
                      {p.manualMonthlyPrice !== null ? `your price · calculated ${money(p.calculated.monthlyPrice)}` : t.recurringDiscountPct ? `${t.recurringDiscountPct}% bundle off ${money(t.recurringSubtotal)}` : "no bundle discount"}
                    </span>
                  </div>
                  <div className="inc-stat">
                    <span className="inc-small">Profit / client / mo</span>
                    <span className="inc-stat-value" style={{ color: belowPass ? "var(--gh-danger)" : "var(--gh-success)" }}>
                      {money(t.monthlyProfit)}
                    </span>
                    <span className="inc-small">
                      {t.marginPct ?? "—"}% margin · {t.markupPct ?? "—"}% markup
                    </span>
                  </div>
                  <div className="inc-stat">
                    <span className="inc-small">Clients for {money(freedom)}</span>
                    <span className="inc-stat-value">{toTarget ?? "—"}</span>
                    <span className="inc-small">at this package alone</span>
                  </div>
                  <div className="inc-stat">
                    <span className="inc-small">Setup</span>
                    <span className="inc-stat-value">{money(t.setupPrice)}</span>
                    <span className="inc-small">{t.waivedValue ? `+ ${money(t.waivedValue)} waived` : ""}</span>
                  </div>
                </div>
                {belowPass && <p className="inc-callout" data-tone="danger">Under the $700/month pass line (plan §1.1).</p>}
                {t.missingPrices > 0 && <p className="inc-small">{t.missingPrices} line(s) have no price yet.</p>}
                <div className="inc-list">
                  {p.lines.map((l) => (
                    <div className="inc-row" key={l.id}>
                      <span className="inc-row-main">
                        <Chip>{l.kind}</Chip>
                        <span style={{ textDecoration: l.waived ? "line-through" : undefined }}>{l.name}</span>
                      </span>
                      <span className="inc-inline">
                        <span className="inc-num">{money(l.sellPrice)}</span>
                        {l.kind === "setup" && (
                          <form action={togglePackageServiceWaivedAction}>
                            <input type="hidden" name="_back" value={`${BACK}#pkg-${p.id}`} />
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="waived" value={l.waived ? "" : "on"} />
                            <button className="gh-link-btn" type="submit">
                              {l.waived ? "Charge" : "Waive"}
                            </button>
                          </form>
                        )}
                        <form action={removePackageServiceAction}>
                          <input type="hidden" name="_back" value={`${BACK}#pkg-${p.id}`} />
                          <input type="hidden" name="id" value={l.id} />
                          <button className="gh-link-btn" type="submit" aria-label={`Remove ${l.name}`}>
                            ×
                          </button>
                        </form>
                      </span>
                    </div>
                  ))}
                </div>
                <form action={addPackageServiceAction} className="inc-inline">
                  <input type="hidden" name="_back" value={`${BACK}#pkg-${p.id}`} />
                  <input type="hidden" name="packageId" value={p.id} />
                  <select className="gh-input" name="serviceId" required aria-label="Service" style={{ flex: 1 }}>
                    {active.map((sv) => (
                      <option key={sv.id} value={sv.id}>
                        {sv.name}
                      </option>
                    ))}
                  </select>
                  <select className="gh-input" name="kind" defaultValue="recurring" aria-label="Kind">
                    <option value="recurring">Recurring</option>
                    <option value="setup">Setup</option>
                  </select>
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">Add</SubmitButton>
                </form>
                <details className="inc-disclosure">
                  <summary>Edit package</summary>
                  <PackageForm action={updatePackageAction} p={p} />
                  <form action={deletePackageAction} style={{ marginTop: "var(--gh-space-2)" }}>
                    <input type="hidden" name="_back" value={BACK} />
                    <input type="hidden" name="id" value={p.id} />
                    <button className="gh-link-btn gh-link-btn--danger" type="submit">
                      Delete package
                    </button>
                  </form>
                </details>
              </div>
            );
          })}
          <div className="inc-cell inc-span-6">
            <h3 className="inc-cell-title">
              New <em>package</em>
            </h3>
            <PackageForm action={createPackageAction} />
          </div>
        </div>
      </section>

      {active.map((sv) => (
        <section className="inc-panel" key={sv.id} id={`svc-${sv.id}`}>
          <div className="inc-cell-head">
            <h2 className="inc-cell-title">{sv.name}</h2>
            <span className="inc-small">{sv.catalogueName ? `Catalogue: ${sv.serviceItemId}` : "Incrementum-only service"}</span>
          </div>
          {sv.benchQuotes.length > 0 && (
            <p className="inc-small">Bench quotes: {sv.benchQuotes.map((q) => `${q.name} ${money(q.rate)}/${q.rateType === "monthly" ? "mo" : q.rateType}`).join(" · ")}</p>
          )}
          {sv.ranges?.length ? (
            <p className="inc-small">Bands: {sv.ranges.map((r) => `${r.label} ${money(r.min)}${r.max ? `–${money(r.max)}` : "+"}`).join(" · ")}</p>
          ) : null}
          <ServiceForm sv={sv} catalogue={catalogue} />
          <div className="inc-inline">
            <form action={setServiceStatusAction}>
              <input type="hidden" name="_back" value={BACK} />
              <input type="hidden" name="id" value={sv.id} />
              <input type="hidden" name="status" value="retired" />
              <button className="gh-link-btn" type="submit">
                Retire service
              </button>
            </form>
          </div>
        </section>
      ))}

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          New <em>service</em>
        </h2>
        <ServiceForm catalogue={catalogue} />
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Price <em>history</em>
        </h2>
        {history.length === 0 ? (
          <p className="inc-muted">No price changes yet.</p>
        ) : (
          <div className="inc-list">
            {history.map(({ row, serviceName }) => (
              <div className="inc-row" key={row.id}>
                <span>
                  {serviceName}: {money(row.oldPrice)} → <strong>{money(row.newPrice)}</strong>
                </span>
                <span className="inc-small">
                  {row.reason} · {shortDate(row.createdAt, true)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {retired.length > 0 && (
        <section className="inc-panel">
          <h2 className="inc-cell-title">
            Retired <em>services</em>
          </h2>
          {retired.map((sv) => (
            <div className="inc-row" key={sv.id}>
              <span className="inc-muted">{sv.name}</span>
              <span className="inc-inline">
                <form action={setServiceStatusAction}>
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={sv.id} />
                  <input type="hidden" name="status" value="active" />
                  <button className="gh-link-btn" type="submit">
                    Restore
                  </button>
                </form>
                <form action={deleteServiceAction}>
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="id" value={sv.id} />
                  <button className="gh-link-btn gh-link-btn--danger" type="submit">
                    Delete
                  </button>
                </form>
              </span>
            </div>
          ))}
        </section>
      )}
      <IncrementumReadySignal />
    </>
  );
}

function ServiceForm({ sv, catalogue }: { sv?: ServiceView; catalogue: { id: string; moduleCode: string; deliverable: string }[] }) {
  return (
    <form action={sv ? updateServiceAction : createServiceAction} className="inc-form">
      <input type="hidden" name="_back" value={sv ? `${BACK}#svc-${sv.id}` : BACK} />
      {sv && <input type="hidden" name="id" value={sv.id} />}
      <label className="inc-field">
        Name
        <input className="gh-input" name="name" defaultValue={sv?.name ?? ""} required />
      </label>
      <label className="inc-field">
        Catalogue item
        <select className="gh-input" name="serviceItemId" defaultValue={sv?.serviceItemId ?? ""}>
          <option value="">None (Incrementum-only)</option>
          {catalogue.map((c) => (
            <option key={c.id} value={c.id}>
              {c.moduleCode} · {c.deliverable}
            </option>
          ))}
        </select>
      </label>
      <label className="inc-field">
        Billing
        <select className="gh-input" name="billing" defaultValue={sv?.billing ?? "monthly"}>
          {SERVICE_BILLING.map((b) => (
            <option key={b} value={b}>
              {SERVICE_BILLING_LABELS[b]}
            </option>
          ))}
        </select>
      </label>
      <label className="inc-field">
        Price on
        <select className="gh-input" name="quoteBasis" defaultValue={sv?.quoteBasis ?? "highest"}>
          {QUOTE_BASES.map((q) => (
            <option key={q} value={q}>
              {QUOTE_BASIS_LABELS[q]}
            </option>
          ))}
        </select>
      </label>
      <label className="inc-field">
        Expected quote ($)
        <input className="gh-input" name="expectedQuote" defaultValue={sv?.expectedQuote ?? ""} inputMode="decimal" />
      </label>
      <label className="inc-field">
        Markup % (blank = default)
        <input className="gh-input" name="markupPct" defaultValue={sv?.markupPct ?? ""} inputMode="decimal" />
      </label>
      <label className="inc-field">
        Manual price override ($)
        <input className="gh-input" name="manualPrice" defaultValue={sv?.manualPrice ?? ""} inputMode="decimal" />
      </label>
      <label className="inc-field">
        GST
        <select className="gh-input" name="gstBasis" defaultValue={sv?.gstBasis ?? "exclusive"}>
          <option value="exclusive">Exclusive</option>
          <option value="inclusive">Inclusive</option>
        </select>
      </label>
      <label className="inc-inline" style={{ fontSize: "var(--gh-text-sm)" }}>
        <input type="checkbox" name="catalogueFloor" defaultChecked={sv?.catalogueFloor ?? false} /> Catalogue floor
      </label>
      <label className="inc-inline" style={{ fontSize: "var(--gh-text-sm)" }}>
        <input type="checkbox" name="usuallyWaived" defaultChecked={sv?.usuallyWaived ?? false} /> Usually waived
      </label>
      <label className="inc-field inc-field--wide">
        Tags (comma-separated identifiers used to match contractors to client needs)
        <input className="gh-input" name="tags" defaultValue={(sv?.tags ?? []).join(", ")} placeholder="google-ads, ppc, paid-search" />
      </label>
      <label className="inc-field inc-field--wide">
        Competitor prices (NZ market check)
        <textarea className="gh-input" name="competitorNotes" defaultValue={sv?.competitorNotes ?? ""} placeholder="Agency A $1,200/mo · Agency B from $900/mo …" />
      </label>
      <label className="inc-field inc-field--wide">
        Notes
        <input className="gh-input" name="notes" defaultValue={sv?.notes ?? ""} />
      </label>
      {sv && (
        <label className="inc-field inc-field--wide">
          Why the change? (goes in price history)
          <input className="gh-input" name="reason" />
        </label>
      )}
      <SubmitButton pendingLabel="Saving…">{sv ? "Save service" : "Add service"}</SubmitButton>
    </form>
  );
}

function PackageForm({
  action,
  p,
}: {
  action: (fd: FormData) => Promise<void>;
  p?: {
    id: string;
    name: string;
    description: string | null;
    inclusions: string | null;
    exclusions: string | null;
    deliverables: string | null;
    minTermMonths: number;
    noticeDays: number;
    landingUrl: string | null;
    manualMonthlyPrice: string | null;
    manualSetupPrice: string | null;
    status: string;
  };
}) {
  return (
    <form action={action} className="inc-form">
      <input type="hidden" name="_back" value={p ? `${BACK}#pkg-${p.id}` : BACK} />
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className="inc-field">
        Name
        <input className="gh-input" name="name" defaultValue={p?.name ?? ""} required />
      </label>
      <label className="inc-field">
        Status
        <select className="gh-input" name="status" defaultValue={p?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="live">Live</option>
          <option value="retired">Retired</option>
        </select>
      </label>
      <label className="inc-field">
        Min term (months)
        <input className="gh-input" name="minTermMonths" type="number" defaultValue={p?.minTermMonths ?? 3} />
      </label>
      <label className="inc-field">
        Notice (days)
        <input className="gh-input" name="noticeDays" type="number" defaultValue={p?.noticeDays ?? 30} />
      </label>
      <label className="inc-field inc-field--wide">
        Description
        <input className="gh-input" name="description" defaultValue={p?.description ?? ""} />
      </label>
      <label className="inc-field inc-field--wide">
        What&apos;s included
        <textarea className="gh-input" name="inclusions" defaultValue={p?.inclusions ?? ""} />
      </label>
      <label className="inc-field inc-field--wide">
        Not included
        <textarea className="gh-input" name="exclusions" defaultValue={p?.exclusions ?? ""} />
      </label>
      <label className="inc-field inc-field--wide">
        Monthly deliverables
        <textarea className="gh-input" name="deliverables" defaultValue={p?.deliverables ?? ""} />
      </label>
      <label className="inc-field inc-field--wide">
        Landing page URL
        <input className="gh-input" name="landingUrl" defaultValue={p?.landingUrl ?? ""} />
      </label>
      <label className="inc-field">
        Your monthly price ($, blank = calculated)
        <input className="gh-input" name="manualMonthlyPrice" defaultValue={p?.manualMonthlyPrice ?? ""} inputMode="decimal" />
      </label>
      <label className="inc-field">
        Your setup price ($, blank = calculated)
        <input className="gh-input" name="manualSetupPrice" defaultValue={p?.manualSetupPrice ?? ""} inputMode="decimal" />
      </label>
      <SubmitButton pendingLabel="Saving…">{p ? "Save package" : "Add package"}</SubmitButton>
    </form>
  );
}
