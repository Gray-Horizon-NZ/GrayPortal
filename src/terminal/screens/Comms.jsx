"use client";
// Port of the terminal concept's Comms screens (OS/grayportal-terminal-
// concept/src/screens/Comms.jsx): Triage, Templates, Campaigns, plus a
// campaign detail page in the same parts. Real data: triage folders are
// "Needs reply" (client threads whose newest message is inbound), "Clients"
// (every matched client email) and "Unmatched" (inbound mail waiting for a
// contact match). Every button runs the real action.
import { useEffect, useState, useTransition } from "react";
import { Inbox, Users, Mail, Megaphone, Plus, Link2, Reply, Archive, ArrowLeft, Search, Send, Trash2, Eye, Pencil } from "lucide-react";
import { useStore } from "../store";
import { fmtDate } from "../format";
import { PageHead, Panel, Priv, Badge, Meter, Empty, Modal, Seg, Stat, Toggle, go } from "../ui";
import { getEmailBodyAction } from "@/app/(app)/clients/actions";
import { searchContactsForMatchAction, matchEmailToContactAction, dismissUnmatchedEmailAction, addContactEmailAliasAction } from "@/app/(app)/email-triage/actions";
import { createEmailTemplateAction, updateEmailTemplateAction, softDeleteEmailTemplateAction, previewEmailTemplateHtmlAction, sendTestEmailTemplateAction } from "@/app/(app)/email-templates/actions";
import { createCampaignDraftAction, updateCampaignDraftAction, queueCampaignSendAction, cancelCampaignAction, softDeleteCampaignAction, previewCampaignHtmlAction } from "@/app/(app)/email-campaigns/actions";

const FOLDERS = [
  ["needs-reply", "Needs reply", Reply],
  ["clients", "Clients", Users],
  ["unmatched", "Unmatched", Inbox],
];
const inFolderOf = (folder) => (m) => (folder === "unmatched" ? m.kind === "unmatched" : m.kind === "client" && (folder === "clients" || m.needsReply));
const frame = { width: "100%", height: 460, border: "1px solid var(--t-line)", background: "#fff" };

export function Triage() {
  const { mail } = useStore();
  const [folder, setFolder] = useState(() => (mail.some(inFolderOf("needs-reply")) ? "needs-reply" : mail.some(inFolderOf("unmatched")) ? "unmatched" : "clients"));
  const [sel, setSel] = useState(null);
  const inFolder = mail.filter(inFolderOf(folder));
  const m = inFolder.find((x) => x.id === sel) || inFolder[0];

  return (
    <div className="screen">
      <PageHead title="Email triage" sub="Client mail and unmatched inbound mail · threads linked to clients">
        <button className="btn" onClick={() => go("/email-templates")}>Templates</button>
      </PageHead>
      <section className="panel triage">
        <div className="col">
          {FOLDERS.map(([id, label, Icon]) => (
            <button key={id} className="listbtn" data-active={folder === id || undefined} onClick={() => setFolder(id)}>
              <Icon size={14} /> {label}
              <span className="count">{id === "clients" ? "" : mail.filter(inFolderOf(id)).length || ""}</span>
            </button>
          ))}
        </div>
        <div className="col">
          {inFolder.length === 0 ? (
            <Empty icon={Inbox} title={folder === "unmatched" ? "Nothing to match" : "Inbox zero"} />
          ) : (
            inFolder.map((x) => (
              <button key={x.id} className="mail" data-active={m?.id === x.id || undefined} data-unread={(x.needsReply || x.kind === "unmatched") || undefined} onClick={() => setSel(x.id)}>
                <div className="mail-top"><b><Priv>{x.from}</Priv></b><span className="muted small">{x.at}</span></div>
                <div className="mail-subj">{x.subject}</div>
                <div className="mail-snip"><Priv>{x.snippet}</Priv></div>
              </button>
            ))
          )}
        </div>
        <div className="col reader-col">{m ? <Reader key={m.id} m={m} /> : <Empty title="Select a message" />}</div>
      </section>
    </div>
  );
}

