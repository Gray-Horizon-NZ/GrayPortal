"use client";
// Port of the terminal concept's System screens (OS/grayportal-terminal-
// concept/src/screens/System.jsx): Vault, Brand guidelines, Settings, Alerts
// and Search, on real data. Reveal goes through the real re-auth (a fresh
// Google sign-in escalated to the TOTP challenge) before the secret is
// decrypted; Settings keeps every real integration and security control.
import { useEffect, useRef, useState, useTransition } from "react";
import { onAuthStateChanged, multiFactor } from "firebase/auth";
import {
  ShieldCheck, Eye, EyeOff, Copy, Palette, Type, Sun, EyeOff as Blur, Users, Plug, Lock, Bell, Search, Wallet, Info, CheckCheck,
  Plus, ExternalLink, RotateCw, Trash2, Package, CalendarDays, ListChecks, Lightbulb, AlertTriangle, BookOpen, X,
  Building2, User, Workflow, Mail,
} from "lucide-react";
import { useStore } from "../store";
import { TODAY, fmtDate, daysBetween, money, INTERNAL_LISTS } from "../format";
import { PageHead, Panel, Priv, Badge, Toggle, Seg, KV, Empty, Modal, go } from "../ui";
import { TasklistSelect } from "../parts";
import { establishVaultSession } from "@/lib/vaultReauth";
import { firebaseAuth } from "@/lib/firebase/client";
import { useTotpEnroll } from "@/lib/totp/useTotpEnroll";
import {
  createCredentialAction, rotateCredentialAction, softDeleteCredentialAction, revealCredentialAction,
  generateMopAction, downloadMopAction, uploadMopAction,
} from "@/app/(app)/vault/actions";
import {
  disconnectGoogleAction, disconnectXeroAction, revokeSessionsAction, setInternalTasklistMappingAction,
  createIdeationCategoryAction, deleteIdeationCategoryAction, updateCalendarSettingsAction,
} from "@/app/(app)/settings/actions";
import { tSetExpenseBudget } from "../actions";

const sq = { width: 28, height: 28 };

/* ─── Vault ────────────────────────────────────────────────────────────── */

/**
 * The concept's credentials table. Shared by /vault (business-wide,
 * clientId null) and a client profile's Access tab (that client's own).
 * Reveals hide again after 10 seconds, as in the concept.
 */
