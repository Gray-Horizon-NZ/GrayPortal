"use client";
// Port of the terminal concept's Catalog screens (OS/GrayPortal/terminal-concepts/grayportal-terminal-
// concept/src/screens/Catalog.jsx): Pricing and GrayScale, on the real
// catalogue. Edit/add/remove run the real actions in pricing/actions.ts and
// grayscale-products/actions.ts; GrayScale requests come from every client.
import { useState } from "react";
import { Search, LayoutGrid, Inbox, Plus, Pencil } from "lucide-react";
import { useStore } from "../store";
import { money, fmtDate } from "../format";
import { PageHead, Panel, Priv, Badge, Seg, Modal, Toggle, Empty, go } from "../ui";
import { createServiceItemAction, updateServiceItemAction, softDeleteServiceItemAction } from "@/app/(app)/pricing/actions";
import { tMarkGrayscaleContacted } from "../actions";

const fmtPrice = (setup, monthly, text) => {
  const parts = [];
  if (setup) parts.push(money(setup));
  if (monthly) parts.push(`${money(monthly)}/mo`);
  return parts.length ? parts.join(" + ") : text || "—";
};
const sortValue = (it) => Number(it.monthly ?? it.setup ?? 0);
const BILLING = [["one_off", "One-off"], ["monthly", "Monthly"], ["range", "Range"], ["custom", "Custom"]];
const BILLING_LABEL = Object.fromEntries(BILLING);

// The Web Dev tiers render as one tile at the foot of GA (as on the real page).
const WEBDEV_TIERS = [
  ["ga-webdev-single", "Single-page site"],
  ["ga-webdev-small", "<5 pages"],
  ["ga-webdev-medium", "<10 pages"],
  ["ga-webdev-large", "<19 pages"],
  ["ga-webdev-custom", "20+ pages"],
];
const WEBDEV_CLOUDFLARE = "ga-webdev-cloudflare";
const WEBDEV_IDS = new Set([...WEBDEV_TIERS.map(([id]) => id), WEBDEV_CLOUDFLARE]);

