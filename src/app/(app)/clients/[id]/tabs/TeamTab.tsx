import Link from "next/link";
import SubmitButton from "@/components/ui/SubmitButton";
import EmailsModal from "../EmailsModal";
import {
  addClientTeamMemberAction,
  deleteClientTeamMemberAction,
  createMeetingSummaryAction,
  deleteMeetingSummaryAction,
  addClientHealthChannelAction,
  deleteClientHealthChannelAction,
  addClientMetricsSnapshotAction,
  deleteClientMetricsSnapshotAction,
  addClientContactEmailAliasAction,
  addClientActivityFeedEntryAction,
  deleteClientActivityFeedEntryAction,
} from "../../actions";
import type {
  ClientRecord,
  TeamMember,
  MeetingSummary,
  HealthChannel,
  MetricsSnapshot,
  EmailRow,
  ActivityFeedEntry,
  CompanyDetailData,
} from "./types";

export default function TeamTab({
  client,
  teamMembers,
  meetings,
  healthChannels,
  metricsSnapshots,
  recentEmails,
  companyData,
  activityFeed,
}: {
  client: ClientRecord;
  teamMembers: TeamMember[];
  meetings: MeetingSummary[];
  healthChannels: HealthChannel[];
  metricsSnapshots: MetricsSnapshot[];
  recentEmails: EmailRow[];
  companyData: CompanyDetailData | null;
  activityFeed: ActivityFeedEntry[];
}) {
  return (
    <div className="gh-tab-grid">
      <div className="gh-tab-grid-col">
      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Account team</p>
        {teamMembers.map((m) => (
          <div key={m.id} className="gh-item-row">
            <span>{m.name} {m.role && <span style={{ color: "var(--gh-text-muted)" }}>({m.role})</span>}</span>
            <form action={deleteClientTeamMemberAction.bind(null, m.id, client.id)}>
              <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {teamMembers.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No team members added yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Add team member</summary>
            <form action={addClientTeamMemberAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="name" placeholder="Name" required />
              <input className="gh-input" name="role" placeholder="Role (optional)" />
              <input className="gh-input" name="contactEmail" type="email" placeholder="Contact email (optional)" />
              <SubmitButton>Add member</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Meeting Summaries</p>
        {meetings.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-sm)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{m.title} — {new Date(m.occurredAt).toLocaleDateString("en-NZ")}</span>
              <form action={deleteMeetingSummaryAction.bind(null, m.id, client.id)}>
                <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
              </form>
            </div>
            <p style={{ color: "var(--gh-text-muted)" }}>{m.summary}</p>
          </div>
        ))}
        {meetings.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No meeting summaries yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Log meeting summary</summary>
            <form action={createMeetingSummaryAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="title" placeholder="Meeting title" required />
              <textarea className="gh-input" name="summary" placeholder="Summary" rows={3} required />
              <SubmitButton>Log summary</SubmitButton>
            </form>
          </details>
        </div>
      </section>
      </div>

      <div className="gh-tab-grid-col">
      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Campaign health</p>
        {healthChannels.map((c) => (
          <div key={c.id} className="gh-item-row">
            <span>{c.channelName} <span className="gh-badge" data-status={c.status === "ok" ? "success" : c.status === "warn" ? "warning" : undefined}>{c.statusLabel}</span></span>
            <form action={deleteClientHealthChannelAction.bind(null, c.id, client.id)}>
              <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {healthChannels.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No channels logged yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Add channel</summary>
            <form action={addClientHealthChannelAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="channelName" placeholder="Channel (e.g. Meta Ads)" required />
              <select className="gh-input" name="status" defaultValue="ok">
                <option value="ok">OK</option>
                <option value="warn">Warning</option>
                <option value="off">Off</option>
              </select>
              <input className="gh-input" name="statusLabel" placeholder="Status label (e.g. Active, Paused, Live)" required />
              <SubmitButton>Add channel</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Performance snapshots</p>
        {metricsSnapshots.map((m) => (
          <div key={m.id} className="gh-item-row">
            <span>
              {m.periodLabel} — Ad spend ${m.adSpend ?? "—"} · Leads {m.leadsGenerated ?? "—"} · ROAS {m.roas ?? "—"}×
            </span>
            <form action={deleteClientMetricsSnapshotAction.bind(null, m.id, client.id)}>
              <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {metricsSnapshots.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No snapshots logged yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Add snapshot</summary>
            <form action={addClientMetricsSnapshotAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="periodLabel" placeholder="Period (e.g. Aug 2026)" required />
              <input className="gh-input" name="adSpend" placeholder="Ad spend" />
              <input className="gh-input" name="leadsGenerated" placeholder="Leads generated" type="number" />
              <input className="gh-input" name="roas" placeholder="ROAS (e.g. 6.4)" />
              <SubmitButton>Add snapshot</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="gh-eyebrow">Emails</p>
          <div style={{ display: "flex", gap: "var(--gh-space-3)", alignItems: "center" }}>
            <EmailsModal clientId={client.id} />
            <Link href="/email-triage/clients" style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              View all in Email Triage →
            </Link>
          </div>
        </div>
        {recentEmails.map((e) => (
          <div key={e.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-sm)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{e.subject || "(no subject)"} <span className="gh-badge">{e.direction}</span></span>
              <span style={{ color: "var(--gh-text-muted)" }}>{new Date(e.sentAt).toLocaleDateString("en-NZ")}</span>
            </div>
            <p style={{ color: "var(--gh-text-muted)" }}>{e.contactFirstName} {e.contactLastName} — {e.snippet}</p>
          </div>
        ))}
        {recentEmails.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No matched email yet.</p>}

        {companyData && companyData.contacts.length > 0 && (
          <details>
            <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              + Teach a contact another email address
            </summary>
            <form
              action={addClientContactEmailAliasAction.bind(null, client.id)}
              style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)", flexWrap: "wrap" }}
            >
              <select className="gh-input" name="contactId" required defaultValue="" style={{ flex: "1 1 200px" }}>
                <option value="" disabled>Which contact…</option>
                {companyData.contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
              <input className="gh-input" name="email" type="email" placeholder="another.address@example.com" required style={{ flex: "1 1 220px" }} />
              <SubmitButton className="gh-btn-secondary" pendingLabel="Adding…">Add</SubmitButton>
            </form>
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
              Mail from this address will now match this contact automatically, even though it&apos;s not their primary email on file.
            </p>
          </details>
        )}
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Activity feed</p>
        {activityFeed.map((a) => (
          <div key={a.id} className="gh-item-row">
            <span>{a.body} <span style={{ color: "var(--gh-text-muted)" }}>— {new Date(a.occurredAt).toLocaleDateString("en-NZ")}</span></span>
            <form action={deleteClientActivityFeedEntryAction.bind(null, a.id, client.id)}>
              <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {activityFeed.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No activity logged yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Log activity</summary>
            <form action={addClientActivityFeedEntryAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="body" placeholder="What happened" required />
              <SubmitButton>Log activity</SubmitButton>
            </form>
          </details>
        </div>
      </section>
      </div>
    </div>
  );
}