export function CredentialsTable({ clientId, items }) {
  const [shown, setShown] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [rotating, setRotating] = useState(null);
  const timers = useRef({});
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const fetchSecret = async (id) => {
    if (shown[id]) return shown[id];
    setBusy(id);
    setError("");
    try {
      await establishVaultSession();
      const { secret } = await revealCredentialAction(id);
      setShown((s) => ({ ...s, [id]: secret }));
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => setShown((s) => ({ ...s, [id]: null })), 10000);
      return secret;
    } catch (e) {
      setError(e?.message || "Couldn't reveal credential");
      return null;
    } finally {
      setBusy(null);
    }
  };
  const toggle = (id) => (shown[id] ? setShown((s) => ({ ...s, [id]: null })) : fetchSecret(id));
  const copy = async (id) => {
    const secret = await fetchSecret(id);
    if (secret) navigator.clipboard.writeText(secret);
  };

  return (
    <Panel title={clientId ? "Credentials" : "Business-wide credentials"} icon={ShieldCheck} pad={false} right={<button className="btn btn-sm" onClick={() => setAdding(true)}><Plus size={12} /> Add credential</button>}>
      {error && <div className="note" data-tone="bad" style={{ margin: 12 }}><X size={14} /> {error}</div>}
      {items.length === 0 ? <Empty icon={ShieldCheck} title="No credentials stored yet" /> : (
        <table className="table">
          <thead><tr><th>Label</th><th>Username</th><th>Secret</th><th>Last rotated</th><th /></tr></thead>
          <tbody>
            {items.map((v) => {
              const age = v.rotated ? daysBetween(v.rotated, TODAY) : null;
              return (
                <tr key={v.id}>
                  <td className="strong">{v.label}{v.url && <a href={v.url} target="_blank" rel="noreferrer" className="muted" style={{ marginLeft: 6 }} aria-label="Open link"><ExternalLink size={11} /></a>}</td>
                  <td><Priv>{v.user || "—"}</Priv></td>
                  <td className="mono"><Priv>{busy === v.id ? "verifying…" : shown[v.id] || "••••••••••••"}</Priv></td>
                  <td className="nowrap">{v.rotated ? fmtDate(v.rotated) : "—"} {age > 180 ? <Badge tone="bad">{age}d — rotate</Badge> : age > 90 ? <Badge tone="warn">{age}d</Badge> : null}</td>
                  <td className="num">
                    <span className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <button className="iconbtn" style={sq} onClick={() => toggle(v.id)} disabled={busy === v.id} aria-label={shown[v.id] ? "Hide" : "Reveal"}>{shown[v.id] ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                      <button className="iconbtn" style={sq} onClick={() => copy(v.id)} disabled={busy === v.id} aria-label="Copy"><Copy size={13} /></button>
                      <button className="iconbtn" style={sq} onClick={() => setRotating(v)} aria-label="Rotate secret"><RotateCw size={13} /></button>
                      <button className="iconbtn" style={sq} onClick={() => softDeleteCredentialAction(v.id, clientId)} aria-label="Remove"><Trash2 size={13} /></button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add credential">
        <form className="stack" style={{ gap: 10 }} action={async (fd) => { await createCredentialAction(clientId, fd); setAdding(false); }}>
          <div className="form-grid">
            <label className="field"><span>Label</span><input className="input" name="label" placeholder="e.g. Google Ads" required /></label>
            <label className="field"><span>Username / email</span><input className="input" name="username" /></label>
            <label className="field"><span>Password / secret</span><input className="input" name="secret" type="password" required /></label>
            <label className="field"><span>URL</span><input className="input" name="url" /></label>
          </div>
          <label className="field"><span>Notes</span><textarea className="textarea" name="notes" /></label>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}><Plus size={14} /> Add credential</button>
        </form>
      </Modal>
      <Modal open={!!rotating} onClose={() => setRotating(null)} title={`Rotate ${rotating?.label || ""}`}>
        {rotating && (
          <form className="row" action={async (fd) => { await rotateCredentialAction(rotating.id, clientId, fd); setRotating(null); }}>
            <input className="input" style={{ flex: 1 }} name="secret" type="password" placeholder="New secret" required autoFocus />
            <button className="btn btn-primary" type="submit"><RotateCw size={13} /> Rotate</button>
          </form>
        )}
      </Modal>
    </Panel>
  );
}

export function Vault() {
  const { credentials, mop } = useStore();
  return (
    <div className="screen">
      <PageHead title="Credentials vault" sub="Secrets are encrypted at rest and only decrypted on reveal · admin only · per-client credentials live on each client's page" />
      <div className="note"><Info size={14} /> Each reveal asks for a fresh sign-in and your authenticator code. Reveals hide again after 10 seconds. With &quot;Blur private information&quot; on, revealed secrets stay blurred.</div>
      <CredentialsTable clientId={null} items={credentials} />
      <MopPanel mop={mop} />
    </div>
  );
}

function MopPanel({ mop }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn) => {
    setError("");
    setBusy(true);
    try {
      await establishVaultSession();
      await fn();
    } catch (e) {
      setError(e?.message || "That didn't work");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Mobile Operations Package" icon={Package} right={mop ? `Updated ${fmtDate(mop.at)}` : "None on file"}>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Encrypted bundle of everything needed to stand up Gray Horizon HQ on a new device. Static and manually regenerated — the decryption password is a business-wide credential above.
      </p>
      <div className="row">
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => generateMopAction())}>{busy ? "Working…" : "Regenerate from credentials"}</button>
        <button className="btn" disabled={busy} onClick={() => run(async () => {
          const r = await downloadMopAction();
          if (r?.url) window.location.href = r.url;
          else throw new Error("No package exists yet — generate or upload one first");
        })}>Download</button>
        <label className="btn" aria-disabled={busy}>
          Upload ZIP
          <input type="file" accept=".zip" hidden disabled={busy} onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) run(() => uploadMopAction(f));
          }} />
        </label>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>Uploading replaces the current package — whichever of generate/upload ran last is what downloads.</p>
      {error && <p className="small tone-bad" style={{ marginTop: 6 }}>{error}</p>}
    </Panel>
  );
}

/* ─── Brand guidelines ─────────────────────────────────────────────────── */
const DARK = [["Black", "#0b0b0c"], ["Surface", "#151517"], ["Dark", "#28282b"], ["Mid", "#5c5a54"], ["Light", "#eeece6"], ["White", "#f7f4ee"]];
const LIGHT = [["Ink", "#f7f5ef"], ["Panel", "#ffffff"], ["Panel 2", "#f1eee3"], ["Line", "#e0dbca"], ["Text", "#1c1c1c"], ["Brass", "#9b8353"]];
const STATUS = [["Gold accent", "#c2a468"], ["Success", "#7fa583"], ["Warning", "#bd7f45"], ["Danger", "#c17553"]];
const GUIDE = [["cover", "Cover"], ["philosophy", "Voice"], ["colour", "Colour"], ["typography", "Type"], ["logo", "Logo"], ["layout", "Layout"], ["check", "Brand check"]];

