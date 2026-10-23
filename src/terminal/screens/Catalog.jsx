"use client";
// Port of the terminal concept's Catalog screens (OS/grayportal-terminal-
// concept/src/screens/Catalog.jsx): Pricing and GrayScale, on the real
// catalogue. Edit/add/remove run the real actions in pricing/actions.ts and
// grayscale-products/actions.ts; GrayScale requests come from every client.
import { useState } from "react";
import { Search, LayoutGrid, Inbox, Plus, Pencil } from "lucide-react";
import { useStore } from "../store";
import { money, fmtDate } from "../format";
import { PageHead, Panel, Priv, Badge, Seg, Modal, Toggle, Empty, go } from "../ui";
import { createServiceItemAction, updateServiceItemAction, softDeleteServiceItemAction } from "@/app/(app)/pricing/actions";
import { createGrayscaleProductAction, updateGrayscaleProductAction, softDeleteGrayscaleProductAction } from "@/app/(app)/grayscale-products/actions";
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

// Same structure as the real /pricing page: module heading, then a joined
// grid of deliverable tiles. Current is the quoting rate; Suggested only
// shows inside the expanded Edit panel.
export function Pricing() {
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
      <PageHead title="Pricing" sub="Service catalogue · Current is the default rate to quote — Suggested isn't active until authorised">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add deliverable</button>
      </PageHead>
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
  const [edit, setEdit] = useState(null); // "new" | product
  const cats = [...new Set(grayscaleProducts.map((p) => p.category))];
  const newCount = grayscaleRequests.filter((r) => r.status === "new").length;
  const p = edit && edit !== "new" ? edit : null;
  return (
    <div className="screen">
      <PageHead title="GrayScale" sub="Self-serve products clients can request from their portal · retainer clients get 20% off">
        <Seg value={tab} onChange={setTab} options={[["catalogue", "Catalogue"], ["requests", "Client requests", newCount || null]]} />
        <button className="btn btn-primary" onClick={() => setEdit("new")}><Plus size={14} /> Add product</button>
      </PageHead>
      {tab === "catalogue" ? (
        grayscaleProducts.length === 0 ? <Panel><Empty icon={LayoutGrid} title="No GrayScale products yet" /></Panel> : cats.map((cat) => (
          <Panel key={cat} title={cat} icon={LayoutGrid}>
            <div className="cards">
              {grayscaleProducts.filter((x) => x.category === cat).map((x) => (
                <div key={x.id} className="card" style={{ background: "var(--t-panel-2)" }}>
                  <div className="row">
                    <h3>{x.name}</h3>
                    <span className="spacer" />
                    <b style={{ color: "var(--t-accent)" }}>{x.monthly ? <><Priv>{money(x.monthly)}</Priv><span className="muted small">/mo</span></> : <span className="muted small">No price</span>}</b>
                    <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => setEdit(x)} aria-label={`Edit ${x.name}`}><Pencil size={12} /></button>
                  </div>
                  <p>{x.desc}</p>
                </div>
              ))}
            </div>
          </Panel>
        ))
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
                      <button className="btn btn-sm" onClick={() => go("/apexus")}>Open in Apexus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={p ? `Edit ${p.name}` : "Add product"}>
        {edit && (
          <form className="stack" style={{ gap: 10 }} action={async (fd) => { await (p ? updateGrayscaleProductAction(p.id, fd) : createGrayscaleProductAction(fd)); setEdit(null); }}>
            <label className="field"><span>Name</span><input className="input" name="name" defaultValue={p?.name} required /></label>
            <div className="form-grid">
              <label className="field"><span>Category</span><input className="input" name="category" defaultValue={p?.category === "Other" ? "" : p?.category} list="gs-cats" /></label>
              <label className="field"><span>Monthly price (NZD)</span><input className="input" name="monthlyPriceNzd" type="number" step="0.01" defaultValue={p?.monthly ?? ""} /></label>
            </div>
            <datalist id="gs-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            <label className="field"><span>Description</span><textarea className="textarea" name="description" defaultValue={p?.desc} /></label>
            <label className="field"><span>Sort order</span><input className="input" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? ""} /></label>
            <div className="row">
              {p && <button type="button" className="btn btn-danger" onClick={async () => { await softDeleteGrayscaleProductAction(p.id); setEdit(null); }}>Remove</button>}
              <span className="spacer" />
              <button className="btn btn-primary" type="submit">{p ? "Save" : "Add product"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
