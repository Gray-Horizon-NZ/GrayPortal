"use client";
// Port of the terminal concept's ClientProfile (OS/grayportal-terminal-
// concept/src/screens/ClientProfile.jsx). Same header, KPIs, five tabs and
// panels, on real data (page.tsx builds `profile`). Every button the
// concept left as a placeholder is wired to the real action in
// src/app/(app)/clients/actions.ts; forms that the concept showed inline
// open in the concept's Modal where the real flow needs more fields.
import { useEffect, useState } from "react";
import {
  ArrowLeft, ExternalLink, Building2, ListChecks, Palette, ToggleLeft, HeartPulse, KeyRound, UserPlus, FileCheck, Send,
  Briefcase, Receipt, Gift, LayoutGrid, Workflow, FileText, Map, Lightbulb, Wrench, Link2, Users, Radio, History, NotebookPen, Mail, Plus, Check, X, Trash2, Pencil,
} from "lucide-react";
import { useStore } from "../store";
import { TODAY, money, fmtDate, clientMrr, serviceMonthly, PORTAL_FEATURES, ONBOARDING_DOCUMENT_NAMES } from "../format";
import { Panel, KV, Priv, Meter, TrendGlyph, BrandBanner, Badge, Toggle, Empty, Modal, go } from "../ui";
import {
  startPortalPreviewAction, deleteClientAction, updateCompanyDetailsAction, updatePortalWelcomeAction, toggleFeatureAction,
  setClientHiddenFromTaskViewAction, listGoogleTasklistsAction, createGoogleTasklistAction, linkClientTasklistAction,
  approvePortalAccessRequestAction, denyPortalAccessRequestAction, inviteClientAction, resendPasswordSetupEmailAction, sendOnboardingInviteAction,
  uploadDocumentAction, updateDocumentAction, deleteDocumentAction, updateClientDiscountAction, addClientServiceAction, removeClientServiceAction,
  updateClientServicePriceAction, createReferralAction, setReferralStatusAction, convertReferralAction, markGrayscaleRequestContactedAction,
  addClientDealAction, createRoadmapItemAction, updateRoadmapItemAction, deleteRoadmapItemAction, createIdeationItemAction, deleteIdeationItemAction,
  createToolStackItemAction, deleteToolStackItemAction, updateClientEmbedsAction, addClientTeamMemberAction, deleteClientTeamMemberAction,
  addClientHealthChannelAction, deleteClientHealthChannelAction, addClientContactEmailAliasAction, addClientActivityFeedEntryAction,
  deleteClientActivityFeedEntryAction, createMeetingSummaryAction, deleteMeetingSummaryAction, getClientEmailsAction, getEmailBodyAction,
} from "@/app/(app)/clients/actions";
import { tSetClientServiceStatus } from "../actions";

const TABS = [
  ["overview", "Overview"],
  ["access", "Access & credentials"],
  ["commercial", "Commercial"],
  ["delivery", "Delivery"],
  ["team", "Team & activity"],
];

// Same rule as src/lib/paymentStatus.ts.
function paymentStatus(next) {
  if (!next) return null;
  const days = Math.round((new Date(`${next}T00:00:00`) - new Date(`${TODAY}T00:00:00`)) / 86400000);
  if (days < 0) return { tone: "bad", label: `${-days}d overdue` };
  if (days <= 7) return { tone: "warn", label: `Due in ${days}d` };
  return { tone: "good", label: `Due ${fmtDate(next)}` };
}

const rowStyle = { padding: "8px 0", borderBottom: "1px solid var(--t-line)" };
const tiny = { width: 26, height: 26 };

function RemoveBtn({ onClick, label = "Remove" }) {
  return <button type="button" className="iconbtn" style={tiny} onClick={onClick} aria-label={label}><Trash2 size={12} /></button>;
}

/** A Modal holding one real form; closes once the action resolves. */
function FormModal({ open, onClose, title, action, submit, children, wide, multipart }) {
  return (
    <Modal open={open} onClose={onClose} title={title} wide={wide}>
      <form className="stack" style={{ gap: 10 }} encType={multipart ? "multipart/form-data" : undefined} action={async (fd) => { await action(fd); onClose(); }}>
        {children}
        <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>{submit}</button>
      </form>
    </Modal>
  );
}

