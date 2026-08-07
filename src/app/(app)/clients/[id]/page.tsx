import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/dal/clients";
import { PORTAL_FEATURE_KEYS } from "@/lib/dal/clients";
import { paymentStatus } from "@/lib/paymentStatus";
import { listActiveDiscounts } from "@/lib/dal/referrals";
import { getLatestHealthScore } from "@/lib/dal/health";
import { listIdeationItems } from "@/lib/dal/ideation";
import { listRoadmapItems } from "@/lib/dal/roadmap";
import { listMeetingSummaries } from "@/lib/dal/meetingSummaries";
import { listToolStackItems } from "@/lib/dal/toolStack";
import {
  createReferralAction,
  inviteClientAction,
  uploadDocumentAction,
  updateClientEmbedsAction,
  updatePortalWelcomeAction,
  uploadClientLogoAction,
  createIdeationItemAction,
  deleteIdeationItemAction,
  createRoadmapItemAction,
  deleteRoadmapItemAction,
  createMeetingSummaryAction,
  deleteMeetingSummaryAction,
  createToolStackItemAction,
  deleteToolStackItemAction,
  deleteClientAction,
} from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import FeatureToggle from "./FeatureToggle";
import ReferralStatusSelect from "./ReferralStatusSelect";
import CredentialsList from "../../vault/CredentialsList";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inviteError?: string; invited?: string }>;
}) {
  const { id } = await params;
  const { inviteError, invited } = await searchParams;
  const data = await getClient(id);
  if (!data) notFound();
  const { client, referrals, features, portalUsers, documents } = data;
  const status = paymentStatus(client.nextPaymentDate);

  const [activeDiscounts, ideas, roadmap, meetings, tools, health] = await Promise.all([
    listActiveDiscounts(client.id),
    listIdeationItems(client.id),
    listRoadmapItems(client.id),
    listMeetingSummaries(client.id),
    listToolStackItems(client.id),
    getLatestHealthScore(client.id),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Client</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{client.name}</h1>
        <div style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}>
          {status && <span className="gh-badge" data-status={status.tone}>{status.label}</span>}
          {health && (
            <span
              className="gh-badge"
              data-status={Number(health.score) >= 70 ? "success" : Number(health.score) >= 40 ? "warning" : "danger"}
              title={`Payment ${health.paymentComponent} · Tasks ${health.taskComponent} · Activity ${health.activityComponent} · Deal momentum ${health.dealMomentumComponent}`}
            >
              Health: {Math.round(Number(health.score))} ({health.trend})
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-3)" }}>
          <Link href={`/clients/${client.id}/portal-preview`} className="gh-btn-secondary">
            View client portal
          </Link>
          <form action={deleteClientAction.bind(null, client.id)}>
            <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>
              Remove client
            </SubmitButton>
          </form>
        </div>
      </div>

      <section className="gh-card">
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>Portal features</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          {PORTAL_FEATURE_KEYS.map((key) => {
            const row = features.find((f) => f.featureKey === key);
            return (
              <FeatureToggle
                key={key}
                clientId={client.id}
                featureKey={key}
                enabled={row?.enabled ?? false}
              />
            );
          })}
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Portal access</p>
        {portalUsers.map((u) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span>{u.email}</span>
            <span style={{ color: "var(--gh-text-muted)" }}>{u.googleUid ? "Active" : "Invited — awaiting first sign-in"}</span>
          </div>
        ))}
        {portalUsers.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>No portal login invited yet.</p>
        )}
        {invited && <p style={{ color: "var(--gh-success)", fontSize: "var(--gh-text-sm)" }}>Invite sent.</p>}
        {inviteError && (
          <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>Couldn&apos;t invite: {inviteError}</p>
        )}
        <form action={inviteClientAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <input className="gh-input" name="email" type="email" placeholder="Client email" required />
          <input className="gh-input" name="displayName" placeholder="Display name (optional)" />
          <SubmitButton>Invite to portal</SubmitButton>
        </form>
      </section>

      <CredentialsList clientId={client.id} />

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Documents</p>
        {documents.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span>{d.docType}</span>
            {d.externalUrl ? (
              <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer">Open link ↗</a>
            ) : (
              <a href={`/api/documents/${d.id}/download`}>Download</a>
            )}
          </div>
        ))}
        {documents.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No documents yet.</p>}
        <form
          action={uploadDocumentAction.bind(null, client.id)}
          encType="multipart/form-data"
          style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
        >
          <input type="hidden" name="companyId" value={client.companyId ?? ""} />
          <select className="gh-input" name="docType" defaultValue="other">
            <option value="proposal">Proposal</option>
            <option value="contract">Contract</option>
            <option value="deck">Deck</option>
            <option value="other">Other</option>
          </select>
          <input className="gh-input" name="file" type="file" />
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", textAlign: "center" }}>— or —</p>
          <input className="gh-input" name="externalUrl" type="url" placeholder="Link a Drive/hosted PDF URL instead" />
          <SubmitButton>Add document</SubmitButton>
        </form>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Referrals</p>
        {referrals.map((r) => (
          <div key={r.id} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Log referral</summary>
          <form action={createReferralAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="referredName" placeholder="Who they referred" required />
            <textarea className="gh-input" name="notes" placeholder="Notes" rows={2} />
            <SubmitButton>Log referral</SubmitButton>
          </form>
        </details>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Drive &amp; Reporting embeds</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Drive and Looker Studio stay the systems of record — these are just the URLs the portal embeds,
          not files GrayPortal stores itself.
        </p>
        <form action={updateClientEmbedsAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <input className="gh-input" name="driveFolderUrl" defaultValue={client.driveFolderUrl ?? ""} placeholder="Drive folder embed URL" />
          <input className="gh-input" name="lookerStudioUrl" defaultValue={client.lookerStudioUrl ?? ""} placeholder="Looker Studio embed URL" />
          <SubmitButton style={{ alignSelf: "flex-start" }}>Save</SubmitButton>
        </form>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Portal appearance</p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-4)" }}>
          {client.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external signed Storage URL, not a local asset
            <img src={client.logoUrl} alt={`${client.name} logo`} style={{ width: 48, height: 48, objectFit: "contain" }} />
          )}
          <form action={uploadClientLogoAction.bind(null, client.id)} encType="multipart/form-data" style={{ display: "flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
            <input className="gh-input" name="logo" type="file" accept="image/*" required />
            <SubmitButton className="gh-btn-secondary">Upload logo</SubmitButton>
          </form>
        </div>
        <form action={updatePortalWelcomeAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <textarea
            className="gh-input"
            name="portalWelcomeMessage"
            defaultValue={client.portalWelcomeMessage ?? ""}
            placeholder="Welcome message shown at the top of this client's portal home page (optional)"
            rows={3}
          />
          <SubmitButton style={{ alignSelf: "flex-start" }}>Save</SubmitButton>
        </form>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Ideation</p>
        {ideas.map((it) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{it.title} <span className="gh-badge">{it.status}</span></span>
            <form action={deleteIdeationItemAction.bind(null, it.id, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
            </form>
          </div>
        ))}
        {ideas.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No ideas logged yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add idea</summary>
          <form action={createIdeationItemAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="title" placeholder="Idea title" required />
            <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
            <SubmitButton>Add idea</SubmitButton>
          </form>
        </details>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Roadmap</p>
        {roadmap.map((it) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{it.title} <span className="gh-badge">{it.status}</span> {it.targetDate && <span style={{ color: "var(--gh-text-muted)" }}>({it.targetDate})</span>}</span>
            <form action={deleteRoadmapItemAction.bind(null, it.id, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
            </form>
          </div>
        ))}
        {roadmap.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No roadmap items yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add roadmap item</summary>
          <form action={createRoadmapItemAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="title" placeholder="Title" required />
            <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
            <input className="gh-input" name="targetDate" type="date" />
            <SubmitButton>Add item</SubmitButton>
          </form>
        </details>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Meeting Summaries</p>
        {meetings.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", fontSize: "var(--gh-text-sm)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{m.title} — {new Date(m.occurredAt).toLocaleDateString("en-NZ")}</span>
              <form action={deleteMeetingSummaryAction.bind(null, m.id, client.id)}>
                <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
              </form>
            </div>
            <p style={{ color: "var(--gh-text-muted)" }}>{m.summary}</p>
          </div>
        ))}
        {meetings.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No meeting summaries yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Log meeting summary</summary>
          <form action={createMeetingSummaryAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="title" placeholder="Meeting title" required />
            <textarea className="gh-input" name="summary" placeholder="Summary" rows={3} required />
            <SubmitButton>Log summary</SubmitButton>
          </form>
        </details>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Tool Stack</p>
        {tools.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{t.toolName} {t.category && <span style={{ color: "var(--gh-text-muted)" }}>({t.category})</span>} <span className="gh-badge">{t.status}</span></span>
            <form action={deleteToolStackItemAction.bind(null, t.id, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
            </form>
          </div>
        ))}
        {tools.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No tools logged yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add tool</summary>
          <form action={createToolStackItemAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="toolName" placeholder="Tool name" required />
            <input className="gh-input" name="category" placeholder="Category (optional)" />
            <select className="gh-input" name="status" defaultValue="current">
              <option value="current">Current</option>
              <option value="planned">Planned</option>
            </select>
            <SubmitButton>Add tool</SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}