function Reader({ m }) {
  const [body, setBody] = useState(m.kind === "client" ? undefined : null);
  const [matching, setMatching] = useState(false);
  useEffect(() => {
    if (m.kind !== "client") return;
    getEmailBodyAction(m.id).then((b) => setBody(b || null), () => setBody(null));
  }, [m.id, m.kind]);
  const replyHref = m.thread ? `https://mail.google.com/mail/u/0/#all/${m.thread}` : `mailto:${m.addr}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`;
  return (
    <div className="reader">
      <h2>{m.subject}</h2>
      <p className="from"><Priv>{m.from} &lt;{m.addr}&gt;</Priv> · {m.at}</p>
      <div className="row" style={{ marginBottom: 18 }}>
        {m.link ? (
          <button className="chip" onClick={() => go(`/clients/${m.link.id}`)}>
            <Link2 size={11} /> Linked to client: <b>{m.link.name}</b>
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => setMatching(!matching)}><Link2 size={12} /> Match to a contact</button>
        )}
        <span className="spacer" />
        {m.kind === "unmatched" && <button className="btn btn-sm" onClick={() => dismissUnmatchedEmailAction(m.id)}><Archive size={12} /> Dismiss</button>}
        <a className="btn btn-sm btn-primary" href={replyHref} target="_blank" rel="noreferrer"><Reply size={12} /> Reply in Gmail</a>
      </div>
      {matching && <MatchContact m={m} />}
      {body === undefined ? (
        <p className="muted">Loading…</p>
      ) : body?.html ? (
        <iframe title="Email" sandbox="" srcDoc={body.html} style={frame} />
      ) : (
        <div className="body"><Priv>{body?.text || m.snippet}</Priv></div>
      )}
      {m.kind === "unmatched" && <p className="muted small" style={{ marginTop: 10 }}>Only the snippet is kept until the email is matched to a contact.</p>}
      {m.kind === "client" && (
        <form className="row" style={{ marginTop: 16 }} action={addContactEmailAliasAction.bind(null, m.contactId)}>
          <input className="input" name="email" type="email" style={{ flex: 1 }} placeholder={`Another address for ${m.contactFirst}`} required />
          <button className="btn btn-sm">Add address</button>
        </form>
      )}
    </div>
  );
}

// Deliberately manual, never auto-matched (see emails.contactId in the schema).
function MatchContact({ m }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState(null);
  const [remember, setRemember] = useState(true);
  const [pending, start] = useTransition();
  return (
    <div className="card" style={{ background: "var(--t-panel-2)", marginBottom: 16 }}>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (term.trim()) start(async () => setResults(await searchContactsForMatchAction(term.trim()))); }}>
        <input className="input" style={{ flex: 1 }} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search contacts" autoFocus />
        <button className="btn btn-sm" disabled={pending}><Search size={12} /> Search</button>
      </form>
      {results && results.length === 0 && <p className="muted small" style={{ marginTop: 8 }}>No contacts match.</p>}
      {results?.map((c) => (
        <div key={c.id} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--t-line)" }}>
          <span style={{ flex: 1 }}>{c.firstName} {c.lastName} {c.email && <span className="muted small"><Priv>{c.email}</Priv></span>}</span>
          <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(() => matchEmailToContactAction(m.id, c.id, remember))}>Match</button>
        </div>
      ))}
      {results?.length > 0 && <Toggle label={`Remember ${m.addr} for this contact`} checked={remember} onChange={setRemember} />}
    </div>
  );
}

/* ─── Templates ────────────────────────────────────────────────────────── */
const highlight = (s) =>
  s.split(/(\{\{[a-zA-Z_.]+\}\})/g).map((part, i) =>
    part.startsWith("{{") ? <mark key={i} style={{ background: "var(--t-accent-dim)", color: "var(--t-accent)", padding: "0 2px" }}>{part}</mark> : part,
  );

/** Renders HTML through the real branded shell (the same path as sending):
 * the template shell for a template (by key), the campaign shell otherwise. */
function Preview({ html, templateKey, campaign }) {
  const [out, setOut] = useState(null);
  useEffect(() => {
    let live = true;
    (campaign ? previewCampaignHtmlAction(html) : previewEmailTemplateHtmlAction(html, templateKey)).then((h) => live && setOut(h), () => live && setOut(""));
    return () => {
      live = false;
    };
  }, [html, templateKey, campaign]);
  if (out === null) return <p className="muted">Rendering…</p>;
  return out ? <iframe title="Email preview" sandbox="" srcDoc={out} style={frame} /> : <p className="tone-bad small">Couldn&apos;t render a preview.</p>;
}