export function BrandGuidelines() {
  const [section, setSection] = useState("cover");
  const frame = useRef(null);
  const swatch = ([n, hex]) => (
    <div key={hex} className="swatch-lg" style={{ background: hex, color: parseInt(hex.slice(1, 3), 16) > 140 ? "#151517" : "#f7f4ee" }}>
      {n}<br />{hex}
    </div>
  );
  return (
    <div className="screen">
      <PageHead title="Brand guidelines" sub="Gray Horizon visual identity" />
      <div className="grid g-2">
        <Panel title="Logo" icon={Palette}>
          <div className="grid g-2">
            {/* eslint-disable @next/next/no-img-element -- static brand assets, sized inline */}
            <div style={{ background: "#0b0b0c", padding: 24, display: "grid", placeItems: "center", gap: 12, border: "1px solid var(--t-line)" }}>
              <img src="/brand-icon.png" alt="" style={{ width: 56 }} />
              <img src="/email-wordmark.png" alt="Gray Horizon" style={{ height: 22, filter: "invert(1)", mixBlendMode: "screen" }} />
            </div>
            <div style={{ background: "#f7f5ef", padding: 24, display: "grid", placeItems: "center", gap: 12, border: "1px solid var(--t-line)" }}>
              <img src="/brand-icon.png" alt="" style={{ width: 56 }} />
              <img src="/email-wordmark.png" alt="Gray Horizon" style={{ height: 22, mixBlendMode: "multiply" }} />
            </div>
            {/* eslint-enable @next/next/no-img-element */}
          </div>
          <KV rows={[["Accent", "One gold hue only — highlights, active states, primary actions"], ["Corners", "Square (radius 0) everywhere except circles"], ["Shadows", "Tonal layering on dark, not drop shadows"]]} />
        </Panel>
        <Panel title="Typography" icon={Type}>
          <p style={{ fontFamily: "var(--f-display)", fontSize: 44, fontWeight: 600, color: "var(--t-strong)", lineHeight: 1.1 }}>Cormorant <em>Display</em></p>
          <p className="muted small" style={{ marginBottom: 18 }}>Headlines, hero numbers, the occasional italic accent</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: "var(--t-strong)" }}>DM Sans — interface &amp; body</p>
          <p className="muted small" style={{ marginBottom: 18 }}>Everything functional. Tabular numerals for money.</p>
          <p className="eyebrow">Eyebrow · tracked uppercase 0.22em</p>
        </Panel>
      </div>
      <Panel title="Dark palette" icon={Palette}><div className="grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>{DARK.map(swatch)}</div></Panel>
      <Panel title="Light palette" icon={Palette}><div className="grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>{LIGHT.map(swatch)}</div></Panel>
      <Panel title="Accent & status" icon={Palette}><div className="grid g-4" style={{ gap: 8 }}>{STATUS.map(swatch)}</div></Panel>
      {/* The full guidebook (public/brand-guidebook.html), jumped section by section in one mounted frame. */}
      <Panel title="Full guidebook" icon={BookOpen} right={<Seg small value={section} onChange={(v) => { setSection(v); if (frame.current?.contentWindow) frame.current.contentWindow.location.hash = v; }} options={GUIDE} />} pad={false}>
        <iframe ref={frame} src="/brand-guidebook.html#cover" title="Gray Horizon Brand Guidebook" style={{ width: "100%", height: "75vh", border: 0, display: "block" }} />
      </Panel>
    </div>
  );
}