export default function ClientProfile({ id, credentials }) {
  const { clients, setBrand, profile: x } = useStore();
  const [tab, setTab] = useState(x.initialTab);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const c = clients.find((y) => y.id === id);
  if (!c) return <div className="screen"><Empty title="Client not found" /></div>;
  const status = paymentStatus(c.nextPayment);
  const pendingSignIns = x.portalUsers.filter((u) => !u.active).length;

  return (
    <div className="screen">
      <button className="eyebrow row" style={{ gap: 6 }} onClick={() => go("/clients")}>
        <ArrowLeft size={12} /> All clients
      </button>

      <section className="panel">
        <BrandBanner client={c} height={150} editable onChange={(patch) => setBrand(c.id, patch)} />
        <div className="profile-head">
          <div>
            <div className="row" style={{ gap: 12 }}>
              <h2>{c.name}</h2>
              {status && <Badge tone={status.tone}>{status.label}</Badge>}
              <Badge>{c.status}</Badge>
            </div>
            <div className="profile-facts">
              {c.company.industry && <span>{c.company.industry}</span>}
              <span>Client since <b>{fmtDate(c.since, { day: "numeric", month: "short", year: "numeric" })}</b></span>
              {x.companyName !== c.name && <span>Company <b>{x.companyName}</b></span>}
            </div>
          </div>
          <div className="row">
            {confirmRemove ? (
              <>
                <span className="small tone-bad">Remove {c.name}?</span>
                <button className="btn btn-sm btn-danger" onClick={() => deleteClientAction(c.id)}>Yes, remove</button>
                <button className="btn btn-sm" onClick={() => setConfirmRemove(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn btn-danger" onClick={() => setConfirmRemove(true)}><Trash2 size={13} /> Remove client</button>
            )}
            <button className="btn btn-primary" onClick={() => startPortalPreviewAction(c.id)}><ExternalLink size={14} /> Access client portal</button>
          </div>
        </div>
        <div className="kpis">
          <div><div className="n"><Priv>{money(clientMrr(c))}</Priv></div><div className="l">Estimated monthly</div></div>
          <div><div className="n">{c.health.score || "—"} {c.health.score > 0 && <TrendGlyph trend={c.health.trend} />}</div><div className="l">Health score — {c.health.trend}</div></div>
          <div><div className="n">{c.services.filter((s) => s.status === "active").length}</div><div className="l">Active services</div></div>
          <div><div className="n">{pendingSignIns}</div><div className="l">Invites awaiting sign-in</div></div>
        </div>
        <nav className="tabbar" style={{ padding: "0 8px" }}>
          {TABS.map(([k, label]) => (
            <button key={k} data-active={tab === k || undefined} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
      </section>

      {x.flash.map((f) => (
        <div key={f.text} className="note" data-tone={f.tone}>{f.tone === "bad" ? <X size={14} /> : <Check size={14} />}{f.text}</div>
      ))}

      {tab === "overview" && <OverviewTab c={c} x={x} />}
      {tab === "access" && <AccessTab c={c} x={x} credentials={credentials} />}
      {tab === "commercial" && <CommercialTab c={c} x={x} />}
      {tab === "delivery" && <DeliveryTab c={c} x={x} />}
      {tab === "team" && <TeamTab c={c} x={x} />}
    </div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────────────── */
function OverviewTab({ c, x }) {
  const { setBrand } = useStore();
  const [features, setFeatures] = useState(() => new Set(x.features));
  const [hidden, setHidden] = useState(x.hidden);
  const fields = [
    ["Main email", "mainEmail", c.company.email], ["Phone", "phone", c.company.phone], ["Position", "mainContactPosition", c.mainContact.role],
    ["Address", "address", c.company.address], ["Postal address", "postalAddress", x.postalAddress], ["Referred by", "referredBy", c.company.referredBy],
  ];
  return (
    <div className="grid g-2">
      <div className="stack">
        {x.companyId && (
          <Panel title="Company details" icon={Building2}>
            <p className="muted small" style={{ marginBottom: 12 }}>Normally filled in by the client during onboarding — editable here if it needs correcting.</p>
            <KV rows={[["Business name", x.companyName]]} />
            <form action={updateCompanyDetailsAction.bind(null, x.companyId, c.id)}>
              <div className="form-grid" style={{ marginTop: 10 }}>
                {fields.map(([label, name, v]) => (
                  <label key={name} className="field"><span>{label}</span><input className="input priv" name={name} type={name === "mainEmail" ? "email" : "text"} defaultValue={v || ""} /></label>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }}>Save company details</button>
            </form>
          </Panel>
        )}
        <Panel title="Google Tasks list" icon={ListChecks}>
          <p className="muted small" style={{ marginBottom: 10 }}>Route this client&apos;s synced tasks into their own Google Tasks list instead of the shared default list.</p>
          <TasklistSelect clientId={c.id} linked={x.taskListLinked} name={c.name} />
          <Toggle
            label="Hide from Master Task View"
            hint="For test or internal clients that will never have real tasks"
            checked={hidden}
            onChange={(on) => { setHidden(on); setClientHiddenFromTaskViewAction(c.id, on); }}
          />
        </Panel>
        <Panel title="Portal appearance" icon={Palette}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, display: "grid", placeItems: "center", border: "1px solid var(--t-line)", background: "var(--t-panel-2)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- client logo, same-origin route */}
              {c.brand.logo ? <img src={c.brand.logo} alt="" style={{ maxWidth: 44, maxHeight: 44 }} /> : <span className="muted">{c.name[0]}</span>}
            </div>
            <label className="btn btn-sm">
              Upload logo
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => setBrand(c.id, { logo: r.result });
                r.readAsDataURL(f);
                e.target.value = "";
              }} />
            </label>
            <span className="muted small">Also used on the banner above</span>
          </div>
          <form action={updatePortalWelcomeAction.bind(null, c.id)}>
            <textarea className="textarea" name="portalWelcomeMessage" defaultValue={x.welcome} placeholder="Welcome message shown at the top of this client's portal home page (optional)" />
            <button className="btn btn-primary" style={{ marginTop: 10 }}>Save</button>
          </form>
        </Panel>
      </div>
      <div className="stack">
        <Panel title="Portal features" icon={ToggleLeft} right={`${features.size} of ${PORTAL_FEATURES.length} on`}>
          <div className="feature-grid">
            {PORTAL_FEATURES.map(([k, label]) => (
              <Toggle key={k} label={label} checked={features.has(k)} onChange={(on) => {
                const n = new Set(features);
                if (on) n.add(k);
                else n.delete(k);
                setFeatures(n);
                toggleFeatureAction(c.id, k, on);
              }} />
            ))}
          </div>
        </Panel>
        <Panel title="Health breakdown" icon={HeartPulse} right="Recomputed nightly">
          <div className="healthparts">
            {[["payment", "Payment"], ["tasks", "Task delivery"], ["activity", "Activity"], ["momentum", "Deal momentum"]].map(([k, label]) => (
              <div className="healthpart" key={k}>
                <span>{label}</span>
                <Meter value={c.health.components[k]} tone="neutral" label={label} />
                <b>{c.health.components[k]}</b>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** The concept's list select, backed by the real Google Tasks lists (loaded on first open). */
function TasklistSelect({ clientId, linked, name }) {
  const [lists, setLists] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(name);
  if (linked) return <select className="select" disabled value="linked" aria-label="Google Tasks list"><option value="linked">Linked to its own list</option></select>;
  const load = async () => {
    if (lists) return;
    try {
      setLists(await listGoogleTasklistsAction());
    } catch (e) {
      setError(e?.message || "Couldn't load Google Tasks lists — is Google connected?");
      setLists([]);
    }
  };
  const link = async (listId) => {
    await linkClientTasklistAction(clientId, listId);
    go(`/clients/${clientId}`);
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <select
        className="select"
        defaultValue=""
        onFocus={load}
        onMouseDown={load}
        aria-label="Google Tasks list"
        onChange={(e) => (e.target.value === "__new" ? setCreating(true) : e.target.value && link(e.target.value))}
      >
        <option value="">Shared default list</option>
        {lists === null && <option disabled>Loading lists…</option>}
        {(lists || []).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        <option value="__new">+ New list…</option>
      </select>
      {creating && (
        <div className="row">
          <input className="input" style={{ flex: 1 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New list name" />
          <button className="btn btn-sm btn-primary" onClick={async () => { if (title.trim()) link((await createGoogleTasklistAction(title.trim())).id); }}>Create &amp; link</button>
        </div>
      )}
      {error && <p className="small tone-bad">{error}</p>}
    </div>
  );
}

/* ─── Access & credentials ─────────────────────────────────────────────── */
function AccessTab({ c, x, credentials }) {
  const [attach, setAttach] = useState(null);
  const [preview, setPreview] = useState(false);
  const attached = new Set(x.documents.map((d) => d.title));
  const missing = ONBOARDING_DOCUMENT_NAMES.filter((n) => !attached.has(n));
  const blockers = x.roadmap.length ? missing : [...missing, "Roadmap"];
  const awaiting = x.portalUsers.filter((u) => !u.active);
  return (
    <div className="grid g-2">
      <div className="stack">
        {x.accessRequests.length > 0 && (
          <Panel title="Pending access requests" icon={KeyRound} right={x.accessRequests.length}>
            {x.accessRequests.map((r) => (
              <div key={r.id} className="row" style={rowStyle}>
                <Priv>{r.email}</Priv>
                {r.name && <span className="muted small">{r.name}</span>}
                <span className="muted small">requested {fmtDate(r.at)}</span>
                <span className="spacer" />
                <button className="btn btn-sm btn-primary" onClick={() => approvePortalAccessRequestAction(c.id, r.id)}><Check size={12} /> Approve</button>
                <button className="btn btn-sm" onClick={() => denyPortalAccessRequestAction(c.id, r.id)}><X size={12} /> Deny</button>
              </div>
            ))}
          </Panel>
        )}
        <Panel title="Portal access" icon={UserPlus} right={<a className="small" href={`/onboarding-preview/${c.id}`} target="_blank" rel="noreferrer">Preview onboarding wizard ↗</a>}>
          {x.portalUsers.length === 0 ? (
            <p className="muted small" style={{ marginBottom: 12 }}>No one has portal access yet.</p>
          ) : (
            <table className="table" style={{ marginBottom: 14 }}>
              <thead><tr><th>Email</th><th>Status</th><th /></tr></thead>
              <tbody>
                {x.portalUsers.map((u) => (
                  <tr key={u.id}>
                    <td><Priv>{u.email}</Priv></td>
                    <td><Badge tone={u.active ? "good" : "warn"}>{u.active ? "Signed in" : "Awaiting sign-in"}</Badge></td>
                    <td className="num">
                      <button className="btn btn-sm" onClick={() => resendPasswordSetupEmailAction(c.id, u.id)}>{u.active ? "Password setup email" : "Resend password email"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={inviteClientAction.bind(null, c.id)}>
            <div className="form-grid">
              <input className="input" name="email" type="email" placeholder="Client email" required />
              <input className="input" name="displayName" placeholder="Display name (optional)" />
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary"><Send size={13} /> Add portal login</button>
              <span className="muted small">Nothing is emailed until you send the onboarding invite.</span>
            </div>
          </form>
        </Panel>
        {credentials}
      </div>
      <div className="stack">
        <Panel title="Onboarding documents" icon={FileCheck} right={`${ONBOARDING_DOCUMENT_NAMES.length - missing.length} of ${ONBOARDING_DOCUMENT_NAMES.length} attached`}>
          <div className="checklist">
            {ONBOARDING_DOCUMENT_NAMES.map((n) => (
              <div key={n}>
                {attached.has(n) ? <Check size={14} className="ok" /> : <X size={14} className="miss" />}
                <span style={{ flex: 1 }}>{n}</span>
                {!attached.has(n) && <button className="btn btn-sm" onClick={() => setAttach(n)}>Attach</button>}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Onboarding invite" icon={Send}>
          {blockers.length > 0 ? (
            <div className="note" style={{ marginBottom: 12 }}>Can&apos;t send yet — missing: {blockers.join(", ")}.</div>
          ) : awaiting.length === 0 ? (
            <p className="muted small" style={{ marginBottom: 12 }}>{x.portalUsers.length ? "Everyone with a login has signed in." : "Add a portal login first."}</p>
          ) : (
            <p className="muted small" style={{ marginBottom: 12 }}>Everything&apos;s attached — the portal is ready to hand over.{x.invite.resend && " Resending invalidates the previous link."}</p>
          )}
          <form action={sendOnboardingInviteAction.bind(null, c.id)}>
            <select className="select priv" name="email" defaultValue={x.invite.to} aria-label="Invite email" disabled={awaiting.length === 0}>
              {awaiting.map((u) => (
                <option key={u.id} value={u.email}>{u.email}{u.inviteDaysLeft != null ? ` — link expires in ${u.inviteDaysLeft}d` : ""}</option>
              ))}
              {awaiting.length === 0 && <option value="">No login awaiting sign-in</option>}
            </select>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" disabled={blockers.length > 0 || awaiting.length === 0}>{x.invite.resend ? "Resend onboarding invite" : "Send onboarding invite"}</button>
              <button type="button" className="btn" onClick={() => setPreview(true)}>Preview email</button>
            </div>
          </form>
        </Panel>
      </div>

      <FormModal open={!!attach} onClose={() => setAttach(null)} title={`Attach ${attach || ""}`} action={uploadDocumentAction.bind(null, c.id)} submit="Attach" multipart>
        <input type="hidden" name="companyId" value={x.companyId ?? ""} />
        <input type="hidden" name="title" value={attach || ""} />
        <input type="hidden" name="docType" value="other" />
        <label className="field"><span>File</span><input className="input" name="file" type="file" /></label>
        <label className="field"><span>Or link a Drive/hosted PDF URL instead</span><input className="input" name="externalUrl" type="url" placeholder="https://" /></label>
      </FormModal>
      <Modal open={preview} onClose={() => setPreview(false)} title={x.invite.subject} wide>
        <iframe title="Invite email preview" sandbox="" srcDoc={x.invite.previewHtml} style={{ width: "100%", height: 460, border: "1px solid var(--t-line)", background: "#fff" }} />
        <button className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => go("/email-templates")}>Edit this in Email Templates</button>
      </Modal>
    </div>
  );
}

/* ─── Commercial ───────────────────────────────────────────────────────── */
const REFERRAL_LABEL = { submitted: "Submitted", contacted: "Contacted", declined: "Declined", converted: "Converted", discount_applied: "Discount applied" };

function CommercialTab({ c, x }) {
  const { oneOffs, setOneOffs } = useStore();
  const [svc, setSvc] = useState(null);
  const [adding, setAdding] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [pay, setPay] = useState({ label: "", amount: "", date: TODAY, invoice: "" });
  const subtotal = c.services.reduce((a, s) => a + serviceMonthly(s), 0);
  const service = c.services.find((s) => s.id === svc);
  return (
    <div className="stack">
      <Panel title="Services" icon={Briefcase} right={<span>Estimated <b className="strong"><Priv>{money(clientMrr(c))}</Priv></b>/mo</span>}>
        <form className="row" style={{ marginBottom: 14 }} action={updateClientDiscountAction.bind(null, c.id)}>
          <label className="field" style={{ width: 200 }}><span>Overall discount %</span><input className="input" name="overallDiscountPercent" type="number" min="0" max="100" step="0.01" defaultValue={c.overallDiscount || ""} placeholder="0" /></label>
          <button className="btn btn-sm" style={{ alignSelf: "flex-end" }}>Save</button>
          <p className="muted small" style={{ maxWidth: 460, alignSelf: "flex-end" }}>Applied on top of the subtotal (<Priv>{money(subtotal)}</Priv>) — e.g. a $2,400 package at 33% off nets $1,608/mo.</p>
        </form>
        <div className="svc-tiles">
          {c.services.map((s) => (
            <button key={s.id} className="svc-tile" onClick={() => setSvc(s.id)}>
              <span className="row" style={{ justifyContent: "space-between" }}><span className="nm">{s.name}</span><Badge tone={s.status === "active" ? "good" : "warn"}>{s.status}</Badge></span>
              <span className="pr"><Priv>{[s.setup && `${money(s.setup)} setup`, s.monthly && `${money(s.monthly)}/mo`].filter(Boolean).join(" + ") || "—"}</Priv></span>
              {s.discount > 0 && <span className="muted small">{s.discount}% off this item</span>}
            </button>
          ))}
          <button className="svc-tile add" onClick={() => setAdding(true)}><Plus size={16} /> Add service</button>
        </div>
      </Panel>

      <div className="grid g-2">
        <Panel title="One-off & setup payments" icon={Receipt} pad={false} right="Shows on Finance">
          <form
            className="quickadd"
            style={{ flexWrap: "wrap" }}
            onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat(pay.amount);
              if (!pay.label.trim() || !(amount > 0)) return;
              setOneOffs((ps) => [{ id: Date.now(), clientId: c.id, client: c.name, label: pay.label.trim(), amount, date: pay.date, invoice: pay.invoice || null, status: "awaiting" }, ...ps]);
              setPay({ label: "", amount: "", date: TODAY, invoice: "" });
            }}
          >
            <input className="input" style={{ flex: 2, minWidth: 160 }} value={pay.label} onChange={(e) => setPay({ ...pay, label: e.target.value })} placeholder="What for (e.g. Landing page build)" />
            <input className="input" style={{ width: 100 }} type="number" min="0" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} placeholder="Amount" />
            <input className="input" style={{ width: 110 }} value={pay.invoice} onChange={(e) => setPay({ ...pay, invoice: e.target.value })} placeholder="Xero inv #" />
            <button className="btn btn-primary"><Plus size={13} /> Record</button>
          </form>
          {oneOffs.length === 0 ? <Empty title="No one-off payments" /> : (
            <table className="table">
              <tbody>
                {oneOffs.map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap">{fmtDate(p.date)}</td>
                    <td>{p.label}</td>
                    <td className="mono">{p.invoice || "—"}</td>
                    <td className="num"><Priv>{money(p.amount)}</Priv></td>
                    <td><Badge tone={p.status === "paid" ? "good" : undefined}>{p.status === "paid" ? "Paid" : "Awaiting"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Referrals" icon={Gift} right={x.activeDiscount ? `Active discount ${x.activeDiscount}%` : null}>
          {x.referrals.length === 0 ? <p className="muted small">No referrals yet.</p> : x.referrals.map((r) => (
            <div key={r.id} className="row" style={rowStyle}>
              <span style={{ flex: 1 }}>{r.name}</span>
              {/* Converted / discount applied are only ever set by "Mark converted", which applies the referral discount. */}
              {r.status === "converted" || r.status === "discount_applied" ? (
                <Badge tone="good">{REFERRAL_LABEL[r.status]}</Badge>
              ) : (
                <>
                  <select className="select" style={{ width: 130, height: 28 }} defaultValue={r.status} onChange={(e) => setReferralStatusAction(r.id, c.id, e.target.value)} aria-label="Referral status">
                    {["submitted", "contacted", "declined"].map((s) => <option key={s} value={s}>{REFERRAL_LABEL[s]}</option>)}
                  </select>
                  <button className="btn btn-sm" onClick={() => convertReferralAction(r.id, c.id)}>Mark converted</button>
                </>
              )}
            </div>
          ))}
          <form className="row" style={{ marginTop: 10 }} action={async (fd) => { if (String(fd.get("referredName") || "").trim()) await createReferralAction(c.id, fd); }}>
            <input name="referredName" className="input" style={{ flex: 1 }} placeholder="Who they referred" required />
            <button className="btn">Log referral</button>
          </form>
        </Panel>
      </div>

      <div className="grid g-2">
        <Panel title="GrayScale requests" icon={LayoutGrid}>
          {x.grayscaleRequests.length === 0 ? <p className="muted small">No requests.</p> : x.grayscaleRequests.map((r) => (
            <div key={r.id} style={rowStyle}>
              <div className="row">
                <span style={{ flex: 1 }}>{r.product}</span><span className="muted small">{fmtDate(r.at)}</span><Badge tone={r.status === "new" ? "accent" : undefined}>{r.status}</Badge>
                {r.status === "new" && <button className="btn btn-sm" onClick={() => markGrayscaleRequestContactedAction(c.id, r.id)}>Mark contacted</button>}
              </div>
              {r.note && <p className="muted small" style={{ marginTop: 4 }}>{r.note}</p>}
            </div>
          ))}
        </Panel>
        <Panel title="Deals" icon={Workflow} right={x.companyId && <button className="btn btn-sm" onClick={() => setDealOpen(true)}><Plus size={12} /> New deal</button>}>
          {x.deals.length === 0 ? <p className="muted small">No deals linked.</p> : x.deals.map((d) => (
            <div key={d.id} className="row" style={{ ...rowStyle, cursor: "pointer" }} onClick={() => go(`/deals/${d.id}`)}>
              <span style={{ flex: 1 }}>{d.label}</span><span className="muted small"><Priv>{d.value ? money(d.value) : "Value TBC"}</Priv></span>
              <Badge tone={d.stage === "Won" ? "good" : d.stage === "Lost" ? "bad" : undefined}>{d.stage}</Badge>
            </div>
          ))}
        </Panel>
      </div>

      <Modal open={!!service} onClose={() => setSvc(null)} title={service?.name || ""}>
        {service && (
          <form
            className="stack"
            style={{ gap: 12 }}
            action={async (fd) => {
              await updateClientServicePriceAction(service.id, c.id, fd);
              const st = String(fd.get("status"));
              if (st !== service.status) await tSetClientServiceStatus(service.id, st);
              setSvc(null);
            }}
          >
            <div className="row"><Badge tone={service.status === "active" ? "good" : "warn"}>{service.status}</Badge><span className="muted small">{service.started ? `Started ${fmtDate(service.started)}` : "Not started"}</span></div>
            <KV
              rows={[
                ["Setup (one-off)", service.setup ? money(service.setup) : "—", null, true],
                ["Monthly", service.monthly ? money(service.monthly) : "—", null, true],
                ["Item discount", service.discount ? `${service.discount}%` : "None"],
                ["Effective monthly", serviceMonthly(service) ? money(serviceMonthly(service)) : "—", "good", true],
              ]}
            />
            {service.notes && <div className="note">{service.notes}</div>}
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Override rate / discount</p>
              <div className="form-grid">
                <input className="input" name="customSetupPrice" placeholder="Custom setup price" defaultValue={service.custom?.setup ?? ""} />
                <input className="input" name="customMonthlyPrice" placeholder="Custom monthly price" defaultValue={service.custom?.monthly ?? ""} />
                <input className="input" name="discountPercent" placeholder="This item's discount %" defaultValue={service.discount || ""} />
                <select className="select" name="status" defaultValue={service.status}><option value="active">active</option><option value="paused">paused</option><option value="ended">ended</option></select>
              </div>
              <p className="muted small" style={{ marginTop: 6 }}>Leave a price blank to revert to the catalogue price.</p>
            </div>
            <div className="row">
              <button type="button" className="btn btn-danger" onClick={async () => { await removeClientServiceAction(service.id, c.id); setSvc(null); }}>Remove service</button>
              <span className="spacer" />
              <button className="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        )}
      </Modal>
      <FormModal open={adding} onClose={() => setAdding(false)} title="Add service" action={addClientServiceAction.bind(null, c.id)} submit="Add service">
        <label className="field"><span>Service</span>
          <select className="select" name="serviceItemId" required defaultValue="">
            <option value="" disabled>Select a catalogue item…</option>
            {x.catalogue.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <input className="input" name="customSetupPrice" placeholder="Custom setup price (optional)" />
          <input className="input" name="customMonthlyPrice" placeholder="Custom monthly price (optional)" />
          <input className="input" name="discountPercent" placeholder="Discount % on this item (optional)" />
          <input className="input" name="startedOn" type="date" defaultValue={TODAY} />
        </div>
      </FormModal>
      {x.companyId && (
        <FormModal open={dealOpen} onClose={() => setDealOpen(false)} title="New deal" action={addClientDealAction.bind(null, c.id, x.companyId)} submit="Create deal">
          <p className="muted small">For upselling an existing client — creates a real pipeline deal against this client&apos;s company.</p>
          {x.contacts.length > 0 && (
            <label className="field"><span>Primary contact</span>
              <select className="select" name="primaryContactId" defaultValue=""><option value="">None</option>{x.contacts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </label>
          )}
          <div className="form-grid">
            <label className="field"><span>Next action</span><input className="input" name="nextAction" required /></label>
            <label className="field"><span>Next action date</span><input className="input" name="nextActionDate" type="date" defaultValue={TODAY} required /></label>
            <label className="field"><span>Value (NZD)</span><input className="input" name="valueNzd" type="number" min="0" /></label>
            <label className="field"><span>Package tier</span><input className="input" name="packageTier" /></label>
          </div>
          <label className="field"><span>Source</span><input className="input" name="source" defaultValue="Upsell" /></label>
        </FormModal>
      )}
    </div>
  );
}

/* ─── Delivery ─────────────────────────────────────────────────────────── */
const ROADMAP_TONE = { done: "good", in_progress: "accent", planned: undefined };
const DOC_TYPES = [["proposal", "Proposal"], ["contract", "Contract"], ["deck", "Deck"], ["other", "Other"]];

function roadmapForm(r, patch) {
  const fd = new FormData();
  const v = { ...r, ...patch };
  fd.set("title", v.title);
  fd.set("description", v.narrative);
  fd.set("targetDate", v.target);
  fd.set("status", v.status);
  return fd;
}

function DeliveryTab({ c, x }) {
  const [open, setOpen] = useState(null); // "doc" | "phase" | "idea" | "tool" | {doc} | {phase}
  const close = () => setOpen(null);
  return (
    <div className="grid g-2">
      <div className="stack">
        <Panel title="Documents" icon={FileText} pad={false} right={<button className="btn btn-sm" onClick={() => setOpen("doc")}><Plus size={12} /> Add document</button>}>
          {x.documents.length === 0 ? <Empty title="No documents" /> : (
            <table className="table">
              <tbody>
                {x.documents.map((d) => (
                  <tr key={d.id}>
                    <td className="strong"><a href={`/api/documents/${d.id}/download`} target={d.external ? "_blank" : undefined} rel="noreferrer">{d.title}</a></td>
                    <td><Badge>{d.type}</Badge></td>
                    <td className="num muted">{fmtDate(d.date)}</td>
                    <td className="num nowrap">
                      <button className="iconbtn" style={tiny} onClick={() => setOpen({ doc: d })} aria-label="Edit document"><Pencil size={12} /></button>
                      <RemoveBtn onClick={() => deleteDocumentAction(d.id, c.id)} label="Remove document" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Roadmap phases" icon={Map} right={<button className="btn btn-sm" onClick={() => setOpen("phase")}><Plus size={12} /> Add phase</button>}>
          {x.roadmap.length === 0 ? <p className="muted small">No phases yet — the portal can&apos;t be handed over without a roadmap.</p> : x.roadmap.map((r) => (
            <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--t-line)" }}>
              <div className="row">
                <span className="strong" style={{ flex: 1 }}>{r.title}</span>
                <span className="muted small">{fmtDate(r.target)}</span>
                <select className="select" style={{ width: 130, height: 28 }} defaultValue={r.status} onChange={(e) => updateRoadmapItemAction(r.id, c.id, roadmapForm(r, { status: e.target.value }))} aria-label="Phase status">
                  <option value="planned">Planned</option><option value="in_progress">In progress</option><option value="done">Done</option>
                </select>
                <Badge tone={ROADMAP_TONE[r.status]}>{r.status.replace("_", " ")}</Badge>
                <button className="iconbtn" style={tiny} onClick={() => setOpen({ phase: r })} aria-label="Edit phase"><Pencil size={12} /></button>
                <RemoveBtn onClick={() => deleteRoadmapItemAction(r.id, c.id)} label="Remove phase" />
              </div>
              {r.narrative && <p className="muted small" style={{ marginTop: 4 }}>Focus Dial: {r.narrative}</p>}
            </div>
          ))}
        </Panel>
      </div>
      <div className="stack">
        <Panel title="Ideation" icon={Lightbulb} right={<button className="btn btn-sm" onClick={() => setOpen("idea")}><Plus size={12} /> Add idea</button>}>
          {x.ideas.length === 0 ? <p className="muted small">No ideas logged for this client.</p> : x.ideas.map((i) => (
            <div key={i.id} className="row" style={rowStyle}><span style={{ flex: 1 }}>{i.title}</span><Badge>{i.status.replace("_", " ")}</Badge><RemoveBtn onClick={() => deleteIdeationItemAction(i.id, c.id)} label="Remove idea" /></div>
          ))}
        </Panel>
        <Panel title="Tool stack" icon={Wrench} right={<button className="btn btn-sm" onClick={() => setOpen("tool")}><Plus size={12} /> Add tool</button>}>
          {x.tools.length === 0 ? <p className="muted small">No tools listed.</p> : x.tools.map((t) => (
            <div key={t.id} className="row" style={rowStyle}><span className="strong" style={{ flex: 1 }}>{t.name}</span><span className="muted small">{t.category}</span><Badge tone={t.status === "current" ? "good" : undefined}>{t.status}</Badge><RemoveBtn onClick={() => deleteToolStackItemAction(t.id, c.id)} label="Remove tool" /></div>
          ))}
        </Panel>
        <Panel title="Embeds" icon={Link2}>
          <form className="stack" style={{ gap: 10 }} action={updateClientEmbedsAction.bind(null, c.id)}>
            <p className="muted small">Drive and Looker Studio stay the systems of record — these are the URLs the portal embeds.</p>
            <label className="field"><span>Drive folder embed URL</span><input className="input" name="driveFolderUrl" defaultValue={x.driveUrl} /></label>
            <label className="field"><span>Looker Studio embed URL</span><input className="input" name="lookerStudioUrl" defaultValue={x.lookerUrl} /></label>
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Save</button>
          </form>
        </Panel>
      </div>

      <FormModal open={open === "doc"} onClose={close} title="Add document" action={uploadDocumentAction.bind(null, c.id)} submit="Add document" multipart>
        <input type="hidden" name="companyId" value={x.companyId ?? ""} />
        <label className="field"><span>Document name</span><input className="input" name="title" required /></label>
        <div className="form-grid">
          <label className="field"><span>Type</span><select className="select" name="docType" defaultValue="other">{DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field"><span>Document date</span><input className="input" name="documentDate" type="date" /></label>
        </div>
        <label className="field"><span>File</span><input className="input" name="file" type="file" /></label>
        <label className="field"><span>Or link a Drive/hosted PDF URL instead</span><input className="input" name="externalUrl" type="url" placeholder="https://" /></label>
      </FormModal>
      {open?.doc && (
        <FormModal open onClose={close} title="Edit document" action={updateDocumentAction.bind(null, open.doc.id, c.id)} submit="Save">
          <label className="field"><span>Document name</span><input className="input" name="title" defaultValue={open.doc.title} required /></label>
          <div className="form-grid">
            <label className="field"><span>Type</span><select className="select" name="docType" defaultValue={open.doc.type}>{DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="field"><span>Document date</span><input className="input" name="documentDate" type="date" defaultValue={open.doc.date} /></label>
          </div>
        </FormModal>
      )}
      <FormModal open={open === "phase" || !!open?.phase} onClose={close} title={open?.phase ? "Edit phase" : "Add phase"} submit={open?.phase ? "Save" : "Add phase"}
        action={open?.phase ? updateRoadmapItemAction.bind(null, open.phase.id, c.id) : createRoadmapItemAction.bind(null, c.id)}>
        <label className="field"><span>Phase name</span><input className="input" name="title" defaultValue={open?.phase?.title} required /></label>
        <label className="field"><span>Narrative shown on the Focus Dial</span><textarea className="textarea" name="description" defaultValue={open?.phase?.narrative} /></label>
        <div className="form-grid">
          <label className="field"><span>Target date</span><input className="input" name="targetDate" type="date" defaultValue={open?.phase?.target} /></label>
          {open?.phase && (
            <label className="field"><span>Status</span>
              <select className="select" name="status" defaultValue={open.phase.status}><option value="planned">Planned</option><option value="in_progress">In progress (current)</option><option value="done">Done</option></select>
            </label>
          )}
        </div>
      </FormModal>
      <FormModal open={open === "idea"} onClose={close} title="Add idea" action={createIdeationItemAction.bind(null, c.id)} submit="Add idea">
        <label className="field"><span>Idea</span><input className="input" name="title" required /></label>
        <label className="field"><span>Description</span><textarea className="textarea" name="description" /></label>
      </FormModal>
      <FormModal open={open === "tool"} onClose={close} title="Add tool" action={createToolStackItemAction.bind(null, c.id)} submit="Add tool">
        <div className="form-grid">
          <label className="field"><span>Tool name</span><input className="input" name="toolName" required /></label>
          <label className="field"><span>Category</span><input className="input" name="category" /></label>
        </div>
        <label className="field"><span>Status</span><select className="select" name="status" defaultValue="current"><option value="current">Current</option><option value="planned">Planned</option></select></label>
      </FormModal>
    </div>
  );
}

/* ─── Team & activity ──────────────────────────────────────────────────── */
const CHANNEL_DOT = { ok: undefined, warn: "warn", off: "down" };

function TeamTab({ c, x }) {
  const [open, setOpen] = useState(null); // "member" | "channel" | "meeting" | "emails"
  const [draft, setDraft] = useState("");
  const close = () => setOpen(null);
  return (
    <div className="grid g-2">
      <div className="stack">
        <Panel title="Account team" icon={Users} pad={false} right={<button className="btn btn-sm" onClick={() => setOpen("member")}><Plus size={12} /> Add team member</button>}>
          {x.team.length === 0 ? <Empty title="No team members" /> : (
            <table className="table">
              <tbody>
                {x.team.map((m) => (
                  <tr key={m.id}><td className="strong">{m.name}</td><td>{m.role}</td><td><Priv>{m.email}</Priv></td><td className="num"><RemoveBtn onClick={() => deleteClientTeamMemberAction(m.id, c.id)} label="Remove member" /></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Campaign health" icon={Radio} right={<button className="btn btn-sm" onClick={() => setOpen("channel")}><Plus size={12} /> Add channel</button>}>
          {x.channels.length === 0 ? <p className="muted small">No channels logged yet.</p> : (
            <div className="channels">
              {x.channels.map((ch) => (
                <div className="channel" key={ch.id}>
                  <span className="sdot" data-s={CHANNEL_DOT[ch.status]} />{ch.name}<span className="label">{ch.label}</span>
                  <RemoveBtn onClick={() => deleteClientHealthChannelAction(ch.id, c.id)} label="Remove channel" />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Emails" icon={Mail} right={<button className="btn btn-sm" onClick={() => setOpen("emails")}>View all</button>}>
          {x.emails.length === 0 ? <p className="muted small">No linked emails.</p> : x.emails.map((e) => (
            <div key={e.id} className="row" style={rowStyle}><span style={{ flex: 1 }}>{e.subject}</span><Badge>{e.direction === "inbound" ? "In" : "Out"}</Badge><span className="muted small"><Priv>{e.from}</Priv> · {fmtDate(e.at)}</span></div>
          ))}
          {x.contacts.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: "12px 0 6px" }}>Extra addresses for this client</p>
              <form className="row" action={addClientContactEmailAliasAction.bind(null, c.id)}>
                <select className="select" name="contactId" required defaultValue={x.contacts[0].id} style={{ width: 170 }} aria-label="Contact">
                  {x.contacts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input className="input" name="email" type="email" style={{ flex: 1 }} placeholder="another.address@example.com" required />
                <button className="btn btn-sm">Add</button>
              </form>
              <p className="muted small" style={{ marginTop: 6 }}>Mail from this address will match the contact automatically.</p>
            </>
          )}
        </Panel>
      </div>
      <div className="stack">
        <Panel title="Activity feed" icon={History} pad={false}>
          <form className="quickadd" action={async (fd) => { if (draft.trim()) { fd.set("body", draft.trim()); await addClientActivityFeedEntryAction(c.id, fd); setDraft(""); } }}>
            <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What happened" />
            <button className="btn btn-primary">Log activity</button>
          </form>
          <div className="panel-pad timeline">
            {x.activity.length === 0 && <p className="muted small">No activity logged yet.</p>}
            {x.activity.map((a) => (
              <div key={a.id}>
                <time>{fmtDate(a.at)} · {a.at.slice(11)}</time>
                <span className="row" style={{ alignItems: "flex-start" }}><span style={{ flex: 1 }}>{a.body}</span><RemoveBtn onClick={() => deleteClientActivityFeedEntryAction(a.id, c.id)} label="Remove entry" /></span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Meeting summaries" icon={NotebookPen} right={<button className="btn btn-sm" onClick={() => setOpen("meeting")}><Plus size={12} /> Log meeting summary</button>}>
          {x.meetings.length === 0 ? <p className="muted small">No meetings logged.</p> : x.meetings.map((m) => (
            <details key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--t-line)" }}>
              <summary className="row" style={{ cursor: "pointer" }}>
                <span className="strong" style={{ flex: 1 }}>{m.title}</span><span className="muted small">{fmtDate(m.at)}</span>
                <RemoveBtn onClick={(e) => { e.preventDefault(); deleteMeetingSummaryAction(m.id, c.id); }} label="Remove summary" />
              </summary>
              <div className="muted small prose" style={{ marginTop: 6, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: m.html }} />
            </details>
          ))}
        </Panel>
      </div>

      <FormModal open={open === "member"} onClose={close} title="Add team member" action={addClientTeamMemberAction.bind(null, c.id)} submit="Add member">
        <div className="form-grid">
          <label className="field"><span>Name</span><input className="input" name="name" required /></label>
          <label className="field"><span>Role</span><input className="input" name="role" /></label>
        </div>
        <label className="field"><span>Contact email</span><input className="input" name="contactEmail" type="email" /></label>
      </FormModal>
      <FormModal open={open === "channel"} onClose={close} title="Add channel" action={addClientHealthChannelAction.bind(null, c.id)} submit="Add channel">
        <label className="field"><span>Channel</span><input className="input" name="channelName" placeholder="e.g. Meta Ads" required /></label>
        <div className="form-grid">
          <label className="field"><span>Status</span><select className="select" name="status" defaultValue="ok"><option value="ok">OK</option><option value="warn">Warning</option><option value="off">Off</option></select></label>
          <label className="field"><span>Status label</span><input className="input" name="statusLabel" placeholder="Active, Paused, Live" required /></label>
        </div>
      </FormModal>
      <FormModal open={open === "meeting"} onClose={close} title="Log meeting summary" action={createMeetingSummaryAction.bind(null, c.id)} submit="Log summary" wide>
        <label className="field"><span>Meeting title</span><input className="input" name="title" required /></label>
        <label className="field"><span>Summary — Markdown supported</span><textarea className="textarea" name="summary" rows={10} required /></label>
      </FormModal>
      {open === "emails" && <AllEmails clientId={c.id} onClose={close} />}
    </div>
  );
}

/** Every email matched to this client, with the body opening in place. */
function AllEmails({ clientId, onClose }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");
  const [body, setBody] = useState(null);
  useEffect(() => {
    getClientEmailsAction(clientId).then(setRows, () => setRows([]));
  }, [clientId]);
  const shown = (rows || []).filter((e) => filter === "all" || e.direction === filter);
  return (
    <Modal open onClose={onClose} title={body ? body.subject : "All emails"} wide>
      {body ? (
        <>
          <button className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setBody(null)}><ArrowLeft size={12} /> All emails</button>
          {body.loading ? <p className="muted">Loading…</p> : body.html ? (
            <iframe title="Email" sandbox="" srcDoc={body.html} style={{ width: "100%", height: 460, border: "1px solid var(--t-line)", background: "#fff" }} />
          ) : (
            <pre className="small" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{body.text || "(No readable body content)"}</pre>
          )}
        </>
      ) : (
        <>
          <div className="seg" data-small role="tablist">
            {[["all", "All"], ["outbound", "Sent"], ["inbound", "Received"]].map(([v, l]) => (
              <button key={v} role="tab" aria-selected={filter === v} data-active={filter === v || undefined} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
          {rows === null ? <p className="muted">Loading…</p> : shown.length === 0 ? <p className="muted">No emails to show.</p> : (
            <table className="table">
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id} data-click onClick={() => {
                    setBody({ subject: e.subject || "(no subject)", loading: true });
                    getEmailBodyAction(e.id).then((b) => setBody({ subject: e.subject || "(no subject)", html: b?.html, text: b?.text }));
                  }}>
                    <td className="strong">{e.subject || "(no subject)"}<div className="muted small">{e.snippet}</div></td>
                    <td><Priv>{e.direction === "inbound" ? e.fromAddress : e.toAddresses?.[0] ?? "—"}</Priv></td>
                    <td className="num nowrap muted">{new Date(e.sentAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td><Badge>{e.direction === "inbound" ? "In" : "Out"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Modal>
  );
}