export function Templates() {
  const { templates } = useStore();
  const [sel, setSel] = useState(templates[0]?.id);
  const [edit, setEdit] = useState(null); // "new" | template
  const [view, setView] = useState("preview");
  const [test, setTest] = useState(false);
  const t = templates.find((x) => x.id === sel) || templates[0];
  return (
    <div className="screen">
      <PageHead title="Email templates" sub="Merge fields fill in from the contact and client record · rendered through the branded shell">
        <button className="btn btn-primary" onClick={() => setEdit("new")}><Plus size={14} /> New template</button>
      </PageHead>
      {templates.length === 0 ? (
        <Panel><Empty icon={Mail} title="No templates yet" /></Panel>
      ) : (
        <div className="grid g-catalog">
          <Panel title="Templates" icon={Mail} pad={false}>
            {templates.map((x) => (
              <button key={x.id} className="mail" data-active={t.id === x.id || undefined} onClick={() => setSel(x.id)}>
                <div className="mail-top"><b>{x.name}</b><Badge>{x.key}</Badge></div>
                <div className="mail-snip">Updated {fmtDate(x.updated)}</div>
              </button>
            ))}
          </Panel>
          <Panel
            title={t.name}
            icon={Mail}
            right={
              <>
                <button className="btn btn-sm" onClick={() => setEdit(t)}><Pencil size={12} /> Edit</button>
                <button className="btn btn-sm" onClick={() => setTest(true)}><Send size={12} /> Test</button>
                <button className="btn btn-sm btn-primary" onClick={() => go(`/email-campaigns?template=${t.id}`)}>Use in campaign</button>
              </>
            }
          >
            <p className="eyebrow">Subject</p>
            <p className="strong" style={{ margin: "4px 0 16px", fontSize: 15 }}>{highlight(t.subject)}</p>
            <div className="row" style={{ marginBottom: 6 }}>
              <p className="eyebrow">Body</p>
              <span className="spacer" />
              <Seg small value={view} onChange={setView} options={[["preview", "Preview"], ["html", "HTML"]]} />
            </div>
            {view === "preview" ? (
              <Preview key={t.id} html={t.body} templateKey={t.key} />
            ) : (
              <div className="desc mono" style={{ whiteSpace: "pre-wrap", marginTop: 6, padding: 16, background: "var(--t-panel-2)", border: "1px solid var(--t-line)", fontSize: 12 }}>{highlight(t.body)}</div>
            )}
            <div className="row" style={{ marginTop: 14 }}>
              <span className="spacer" />
              <button className="btn btn-sm btn-danger" onClick={() => softDeleteEmailTemplateAction(t.id)}><Trash2 size={12} /> Remove template</button>
            </div>
          </Panel>
        </div>
      )}
      {edit && <TemplateEditor t={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {test && t && <TestSend t={t} onClose={() => setTest(false)} />}
    </div>
  );
}

function TemplateEditor({ t, onClose }) {
  const [html, setHtml] = useState(t?.body ?? "");
  const [shown, setShown] = useState(null);
  const action = t ? updateEmailTemplateAction.bind(null, t.id) : createEmailTemplateAction;
  return (
    <Modal open onClose={onClose} title={t ? `Edit ${t.name}` : "New template"} wide>
      <form className="stack" style={{ gap: 10 }} action={async (fd) => { await action(fd); onClose(); }}>
        <div className="form-grid">
          {!t && <label className="field"><span>Key</span><input className="input mono" name="key" placeholder="proposal_follow_up" required /></label>}
          <label className="field"><span>Name</span><input className="input" name="name" defaultValue={t?.name} required /></label>
        </div>
        <label className="field"><span>Subject — supports {"{{variables}}"}</span><input className="input" name="subject" defaultValue={t?.subject} required /></label>
        <label className="field"><span>HTML body — supports {"{{variables}}"}</span><textarea className="textarea mono" name="htmlBody" rows={12} value={html} onChange={(e) => setHtml(e.target.value)} required style={{ fontSize: 12 }} /></label>
        <div className="row">
          <button type="button" className="btn" disabled={!html.trim()} onClick={() => setShown(html)}><Eye size={13} /> Preview</button>
          <span className="spacer" />
          <button className="btn btn-primary" type="submit">{t ? "Save" : "Create template"}</button>
        </div>
        {shown != null && <Preview key={shown} html={shown} templateKey={t?.key} />}
      </form>
    </Modal>
  );
}

function TestSend({ t, onClose }) {
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [pending, start] = useTransition();
  return (
    <Modal open onClose={onClose} title={`Send a test of ${t.name}`}>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!to.trim()) return;
          start(async () => {
            try {
              await sendTestEmailTemplateAction(t.id, to.trim());
              setResult({ ok: true, msg: `Sent to ${to.trim()}` });
            } catch (err) {
              setResult({ ok: false, msg: err?.message || "Failed to send" });
            }
          });
        }}
      >
        <input className="input" type="email" style={{ flex: 1 }} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Send test to…" autoFocus />
        <button className="btn btn-primary" disabled={pending || !to.trim()}><Send size={13} /> {pending ? "Sending…" : "Send"}</button>
      </form>
      {result && <p className={`small ${result.ok ? "tone-good" : "tone-bad"}`}>{result.msg}</p>}
    </Modal>
  );
}