/* ─── Settings ─────────────────────────────────────────────────────────── */
export function Settings() {
  const { prefs, setPref, settings: s } = useStore();
  return (
    <div className="screen">
      <PageHead title="Settings" sub="Preferences save to this browser; integrations and security apply everywhere" />
      {s.flash.map((f) => <div key={f.text} className="note" data-tone={f.tone}>{f.tone === "bad" ? <AlertTriangle size={14} /> : <CheckCheck size={14} />}{f.text}</div>)}
      <div className="grid g-2">
        <div className="stack">
          <Panel title="Appearance" icon={Sun}>
            <div className="toggle" style={{ cursor: "default" }}>
              <span className="toggle-text"><span>Theme</span><small>Also on the sun/moon button in the header</small></span>
              <Seg small value={prefs.theme} onChange={(v) => setPref("theme", v)} options={[["dark", "Dark"], ["light", "Light"]]} />
            </div>
            <div className="toggle" style={{ cursor: "default" }}>
              <span className="toggle-text"><span>Table density</span><small>Row height in lists and tables</small></span>
              <Seg small value={prefs.density} onChange={(v) => setPref("density", v)} options={[["comfortable", "Comfortable"], ["compact", "Compact"]]} />
            </div>
          </Panel>
          <Panel title="Privacy" icon={Blur}>
            <Toggle
              label="Blur private numbers & information"
              hint="Money, contact details, emails and secrets. Toggle anywhere with ⇧P or the eye button."
              checked={prefs.privacy}
              onChange={(v) => setPref("privacy", v)}
            />
          </Panel>
          <Panel title="Clients" icon={Users}>
            <Toggle
              label="Minimise client view"
              hint="Hide the brand banner on client cards — name, revenue and health only"
              checked={prefs.minimalClientCards}
              onChange={(v) => setPref("minimalClientCards", v)}
            />
            <div className="toggle" style={{ cursor: "default" }}>
              <span className="toggle-text"><span>Default client layout</span><small>Cards (terminal tiles) or list (rows)</small></span>
              <Seg small value={prefs.clientView} onChange={(v) => setPref("clientView", v)} options={[["grid", "Cards"], ["list", "List"]]} />
            </div>
          </Panel>
          {s.google && (
            <Panel title="Calendars to merge in" icon={CalendarDays}>
              <p className="muted small" style={{ marginBottom: 10 }}>Other calendars this Google account can see. Each ticked calendar gets its own colour on its events. Nothing ticked means primary only.</p>
              <CalendarPicker calendars={s.calendars} settings={s.calendarSettings} />
            </Panel>
          )}
          {s.google && (
            <Panel title="Internal task lists" icon={ListChecks}>
              <p className="muted small" style={{ marginBottom: 10 }}>Route the internal task lists into their own Google Tasks lists. Per-client routing is on each client&apos;s page.</p>
              <div className="stack" style={{ gap: 12 }}>
                {INTERNAL_LISTS.map((l) => (
                  <label key={l.id} className="field">
                    <span>{l.label}</span>
                    <TasklistSelect linked={!!s.tasklists[l.id]} newName={l.label} onLink={(id) => setInternalTasklistMappingAction(l.id, id)} />
                  </label>
                ))}
              </div>
            </Panel>
          )}
          <Panel title="Ideation categories" icon={Lightbulb}>
            <p className="muted small" style={{ marginBottom: 10 }}>The categories ideas are tagged with on the Ideation board. Removing one doesn&apos;t touch its ideas.</p>
            <div className="row" style={{ flexWrap: "wrap", marginBottom: 10 }}>
              {s.categories.map((c) => (
                <span key={c.id} className="chip">{c.label}<button className="linkbtn" onClick={() => deleteIdeationCategoryAction(c.id)} aria-label={`Remove ${c.label}`} style={{ marginLeft: 4 }}><X size={11} /></button></span>
              ))}
              {s.categories.length === 0 && <span className="muted small">No categories yet.</span>}
            </div>
            <form className="row" action={createIdeationCategoryAction}>
              <input className="input" name="label" style={{ flex: 1 }} placeholder="New category name" required />
              <button className="btn btn-sm">Add</button>
            </form>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Integrations" icon={Plug}>
            <KV
              rows={[
                ["Google Calendar & Tasks", s.google ? `Connected${s.email ? ` · ${s.email}` : ""}` : "Not connected", s.google ? "good" : "bad"],
                ["Gmail (triage + campaigns)", s.google ? "Connected (same account)" : "Not connected", s.google ? "good" : "bad"],
                ["Xero", s.xero ? `Connected · ${s.xero} · read-only sync` : "Not connected", s.xero ? "good" : "bad"],
              ]}
            />
            <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
              {s.google ? <button className="btn btn-sm" onClick={() => disconnectGoogleAction()}>Disconnect Google</button> : <a className="btn btn-sm btn-primary" href="/api/google/oauth/start">Connect Google</a>}
              {s.xero ? <button className="btn btn-sm" onClick={() => disconnectXeroAction()}>Disconnect Xero</button> : <a className="btn btn-sm btn-primary" href="/api/xero/oauth/start">Connect Xero</a>}
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>Deals&apos; next actions and tasks sync one way to Google; Xero invoices sync one way in. GrayPortal never writes to Xero. If Google was connected before Gmail was added, reconnect once to grant it.</p>
          </Panel>
          <Panel title="Expense budgets" icon={Wallet} right="Monthly">
            {s.budgetCategories.length === 0 ? <p className="muted small">Add an expense on Finance to budget its category.</p> : (
              <div className="form-grid">
                {s.budgetCategories.map((k) => (
                  <label key={k} className="field">
                    <span>{k}</span>
                    <input className="input priv" type="number" min="0" step="0.01" defaultValue={s.budgets[k] ?? ""} placeholder="No budget" onBlur={(e) => {
                      const v = Number(e.target.value || 0);
                      if (v !== (s.budgets[k] ?? 0)) tSetExpenseBudget(k, v);
                    }} />
                  </label>
                ))}
              </div>
            )}
            {s.budgetCategories.length > 0 && <p className="muted small" style={{ marginTop: 8 }}>Saves when you leave the field. Spend so far: <Priv>{money(s.spent)}</Priv>/mo.</p>}
          </Panel>
          <Panel title="Security" icon={Lock}>
            <div className="stack" style={{ gap: 14 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>Two-factor (TOTP)</p>
                <p className="muted small" style={{ marginBottom: 8 }}>Required to reveal a vault credential — a fresh code, not just an active session.</p>
                <TotpEnrollment />
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>MCP access</p>
                <p className="muted small" style={{ marginBottom: 8 }}>Connect Claude Desktop or Claude Code to read pipeline data and log activities from a chat.</p>
                <McpToken />
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>Emergency</p>
                <p className="muted small" style={{ marginBottom: 8 }}>Revokes this session and your MCP access key. You&apos;ll sign in again afterwards.</p>
                <RevokeAll />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const CAL_DEFAULT = "#b8a369";
function CalendarPicker({ calendars, settings }) {
  const [sel, setSel] = useState(() => new Map(settings?.length ? settings.map((x) => [x.id, x.color]) : calendars.filter((c) => c.primary).map((c) => [c.id, CAL_DEFAULT])));
  const [state, setState] = useState("");
  const [pending, start] = useTransition();
  if (calendars.length === 0) return <p className="muted small">No calendars found on the connected account.</p>;
  const edit = (fn) => {
    setState("");
    setSel((m) => {
      const n = new Map(m);
      fn(n);
      return n;
    });
  };
  return (
    <div className="stack" style={{ gap: 4 }}>
      {calendars.map((c) => (
        <div key={c.id} className="row" style={{ padding: "6px 0", borderBottom: "1px solid var(--t-line)" }}>
          <Toggle label={<>{c.summary}{c.primary && <span className="muted"> (primary)</span>}</>} checked={sel.has(c.id)} onChange={(on) => edit((n) => (on ? n.set(c.id, CAL_DEFAULT) : n.delete(c.id)))} />
          {sel.has(c.id) && <input type="color" aria-label={`Colour for ${c.summary}`} value={sel.get(c.id)} onChange={(e) => edit((n) => n.set(c.id, e.target.value))} style={{ width: 28, height: 22, padding: 0, border: "1px solid var(--t-line)" }} />}
        </div>
      ))}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(async () => {
          try {
            await updateCalendarSettingsAction(Array.from(sel, ([id, color]) => ({ id, color })));
            setState("Saved.");
          } catch (e) {
            setState(e?.message || "Save failed");
          }
        })}>{pending ? "Saving…" : "Save"}</button>
        {state && <span className={`small ${state === "Saved." ? "tone-good" : "tone-bad"}`}>{state}</span>}
      </div>
    </div>
  );
}

// One-time setup half of the vault re-auth (see CredentialsTable for the per-reveal half).
function TotpEnrollment() {
  const [enrolled, setEnrolled] = useState(null);
  const [code, setCode] = useState("");
  const { secret, busy, error, startEnrollment, confirmEnrollment } = useTotpEnroll();
  useEffect(() => onAuthStateChanged(firebaseAuth, (u) => u && setEnrolled(multiFactor(u).enrolledFactors.length > 0)), []);
  if (enrolled === null) return <span className="muted small">Checking…</span>;
  if (enrolled) return <Badge tone="good">Enabled</Badge>;
  if (!secret) {
    return (
      <div className="row">
        <Badge tone="warn">Not enrolled</Badge>
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => firebaseAuth.currentUser && startEnrollment(firebaseAuth.currentUser)}>Set up authenticator app</button>
        {error && <span className="small tone-bad">{error}</span>}
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="muted small">Add this key to your authenticator app, then enter the 6-digit code it shows.</p>
      <code className="mono priv" style={{ wordBreak: "break-all" }}>{secret.secretKey}</code>
      <div className="row">
        <input className="input" style={{ width: 140 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} />
        <button className="btn btn-sm btn-primary" disabled={busy || code.length !== 6} onClick={async () => {
          if (firebaseAuth.currentUser && (await confirmEnrollment(firebaseAuth.currentUser, code))) {
            setCode("");
            setEnrolled(true);
          }
        }}>Confirm</button>
      </div>
      {error && <p className="small tone-bad">{error}</p>}
    </div>
  );
}

function McpToken() {
  const [token, setToken] = useState(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (token) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <textarea className="textarea mono priv" readOnly rows={3} value={token} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 11 }} />
        <p className="small tone-bad">Treat this like a password — anyone with it can act as your admin account until you revoke it. It doesn&apos;t expire. Paste it into your MCP client&apos;s Authorization header only. It won&apos;t be shown again, and getting a new key cancels this one.</p>
      </div>
    );
  }
  return (
    <div className="row">
      <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => {
        setError("");
        try {
          const idToken = await firebaseAuth.currentUser?.getIdToken(true);
          if (!idToken) throw new Error();
          const res = await fetch("/api/mcp/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
          if (!res.ok) throw new Error();
          setToken((await res.json()).token);
        } catch {
          setError("Couldn't generate a token. Try signing out and back in.");
        }
      })}>{pending ? "Generating…" : "Get MCP access key"}</button>
      {error && <span className="small tone-bad">{error}</span>}
    </div>
  );
}