/** The fields shared by the edit panel and the add modal. */
function ItemFields({ it }) {
  const [recurring, setRecurring] = useState(!!it?.recurring);
  return (
    <>
      <input className="input" name="deliverable" defaultValue={it?.name} placeholder="Deliverable name" required />
      <div className="form-grid">
        <select className="select" name="billingType" defaultValue={it?.billingType ?? "one_off"} aria-label="Billing">
          {BILLING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div>
          <input type="hidden" name="isRecurring" value={recurring ? "on" : ""} />
          <Toggle label="Recurring" checked={recurring} onChange={setRecurring} />
        </div>
        <input className="input" name="currentSetupPrice" defaultValue={it?.setup ?? ""} placeholder="Current setup price" />
        <input className="input" name="currentMonthlyPrice" defaultValue={it?.monthly ?? ""} placeholder="Current monthly price" />
        <input className="input" name="suggestedSetupPrice" defaultValue={it?.sSetup ?? ""} placeholder="Suggested setup price" />
        <input className="input" name="suggestedMonthlyPrice" defaultValue={it?.sMonthly ?? ""} placeholder="Suggested monthly price" />
      </div>
      <input className="input" name="priceText" defaultValue={it?.text ?? ""} placeholder="Free-text price (ranges/custom)" />
      <textarea className="textarea" name="notes" style={{ minHeight: 56 }} defaultValue={it?.notes ?? ""} placeholder="Notes" />
    </>
  );
}

// Services (/pricing), in two lists (Max, 22 Nov 2026). Core = what new
// clients are offered and what goes on the website: Project Incrementum's
// packages only, read live from Incrementum › Services. Private = the
// original catalogue, kept for signed clients and internal use.
export function Pricing() {
  const { servicesView } = useStore();
  const [view, setView] = useState(servicesView ?? "core");
  const pick = (v) => {
    setView(v);
    try { window.history.replaceState(null, "", v === "private" ? "?view=private" : "?"); } catch {}
  };
  return view === "private" ? <PrivateServices onView={pick} /> : <CoreServices onView={pick} />;
}

function ViewSwitch({ view, onView }) {
  const { coreOffers, priceItems } = useStore();
  return (
    <Seg value={view} onChange={onView} options={[["core", "Core", coreOffers.length], ["private", "Private", priceItems.length]]} />
  );
}

const fmtRange = (r) => {
  if (r.min != null && r.max != null) return `${money(r.min)} – ${money(r.max)}`;
  if (r.min != null) return `from ${money(r.min)}`;
  if (r.max != null) return `up to ${money(r.max)}`;
  return "Quoted";
};

function CoreServices({ onView }) {
  const { coreOffers, coreExtras, coreReady } = useStore();
  const addons = coreExtras.filter((x) => x.kind === "addon");
  const oneoffs = coreExtras.filter((x) => x.kind !== "addon");
  const extraTile = (x) => (
    <div key={x.id} className="ptile">
      <div className="ptile-top">
        <span className="ptile-name">{x.name}</span>
        <Badge>{x.billing === "monthly" ? "Monthly" : x.billing === "range" ? "Range" : "One-off"}</Badge>
      </div>
      {x.ranges.length > 0 ? (
        x.ranges.map((r) => (
          <div key={r.label} className="row" style={{ justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--t-line)" }}>
            <span className="small">{r.label}</span>
            <span className="small"><Priv>{fmtRange(r)}</Priv></span>
          </div>
        ))
      ) : (
        <p className="rate-val"><Priv>{x.price != null ? `${money(x.price)}${x.billing === "monthly" ? "/mo" : ""}` : x.text || "Quoted"}</Priv></p>
      )}
    </div>
  );

  return (
    <div className="screen">
      <PageHead title="Services" sub="Core: what we offer new clients, and what goes on the website. Project Incrementum packages only.">
        <a className="btn btn-primary" href="/incrementum/services"><Pencil size={14} /> Edit in Incrementum</a>
      </PageHead>
      <div className="row">
        <ViewSwitch view="core" onView={onView} />
        <span className="muted small">Prices and contents come from Incrementum › Services. Change them there and this list follows.</span>
      </div>

      {!coreReady && <Panel><Empty icon={Inbox} title="Couldn't load Incrementum">Open Project Incrementum › Services to check the packages.</Empty></Panel>}

      {coreReady && (
        <>
          <section>
            <div className="modhead">
              <span className="modcode">PKG</span>
              <span className="modname">Packages</span>
              <span className="modfocus">The headline offers. Every new client starts from one.</span>
            </div>
            <div className="ptiles">
              {coreOffers.map((p) => (
                <div key={p.id} className="ptile">
                  <div className="ptile-top">
                    <span className="ptile-name">{p.name}</span>
                    <Badge tone={p.status === "live" ? "accent" : undefined}>{p.status === "live" ? "Live" : "Draft"}</Badge>
                  </div>
                  <div>
                    <p className="rate-label">Monthly</p>
                    <p className="rate-val"><Priv>{money(p.monthly)}/mo</Priv>{p.setup > 0 && <span className="muted small"> + <Priv>{money(p.setup)}</Priv> setup</span>}</p>
                  </div>
                  {p.description && <p className="muted small" style={{ lineHeight: 1.5 }}>{p.description}</p>}
                  {p.monthlyLines.length > 0 && <p className="small" style={{ lineHeight: 1.5 }}><span className="muted">Every month: </span>{p.monthlyLines.join(" · ")}</p>}
                  {p.setupLines.length > 0 && <p className="small" style={{ lineHeight: 1.5 }}><span className="muted">Setup: </span>{p.setupLines.join(" · ")}</p>}
                  <p className="muted small">{p.minTerm}-month minimum, then {p.noticeDays} days&apos; notice</p>
                  {p.missingPrices > 0 && <p className="small" style={{ color: "var(--t-warn, #c98a00)" }}>{p.missingPrices} line{p.missingPrices === 1 ? "" : "s"} without a price yet</p>}
                </div>
              ))}
              {coreOffers.length === 0 && <div className="ptile"><span className="muted small">No packages yet. Add one in Incrementum › Services.</span></div>}
            </div>
          </section>

          {addons.length > 0 && (
            <section>
              <div className="modhead">
                <span className="modcode">ADD</span>
                <span className="modname">Add-ons</span>
                <span className="modfocus">Sold on top of a package, never on their own.</span>
              </div>
              <div className="ptiles">{addons.map(extraTile)}</div>
            </section>
          )}

          {oneoffs.length > 0 && (
            <section>
              <div className="modhead">
                <span className="modcode">ONE</span>
                <span className="modname">One-offs</span>
                <span className="modfocus">Setup lines and ways in. Every one ends with a retainer offer.</span>
              </div>
              <div className="ptiles">{oneoffs.map(extraTile)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// The original catalogue (gh_pricing_framework_v5.md): module heading, then a
// joined grid of deliverable tiles. Current is the quoting rate; Suggested
// only shows inside the expanded Edit panel. Each tile names the signed
// clients still on it.
function PrivateServices({ onView }) {
  const { pricingModules, priceItems } = useStore();
  const [q, setQ] = useState("");
  const [billing, setBilling] = useState("all");
  const [sort, setSort] = useState("none");
  const [adding, setAdding] = useState(false);
  let items = priceItems.filter((it) => !q || it.name.toLowerCase().includes(q.toLowerCase()));
  if (billing === "recurring") items = items.filter((it) => it.billingType === "monthly");
  if (billing === "one_off") items = items.filter((it) => it.billingType !== "monthly");
  if (sort === "asc") items = [...items].sort((a, b) => sortValue(a) - sortValue(b));
  if (sort === "desc") items = [...items].sort((a, b) => sortValue(b) - sortValue(a));
  const webdev = priceItems.filter((it) => WEBDEV_IDS.has(it.id));
  const cloudflare = webdev.find((it) => it.id === WEBDEV_CLOUDFLARE);

  return (
    <div className="screen">
      <PageHead title="Services" sub="Private: signed clients and internal use only. Not offered to new clients or shown on the website. Current is the rate for these clients; Suggested isn't active until authorised.">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add deliverable</button>
      </PageHead>
      <div className="row">
        <ViewSwitch view="private" onView={onView} />
      </div>
      <div className="row">
        <div className="search" style={{ margin: 0, maxWidth: 320, display: "flex" }}>
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deliverables…" aria-label="Search deliverables" />
        </div>
        <Seg small value={billing} onChange={setBilling} options={[["all", "All"], ["recurring", "Recurring"], ["one_off", "One-off"]]} />
        <Seg small value={sort} onChange={setSort} options={[["none", "Catalogue order"], ["asc", "Price ↑"], ["desc", "Price ↓"]]} />
      </div>

      {pricingModules.map((mod) => {
        const modItems = items.filter((it) => it.mod === mod.code && !WEBDEV_IDS.has(it.id));
        const showWebdev = mod.code === "GA" && billing !== "recurring" && !q && webdev.length > 0;
        if (modItems.length === 0 && !showWebdev) return null;
        return (
          <section key={mod.code}>
            <div className="modhead">
              <span className="modcode">{mod.code}</span>
              <span className="modname">{mod.name}</span>
              <span className="modfocus">{mod.focus}</span>
            </div>
            <div className="ptiles">
              {modItems.map((it) => (
                <div key={it.id} className="ptile">
                  <div className="ptile-top">
                    <span className="ptile-name">{it.name}</span>
                    <Badge>{BILLING_LABEL[it.billingType] ?? it.billingType}</Badge>
                  </div>
                  {it.notes && <p className="muted small" style={{ lineHeight: 1.5 }}>{it.notes}</p>}
                  <div>
                    <p className="rate-label">Current</p>
                    <p className="rate-val"><Priv>{fmtPrice(it.setup, it.monthly, it.text)}</Priv></p>
                  </div>
                  <p className="muted small">{it.usedBy?.length ? <>On: <Priv>{it.usedBy.join(", ")}</Priv></> : "No signed client on this"}</p>
                  <details>
                    <summary>Edit</summary>
                    <form className="stack" action={updateServiceItemAction.bind(null, it.id)}>
                      {(it.sSetup || it.sMonthly) && (
                        <div className="suggested">
                          <div><p className="rate-label">Suggested</p><p className="rate-val plain"><Priv>{fmtPrice(it.sSetup, it.sMonthly)}</Priv></p></div>
                          <div className="muted small" style={{ alignSelf: "center" }}>Not active until authorised</div>
                        </div>
                      )}
                      <ItemFields it={it} />
                      <div className="row">
                        <button className="btn btn-sm btn-primary" type="submit">Save</button>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => softDeleteServiceItemAction(it.id)}>Remove</button>
                        <span className="spacer" />
                        <span className="muted small mono">{it.id}</span>
                      </div>
                    </form>
                  </details>
                </div>
              ))}
              {showWebdev && (
                <div className="ptile" style={{ gridColumn: "1 / -1" }}>
                  <div className="ptile-top"><span className="ptile-name">Website Development</span><Badge>One-off</Badge></div>
                  {WEBDEV_TIERS.map(([id, label]) => {
                    const t = webdev.find((x) => x.id === id);
                    return t ? (
                      <div key={id} className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--t-line)" }}>
                        <span>{label}</span>
                        <span className="rate-val" style={{ fontSize: 14 }}><Priv>{fmtPrice(t.setup, t.monthly, t.text)}</Priv></span>
                      </div>
                    ) : null;
                  })}
                  {cloudflare && <p className="muted small">Included: {cloudflare.name}</p>}
                </div>
              )}
            </div>
          </section>
        );
      })}
      {items.length === 0 && <Panel><Empty icon={Search} title="No deliverables match" /></Panel>}

      <AddDeliverable open={adding} modules={pricingModules} onClose={() => setAdding(false)} />
    </div>
  );
}

function AddDeliverable({ open, modules, onClose }) {
  const [mod, setMod] = useState(modules[0]?.code ?? "");
  return (
    <Modal open={open} onClose={onClose} title="Add deliverable" wide>
      <form className="stack" style={{ gap: 10 }} action={async (fd) => { await createServiceItemAction(mod, fd); onClose(); }}>
        <div className="form-grid">
          <label className="field"><span>Module</span>
            <select className="select" value={mod} onChange={(e) => setMod(e.target.value)}>{modules.map((m) => <option key={m.code} value={m.code}>{m.code} — {m.name}</option>)}</select>
          </label>
          <label className="field"><span>Item id</span><input className="input mono" name="id" placeholder={`${mod.toLowerCase()}-new-item-id`} required /></label>
        </div>
        <ItemFields />
        <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Plus size={14} /> Add deliverable</button>
      </form>
    </Modal>
  );
}

export function GrayScale() {
  const { grayscaleProducts, grayscaleRequests } = useStore();
  const [tab, setTab] = useState("catalogue");
  const newCount = grayscaleRequests.filter((r) => r.status === "new").length;
  return (
    <div className="screen">
      <PageHead title="GrayScale" sub="Self-serve products clients can request from their portal · Osseus's price list (products.ts), synced every hour; change prices there. A client's own discount and deal terms are set in their Osseus">
        <Seg value={tab} onChange={setTab} options={[["catalogue", "Catalogue"], ["requests", "Client requests", newCount || null]]} />
      </PageHead>
      {tab === "catalogue" ? (
        grayscaleProducts.length === 0 ? <Panel><Empty icon={LayoutGrid} title="No GrayScale products yet" /></Panel> : (
          // One panel in price-list order: each product's category is its plain secondary name (GrayScale D23), not a group
          <Panel title="Catalogue" icon={LayoutGrid}>
            <div className="cards">
              {grayscaleProducts.map((x) => (
                <div key={x.id} className="card" style={{ background: "var(--t-panel-2)" }}>
                  <div className="row">
                    <h3>{x.name}{x.isNew && <span className="gh-new">New</span>}{x.category && <span className="muted small" style={{ display: "block", fontWeight: 400 }}>{x.category}</span>}</h3>
                    <span className="spacer" />
                    <b style={{ color: "var(--t-accent)" }}>{x.monthly ? <><Priv>{money(x.monthly)}</Priv><span className="muted small">/mo</span></> : <span className="muted small">No price</span>}</b>
                  </div>
                  <p>{x.desc}</p>
                </div>
              ))}
            </div>
          </Panel>
        )
      ) : (
        <Panel title="Requests from client portals" icon={Inbox} pad={false}>
          {grayscaleRequests.length === 0 ? <Empty icon={Inbox} title="No requests yet" /> : (
            <table className="table">
              <thead><tr><th>Client</th><th>Product</th><th>Requested</th><th>Status</th><th /></tr></thead>
              <tbody>
                {grayscaleRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="strong"><button onClick={() => go(`/clients/${r.clientId}`)}>{r.client}</button></td>
                    <td>{r.product}{r.note && <div className="muted small">{r.note}</div>}</td>
                    <td className="nowrap">{fmtDate(r.at)}</td>
                    <td><Badge tone={r.status === "new" ? "accent" : undefined}>{r.status}</Badge></td>
                    <td className="num nowrap">
                      {r.status === "new" && <button className="btn btn-sm" onClick={() => tMarkGrayscaleContacted(r.id)}>Mark contacted</button>}{" "}
                      <button className="btn btn-sm" onClick={() => go("/apexus")}>Open in Deal Closer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}
    </div>
  );
}