/* ─── Campaigns ────────────────────────────────────────────────────────── */
const CAMPAIGN_TONE = { sent: "good", sending: "accent", scheduled: "accent", failed: "bad", cancelled: "bad" };

export function Campaigns() {
  const { campaigns, templates, startTemplate } = useStore();
  const [composing, setComposing] = useState(!!startTemplate);
  return (
    <div className="screen">
      <PageHead title="Email campaigns" sub="Sent through Gmail · opens tracked per recipient">
        <button className="btn btn-primary" onClick={() => setComposing(true)}><Plus size={14} /> New campaign</button>
      </PageHead>
      <Panel title="Campaigns" icon={Megaphone} pad={false}>
        {campaigns.length === 0 ? <Empty icon={Megaphone} title="No campaigns yet" /> : (
          <table className="table">
            <thead><tr><th>Campaign</th><th>Audience</th><th>Status</th><th>Date</th><th className="num">Recipients</th><th>Open rate</th></tr></thead>
            <tbody>
              {campaigns.map((c) => {
                const rate = c.sent ? (c.opened / c.sent) * 100 : null;
                return (
                  <tr key={c.id} data-click onClick={() => go(`/email-campaigns/${c.id}`)}>
                    <td className="strong">{c.name}</td>
                    <td>{c.audience}</td>
                    <td><Badge tone={CAMPAIGN_TONE[c.status]}>{c.status}</Badge></td>
                    <td className="nowrap">{c.sentAt ? fmtDate(c.sentAt) : "—"}</td>
                    <td className="num">{c.recipients || "—"}</td>
                    <td style={{ width: 200 }}>
                      {rate == null ? <span className="muted">—</span> : (
                        <span className="healthcell" style={{ gridTemplateColumns: "38px 1fr" }}>
                          <b className="strong">{Math.round(rate)}%</b>
                          <Meter value={rate} />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
      {composing && (
        <Composer
          title="New campaign"
          templates={templates}
          start={templates.find((t) => t.id === startTemplate)}
          action={createCampaignDraftAction}
          onClose={() => {
            setComposing(false);
            if (startTemplate) go("/email-campaigns");
          }}
        />
      )}
    </div>
  );
}

/** Draft creator/editor: optional template start, audience, optional schedule. */
function Composer({ title, templates = [], start, defaults, action, onClose }) {
  const [subject, setSubject] = useState(defaults?.subject ?? start?.subject ?? "");
  const [html, setHtml] = useState(defaults?.body ?? start?.body ?? "");
  const [prospects, setProspects] = useState(defaults?.audience === "clients_and_prospects");
  const [shown, setShown] = useState(null);
  return (
    <Modal open onClose={onClose} title={title} wide>
      <form className="stack" style={{ gap: 10 }} action={async (fd) => { await action(fd); onClose(); }}>
        {templates.length > 0 && (
          <label className="field"><span>Start from a template</span>
            <select className="select" defaultValue={start?.id ?? ""} onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) { setSubject(t.subject); setHtml(t.body); }
            }}>
              <option value="">None — write it here</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <div className="form-grid">
          <label className="field"><span>Campaign name (internal)</span><input className="input" name="name" defaultValue={defaults?.name} required /></label>
          <label className="field"><span>Send at (blank = when queued)</span><input className="input" name="scheduledFor" type="datetime-local" defaultValue={defaults?.scheduledFor?.slice(0, 16) ?? ""} /></label>
        </div>
        <label className="field"><span>Subject — supports {"{{variables}}"}</span><input className="input" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required /></label>
        <label className="field"><span>HTML body — supports {"{{variables}}"}</span><textarea className="textarea mono" name="htmlBody" rows={12} value={html} onChange={(e) => setHtml(e.target.value)} required style={{ fontSize: 12 }} /></label>
        <input type="hidden" name="audience" value={prospects ? "clients_and_prospects" : "clients"} />
        <Toggle label="Also send to open-pipeline prospects" hint="Clients are always included" checked={prospects} onChange={setProspects} />
        <div className="row">
          <button type="button" className="btn" disabled={!html.trim()} onClick={() => setShown(html)}><Eye size={13} /> Preview</button>
          <span className="spacer" />
          <button className="btn btn-primary" type="submit">Save draft</button>
        </div>
        {shown != null && <Preview key={shown} html={shown} campaign />}
      </form>
    </Modal>
  );
}

const RECIPIENT = { queued: ["Queued"], sent: ["Sent", "good"], failed: ["Failed", "bad"], skipped_no_email: ["No email", "warn"] };

export function CampaignDetail() {
  const { campaign: c, recipients } = useStore();
  const [editing, setEditing] = useState(false);
  const count = (s) => recipients.filter((r) => r.status === s).length;
  const sent = count("sent");
  const opened = recipients.filter((r) => r.opened).length;
  return (
    <div className="screen">
      <button className="eyebrow row" style={{ gap: 6 }} onClick={() => go("/email-campaigns")}>
        <ArrowLeft size={12} /> All campaigns
      </button>
      <PageHead title={c.name} sub={c.subject}>
        <Badge tone={CAMPAIGN_TONE[c.status]}>{c.status}</Badge>
        {c.status === "draft" && <button className="btn" onClick={() => setEditing(true)}><Pencil size={13} /> Edit draft</button>}
        {(c.status === "draft" || c.status === "scheduled") && <button className="btn btn-danger" onClick={() => cancelCampaignAction(c.id)}>Cancel</button>}
        {c.status === "draft" && <button className="btn btn-danger" onClick={async () => { await softDeleteCampaignAction(c.id); go("/email-campaigns"); }}><Trash2 size={13} /> Delete draft</button>}
        {c.status === "draft" && <button className="btn btn-primary" onClick={() => queueCampaignSendAction(c.id)}><Send size={13} /> {c.scheduledFor ? "Schedule send" : "Send now"}</button>}
      </PageHead>
      <div className="grid g-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <Stat label="Queued" value={count("queued")} priv={false} />
        <Stat label="Sent" value={sent} tone="good" priv={false} />
        <Stat label="Failed" value={count("failed")} tone={count("failed") ? "bad" : undefined} priv={false} />
        <Stat label="No email" value={count("skipped_no_email")} priv={false} />
        <Stat label="Opened" value={sent ? `${opened} · ${Math.round((opened / sent) * 100)}%` : opened} sub="A floor — many mail clients block the tracking image" priv={false} />
      </div>
      <Panel title="Recipients" icon={Users} right={recipients.length} pad={false}>
        {recipients.length === 0 ? <Empty title="Not queued yet" /> : (
          <table className="table">
            <thead><tr><th>Contact</th><th>Status</th><th>Opened</th><th>Error</th></tr></thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id}>
                  <td className="strong">{r.name}</td>
                  <td><Badge tone={RECIPIENT[r.status]?.[1]}>{RECIPIENT[r.status]?.[0] ?? r.status}</Badge></td>
                  <td className="nowrap">{r.opened ? fmtDate(r.opened) : <span className="muted">—</span>}</td>
                  <td className="small tone-bad">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {editing && <Composer title="Edit draft" defaults={c} action={updateCampaignDraftAction.bind(null, c.id)} onClose={() => setEditing(false)} />}
    </div>
  );
}