function RevokeAll() {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="row">
      <span className="small tone-bad">Sign out everywhere?</span>
      <button className="btn btn-sm btn-danger" onClick={() => revokeSessionsAction()}>Yes, revoke all</button>
      <button className="btn btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
    </div>
  ) : (
    <button className="btn btn-sm btn-danger" onClick={() => setConfirm(true)}>Revoke all sessions</button>
  );
}

/* ─── Alerts ───────────────────────────────────────────────────────────── */
export function Notifications() {
  const { notifications, setNotifications } = useStore();
  const read = (id) => setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
  return (
    <div className="screen">
      <PageHead title="Alerts" sub={`${notifications.filter((n) => !n.read).length} unread`}>
        <button className="btn" onClick={() => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))}><CheckCheck size={14} /> Mark all read</button>
      </PageHead>
      <Panel title="All alerts" icon={Bell} pad={false}>
        {notifications.length === 0 ? <Empty title="All caught up" /> : notifications.map((n) => (
          <div key={n.id} className="taskrow" style={{ gridTemplateColumns: "10px 1fr auto auto" }}>
            <span className="sdot" data-s={n.read ? undefined : "warn"} style={{ opacity: n.read ? 0.25 : 1 }} />
            <span className={n.read ? "muted" : "strong"}>{n.body}</span>
            <span className="row" style={{ gap: 6 }}>
              {n.href && <button className="btn btn-sm" onClick={() => { read(n.id); go(n.href); }}>View</button>}
              {!n.read && <button className="btn btn-sm" onClick={() => read(n.id)}>Mark read</button>}
            </span>
            <span className="muted small">{n.at}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ─── Search ───────────────────────────────────────────────────────────── */
const GROUP_ICON = { Companies: Building2, Contacts: User, Deals: Workflow, Tasks: ListChecks, "Client notes": Lightbulb, Email: Mail };

export function SearchResults() {
  const { q, groups } = useStore();
  const shown = groups.filter((g) => g.rows.length);
  return (
    <div className="screen">
      <PageHead title="Search" sub={q ? `Results for “${q}”` : "Type in the search bar above"} />
      {!q ? null : shown.length === 0 ? (
        <Panel><Empty icon={Search} title="No matches" /></Panel>
      ) : (
        shown.map((g) => (
          <Panel key={g.label} title={g.label} icon={GROUP_ICON[g.label]} pad={false} right={g.rows.length}>
            {g.rows.map((r) => (
              <button key={r.key} className="mail" onClick={() => go(r.go)}>
                <div className="mail-top"><b>{r.label}</b></div>
                {r.sub && <div className="mail-snip">{r.sub}</div>}
              </button>
            ))}
          </Panel>
        ))
      )}
    </div>
  );
}
