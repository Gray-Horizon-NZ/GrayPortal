import { Tags, History, Archive as ArchiveIcon, Plus } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listCatalogueItems, listPriceHistory } from "@/lib/dal/incrementum/services";
import { SERVICE_BILLING, SERVICE_BILLING_LABELS, QUOTE_BASES, QUOTE_BASIS_LABELS } from "@/lib/incrementum/registry";
import { money } from "@/lib/incrementum/format";
import { clientsForTarget } from "@/lib/incrementum/pricing";
import type { ServiceView, PackageView } from "@/lib/incrementum/compute";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Panel, Badge, Priv, RowFold, AddRow, Field, Console, Csec, TermStatus, Ring, RingTile, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog, OpenDialog } from "@/components/incrementum/terminal/client";
import { longDate, n0, PASS_LINE } from "@/components/incrementum/terminal/helpers";
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

const BASE = "/incrementum/services";
const SOURCE_LABEL: Record<string, string> = { manual: "Manual override", cost_plus: "Quote + markup", catalogue_floor: "Raised to catalogue", catalogue: "Catalogue (no quote yet)", none: "No price" };
type Catalogue = { id: string; moduleCode: string; deliverable: string }[];
type Role = { id: string; name: string };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ pkg?: string }> }) {
  const sp = await searchParams;
  const [s, catalogue, history] = await Promise.all([getIncrementumSnapshot(), listCatalogueItems(), listPriceHistory()]);
  const markup = n0(s.state.settings.defaultMarkupPct) || 33;
  const freedom = n0(s.state.settings.freedomTarget);
  const active = s.services.filter((x) => x.status === "active");
  const retired = s.services.filter((x) => x.status !== "active");
  const roles = s.state.roles.filter((r) => !r.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name ?? null;
  const offers = s.packages.filter((p) => p.status !== "retired");
  const floors = active.filter((x) => x.price.priceSource === "catalogue_floor").length;

  return (
    <div className="screen">
      <PageHead title="Services & Pricing" sub="Sell price = contractor quote × (1 + markup). A layer over the main catalogue: nothing here changes /pricing or Apexus." />
      <Console>
        <Csec>
          <TermStatus label="Price book" value={`${markup}% markup`}>
            {offers.filter((p) => p.status === "live").length} live offers · {floors} services raised to the catalogue floor
          </TermStatus>
          <p className="csec-desc" style={{ marginTop: 10 }}>
            <b>The {markup}% rule, honestly:</b> a {markup}% markup keeps ~{Math.round((markup / (100 + markup)) * 100)}% of the price, so a cheaper contractor means a cheaper price, not more profit. Tick <em>Catalogue floor</em> to sell at whichever is higher: quote + markup, or the catalogue price.
          </p>
        </Csec>
        <Csec>
          <div className="csec-head">
            <span className="csec-title">Offers</span>
            <span className="csec-right">Ring = margin · centre = monthly price · bundle 8 / 12 / 15% recurring, 5 / 10% setup</span>
          </div>
          <div className="ringgrid" style={{ "--cols": 5 } as React.CSSProperties}>
            {offers.map((p) => {
              const t = p.totals;
              const pass = t.monthlyProfit >= PASS_LINE;
              return (
                <RingTile
                  key={p.id}
                  name={p.name.replace(" · ", " — ")}
                  active={sp.pkg === p.id}
                  dialog={`pkg-${p.id}`}
                  foot={
                    <span className={pass ? "tone-good" : "tone-bad"}>
                      Profit <Priv>{money(t.monthlyProfit)}</Priv>/mo
                    </span>
                  }
                  action={
                    <span className="pill" data-variant={pass ? undefined : "ghost"}>
                      Setup <Priv>{money(t.setupPrice)}</Priv>
                    </span>
                  }
                >
                  <Ring value={t.marginPct ?? 0} max={100} size={136} label={`${t.marginPct ?? 0}% margin`} center={<b><Priv>{money(t.monthlyPrice)}</Priv></b>} sub="per month" />
                </RingTile>
              );
            })}
            <OpenDialog target="pkg-new" className="ringtile ringtile-add">
              <Plus size={22} />
              <span>New package</span>
            </OpenDialog>
          </div>
        </Csec>
        <Csec className="flush">
          <div className="agency-list-head">
            <Tags size={14} /> Price list <span className="r">Click a service to edit it</span>
          </div>
          <div className="rowlist g-svc">
            <div className="rowlist-head g-svc">
              <span>Service</span>
              <span>Billing</span>
              <span className="num">Quote</span>
              <span className="num">Markup</span>
              <span className="num">Sell price</span>
              <span className="num">Profit</span>
              <span />
            </div>
            {active.map((sv) => (
              <RowFold
                key={sv.id}
                id={`svc-${sv.id}`}
                summary={
                  <>
                    <span className="rowfold-main">
                      <span>
                        <span className="strong" style={{ fontWeight: 500 }}>
                          {sv.name}
                        </span>{" "}
                        {sv.usuallyWaived && <Badge tone="accent">Usually waived</Badge>}
                        {sv.isAddon && <Badge>Add-on</Badge>}
                        {!sv.serviceItemId && <Badge tone="warn">Not linked to GrayPortal</Badge>}
                        <small>{roleName(sv.roleId) ?? "No contractor role (you)"}</small>
                      </span>
                    </span>
                    <span className="opt muted small">{SERVICE_BILLING_LABELS[sv.billing as keyof typeof SERVICE_BILLING_LABELS] ?? sv.billing}</span>
                    <span className="opt num">
                      <Priv>{money(sv.price.quote)}</Priv>
                      <small className="muted" style={{ display: "block", fontSize: 11 }}>
                        {sv.price.quoteSource === "bench" ? `${sv.benchQuotes.length} bench quote${sv.benchQuotes.length === 1 ? "" : "s"}` : sv.price.quoteSource === "expected" ? "expected" : ""}
                      </small>
                    </span>
                    <span className="opt num muted">{sv.effectiveMarkupPct}%</span>
                    <span className="num strong">{sv.billing === "range" ? "By size" : <Priv>{money(sv.price.sellPrice)}</Priv>}</span>
                    <span className="opt num">
                      <Priv>{money(sv.price.profit)}</Priv>
                      <small className="muted" style={{ display: "block", fontSize: 11 }}>
                        {sv.price.marginPct !== null ? `${sv.price.marginPct}% margin` : ""}
                      </small>
                    </span>
                  </>
                }
              >
                <p className="muted small">
                  {sv.catalogueName ? `GrayPortal service: ${sv.catalogueName}` : "Not linked to a GrayPortal service, so clients' GrayPortal Services tab won't show it. Pick its catalogue item below"} · Catalogue price {sv.billing === "range" ? (sv.cataloguePriceText ?? "by size") : <Priv>{money(sv.price.cataloguePrice)}</Priv>} · price from {SOURCE_LABEL[sv.price.priceSource]}
                  {sv.benchQuotes.length > 0 && <> · bench quotes: {sv.benchQuotes.map((q) => `${q.name} ${money(q.rate)}/${q.rateType === "monthly" ? "mo" : q.rateType}`).join(" · ")}</>}
                </p>
                {sv.notes && <p className="small">{sv.notes}</p>}
                {sv.ranges?.length ? <p className="muted small">Bands: {sv.ranges.map((r) => `${r.label} ${money(r.min)}${r.max ? `–${money(r.max)}` : "+"}`).join(" · ")}</p> : null}
                <ServiceForm sv={sv} catalogue={catalogue} roles={roles} />
              </RowFold>
            ))}
            <AddRow label="New service">
              <ServiceForm catalogue={catalogue} roles={roles} />
            </AddRow>
          </div>
        </Csec>
      </Console>

      {s.packages.map((p) => (
        <Dialog key={p.id} id={`pkg-${p.id}`} title={p.name} wide openOnLoad={sp.pkg === p.id}>
          <PackageBody p={p} active={active} freedom={freedom} />
        </Dialog>
      ))}
      <Dialog id="pkg-new" title="New package" wide>
        <PackageForm />
      </Dialog>

      <Panel title="Price history" icon={History} pad={false} right={`${history.length} change${history.length === 1 ? "" : "s"}`}>
        <RowFold summary={<span className="muted small">Every price move, with the reason. Click to show.</span>}>
          {history.length === 0 ? (
            <p className="muted small">No price changes yet.</p>
          ) : (
            <dl className="kv">
              {history.map(({ row, serviceName }) => (
                <div key={row.id}>
                  <dt>
                    {serviceName}: <Priv>{money(row.oldPrice)}</Priv> →{" "}
                    <b className="strong">
                      <Priv>{money(row.newPrice)}</Priv>
                    </b>
                  </dt>
                  <dd className="muted small">
                    {row.reason} · {longDate(row.createdAt)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </RowFold>
      </Panel>

      {retired.length > 0 && (
        <Panel title="Retired services" icon={ArchiveIcon} pad={false} right={retired.length}>
          <RowFold summary={<span className="muted small">{retired.map((x) => x.name).join(", ")}</span>}>
            <dl className="kv">
              {retired.map((sv) => (
                <div key={sv.id}>
                  <dt>{sv.name}</dt>
                  <dd className="row" style={{ justifyContent: "flex-end" }}>
                    <form action={setServiceStatusAction}>
                      <BackTo path={BASE} />
                      <HiddenFields values={{ id: sv.id, status: "active" }} />
                      <button type="submit" className="linkbtn">
                        Restore
                      </button>
                    </form>
                    <form action={deleteServiceAction}>
                      <BackTo path={BASE} />
                      <HiddenFields values={{ id: sv.id }} />
                      <button type="submit" className="linkbtn danger">
                        Delete
                      </button>
                    </form>
                  </dd>
                </div>
              ))}
            </dl>
          </RowFold>
        </Panel>
      )}
      <IncrementumReadySignal />
    </div>
  );
}

function PackageBody({ p, active, freedom }: { p: PackageView; active: ServiceView[]; freedom: number }) {
  const t = p.totals;
  const below = t.monthlyProfit < PASS_LINE;
  const toTarget = clientsForTarget(freedom, t.monthlyProfit);
  const back = `${BASE}?pkg=${p.id}`;
  return (
    <div className="stack" style={{ gap: 16 }}>
      {p.description && <p className="desc">{p.description}</p>}
      {(p.inclusions || p.deliverables || p.exclusions) && (
        <div className="grid g-3" style={{ gap: 16 }}>
          {(
            [
              ["Included", p.inclusions],
              ["Every month", p.deliverables],
              ["Not included", p.exclusions],
            ] as const
          ).map(([k, v]) =>
            v ? (
              <div key={k}>
                <p className="eyebrow" style={{ marginBottom: 4 }}>
                  {k}
                </p>
                <p className="small">{v}</p>
              </div>
            ) : null
          )}
        </div>
      )}
      <div className="kpis" style={{ border: "1px solid var(--t-line)" }}>
        <div>
          <div className="n">
            <Priv>{money(t.monthlyPrice)}</Priv>
          </div>
          <div className="l">Monthly · {p.manualMonthlyPrice !== null ? `your price (calc ${money(p.calculated.monthlyPrice)})` : t.recurringDiscountPct ? `${t.recurringDiscountPct}% bundle off ${money(t.recurringSubtotal)}` : "no bundle discount"}</div>
        </div>
        <div>
          <div className="n" data-tone={below ? "bad" : "good"}>
            <Priv>{money(t.monthlyProfit)}</Priv>
          </div>
          <div className="l">
            Profit / client / mo · {t.marginPct ?? "—"}% margin · {t.markupPct ?? "—"}% markup
          </div>
        </div>
        <div>
          <div className="n">{toTarget ?? "—"}</div>
          <div className="l">Clients for {money(freedom)}</div>
        </div>
        <div>
          <div className="n">
            <Priv>{money(t.setupPrice)}</Priv>
          </div>
          <div className="l">Setup{t.waivedValue ? ` · + ${money(t.waivedValue)} waived` : ""}</div>
        </div>
      </div>
      {below && (
        <p className="note note-bad" style={{ marginTop: 0 }}>
          Under the {money(PASS_LINE)}/month pass line (plan §1.1).
        </p>
      )}
      {t.missingPrices > 0 && <p className="muted small">{t.missingPrices} line(s) have no price yet.</p>}
      <div className="checklist">
        {p.lines.map((l) => (
          <div key={l.id}>
            <Badge>{l.kind}</Badge>
            <span style={{ flex: 1, textDecoration: l.waived ? "line-through" : undefined }}>{l.name}</span>
            <span className="num">
              <Priv>{money(l.sellPrice)}</Priv>
            </span>
            {l.kind === "setup" && (
              <form action={togglePackageServiceWaivedAction} data-keep-open="" style={{ display: "contents" }}>
                <BackTo path={back} />
                <HiddenFields values={{ id: l.id, waived: l.waived ? "" : "on" }} />
                <button type="submit" className="linkbtn">
                  {l.waived ? "Charge" : "Waive"}
                </button>
              </form>
            )}
            <form action={removePackageServiceAction} data-keep-open="" style={{ display: "contents" }}>
              <BackTo path={back} />
              <HiddenFields values={{ id: l.id }} />
              <button type="submit" className="linkbtn muted" aria-label={`Remove ${l.name}`}>
                ×
              </button>
            </form>
          </div>
        ))}
      </div>
      <form className="row" action={addPackageServiceAction} data-keep-open="">
        <BackTo path={back} />
        <HiddenFields values={{ packageId: p.id }} />
        <select className="select" name="serviceId" required style={{ flex: 1, width: "auto" }} aria-label="Service">
          {active.map((sv) => (
            <option key={sv.id} value={sv.id}>
              {sv.name}
            </option>
          ))}
        </select>
        <select className="select" name="kind" defaultValue="recurring" style={{ width: 140 }} aria-label="Kind">
          <option value="recurring">Recurring</option>
          <option value="setup">Setup</option>
        </select>
        <SubmitButton className="btn" pendingLabel="…">
          Add
        </SubmitButton>
      </form>
      <details className="inline-details">
        <summary>Edit package details</summary>
        <PackageForm p={p} />
      </details>
    </div>
  );
}

function ServiceForm({ sv, catalogue, roles }: { sv?: ServiceView; catalogue: Catalogue; roles: Role[] }) {
  return (
    <>
      <form className="form-grid g3" action={sv ? updateServiceAction : createServiceAction}>
        <BackTo path={BASE} />
        {sv && <HiddenFields values={{ id: sv.id }} />}
        <Field label="Name">
          <input className="input" name="name" defaultValue={sv?.name ?? ""} required />
        </Field>
        <Field label="Delivered by (contractor role)">
          <select className="select" name="roleId" defaultValue={sv?.roleId ?? ""}>
            <option value="">No contractor (you, or none)</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Billing">
          <select className="select" name="billing" defaultValue={sv?.billing ?? "monthly"}>
            {SERVICE_BILLING.map((k) => (
              <option key={k} value={k}>
                {SERVICE_BILLING_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price on">
          <select className="select" name="quoteBasis" defaultValue={sv?.quoteBasis ?? "highest"}>
            {QUOTE_BASES.map((k) => (
              <option key={k} value={k}>
                {QUOTE_BASIS_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expected quote ($)">
          <input className="input" name="expectedQuote" defaultValue={sv?.expectedQuote ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Markup % (blank = default)">
          <input className="input" name="markupPct" defaultValue={sv?.markupPct ?? ""} inputMode="decimal" />
        </Field>
        <Field label="GrayPortal service (catalogue item; its price is the floor)">
          <select className="select" name="serviceItemId" defaultValue={sv?.serviceItemId ?? ""}>
            <option value="">None (Incrementum-only)</option>
            {catalogue.map((c) => (
              <option key={c.id} value={c.id}>
                {c.moduleCode} · {c.deliverable}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Manual price override ($)">
          <input className="input" name="manualPrice" defaultValue={sv?.manualPrice ?? ""} inputMode="decimal" />
        </Field>
        <Field label="GST">
          <select className="select" name="gstBasis" defaultValue={sv?.gstBasis ?? "exclusive"}>
            <option value="exclusive">Exclusive</option>
            <option value="inclusive">Inclusive</option>
          </select>
        </Field>
        <span className="row" style={{ alignSelf: "end", gap: 16 }}>
          <label className="inline-check">
            <input type="checkbox" name="catalogueFloor" defaultChecked={sv?.catalogueFloor ?? false} /> Catalogue floor
          </label>
          <label className="inline-check">
            <input type="checkbox" name="usuallyWaived" defaultChecked={sv?.usuallyWaived ?? false} /> Usually waived
          </label>
          <label className="inline-check" title="Sold on top of a package (GrayScale, email, SEO). Counts toward the add-on attach rate.">
            <input type="checkbox" name="isAddon" defaultChecked={sv?.isAddon ?? false} /> Add-on
          </label>
        </span>
        <Field label="Tags (match contractors to client needs)" wide>
          <input className="input" name="tags" defaultValue={(sv?.tags ?? []).join(", ")} placeholder="google-ads, ppc" />
        </Field>
        <Field label="Competitor prices (NZ market check)" wide>
          <textarea className="textarea" name="competitorNotes" defaultValue={sv?.competitorNotes ?? ""} placeholder="Agency A $1,200/mo · Agency B from $900/mo …" />
        </Field>
        <Field label="Notes" wide>
          <input className="input" name="notes" defaultValue={sv?.notes ?? ""} />
        </Field>
        {sv && (
          <Field label="Why the change? (goes in price history)" wide>
            <input className="input" name="reason" />
          </Field>
        )}
        <div className="form-actions">
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            {sv ? "Save service" : "Add service"}
          </SubmitButton>
        </div>
      </form>
      {sv && (
        <form action={setServiceStatusAction} className="row">
          <BackTo path={BASE} />
          <HiddenFields values={{ id: sv.id, status: "retired" }} />
          <span className="spacer" />
          <button type="submit" className="linkbtn">
            Retire service
          </button>
        </form>
      )}
    </>
  );
}

function PackageForm({ p }: { p?: PackageView }) {
  return (
    <>
      <form className="form-grid g3" action={p ? updatePackageAction : createPackageAction}>
        <BackTo path={p ? `${BASE}?pkg=${p.id}` : BASE} />
        {p && <HiddenFields values={{ id: p.id }} />}
        <Field label="Name">
          <input className="input" name="name" defaultValue={p?.name ?? ""} required />
        </Field>
        <Field label="Status">
          <select className="select" name="status" defaultValue={p?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="retired">Retired</option>
          </select>
        </Field>
        <Field label="Min term (months) · notice (days)">
          <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
            <input className="input" name="minTermMonths" type="number" min={0} defaultValue={p?.minTermMonths ?? 3} aria-label="Minimum term in months" />
            <input className="input" name="noticeDays" type="number" min={0} defaultValue={p?.noticeDays ?? 30} aria-label="Notice in days" />
          </span>
        </Field>
        <Field label="Description" wide>
          <input className="input" name="description" defaultValue={p?.description ?? ""} />
        </Field>
        <Field label="What's included">
          <textarea className="textarea" name="inclusions" defaultValue={p?.inclusions ?? ""} />
        </Field>
        <Field label="Monthly deliverables">
          <textarea className="textarea" name="deliverables" defaultValue={p?.deliverables ?? ""} />
        </Field>
        <Field label="Not included">
          <textarea className="textarea" name="exclusions" defaultValue={p?.exclusions ?? ""} />
        </Field>
        <Field label="Landing page URL">
          <input className="input" name="landingUrl" defaultValue={p?.landingUrl ?? ""} />
        </Field>
        <Field label="Your monthly price ($, blank = calculated)">
          <input className="input" name="manualMonthlyPrice" defaultValue={p?.manualMonthlyPrice ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Your setup price ($, blank = calculated)">
          <input className="input" name="manualSetupPrice" defaultValue={p?.manualSetupPrice ?? ""} inputMode="decimal" />
        </Field>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            {p ? "Save package" : "Add package"}
          </SubmitButton>
        </div>
      </form>
      {p && (
        <form action={deletePackageAction} className="row">
          <BackTo path={BASE} />
          <HiddenFields values={{ id: p.id }} />
          <span className="spacer" />
          <button type="submit" className="linkbtn danger">
            Delete package
          </button>
        </form>
      )}
    </>
  );
}
