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
import { listClientServices, getActiveMonthlyTotal } from "@/lib/dal/clientServices";
import { listServiceItems } from "@/lib/dal/pricing";
import { listClientMetricsSnapshots } from "@/lib/dal/clientMetrics";
import { listClientTeamMembers } from "@/lib/dal/clientTeam";
import { listClientHealthChannels } from "@/lib/dal/clientHealthChannels";
import { listClientActivityFeed } from "@/lib/dal/clientActivityFeed";
import { listEmailsForClient } from "@/lib/dal/emails";
import { getCompany } from "@/lib/dal/companies";
import { getDefaultOnboardingInviteEmail } from "@/lib/dal/onboardingInvites";
import { ONBOARDING_DOCUMENT_NAMES } from "@/config/onboarding";
import { listPendingAccessRequests } from "@/lib/dal/portalAccessRequests";
import { listGrayscaleRequests } from "@/lib/dal/grayscaleRequests";
import { daysUntil } from "@/lib/date";
import {
  createReferralAction,
  inviteClientAction,
  sendOnboardingInviteAction,
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
  addClientServiceAction,
  removeClientServiceAction,
  addClientMetricsSnapshotAction,
  deleteClientMetricsSnapshotAction,
  addClientTeamMemberAction,
  deleteClientTeamMemberAction,
  addClientHealthChannelAction,
  deleteClientHealthChannelAction,
  addClientActivityFeedEntryAction,
  deleteClientActivityFeedEntryAction,
  addClientContactEmailAliasAction,
  addClientDealAction,
  updateClientServicePriceAction,
  updateClientDiscountAction,
  renameDocumentAction,
  deleteDocumentAction,
  approvePortalAccessRequestAction,
  denyPortalAccessRequestAction,
  updateCompanyDetailsAction,
  markGrayscaleRequestContactedAction,
} from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import FeatureToggle from "./FeatureToggle";
import ReferralStatusSelect from "./ReferralStatusSelect";
import TasklistLink from "./TasklistLink";
import HideFromTaskViewToggle from "./HideFromTaskViewToggle";
import CredentialsList from "../../vault/CredentialsList";
import SendInviteGate from "./SendInviteGate";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    inviteError?: string;
    invited?: string;
    onboardingInviteSent?: string;
    onboardingInviteError?: string;
    accessRequestApproved?: string;
    accessRequestDenied?: string;
    accessRequestError?: string;
  }>;
}) {
  const { id } = await params;
  const {
    inviteError,
    invited,
    onboardingInviteSent,
    onboardingInviteError,
    accessRequestApproved,
    accessRequestDenied,
    accessRequestError,
  } = await searchParams;
  const data = await getClient(id);
  if (!data) notFound();
  const { client, referrals, features, portalUsers, documents, onboardingInvites } = data;
  const status = paymentStatus(client.nextPaymentDate);
  const defaultInviteEmail = await getDefaultOnboardingInviteEmail(client.name);

  // Same fixed four-name registry as the "Onboarding documents" checklist
  // below — a portal-setup invite can't send until every one of these is
  // attached (sendOnboardingInvite enforces this too; this is just what lets
  // the UI block before the round trip). documents here already excludes
  // soft-deleted rows (getClient's own query), so no extra filter needed.
  const attachedOnboardingDocNames = new Set(documents.map((d) => d.title));
  const missingOnboardingDocumentNames = ONBOARDING_DOCUMENT_NAMES.filter(
    (name) => !attachedOnboardingDocNames.has(name)
  );

  const [
    activeDiscounts,
    ideas,
    roadmap,
    meetings,
    tools,
    health,
    clientServices,
    serviceCatalogue,
    activeMonthlyTotal,
    metricsSnapshots,
    teamMembers,
    healthChannels,
    activityFeed,
    recentEmails,
    companyData,
    pendingAccessRequests,
    grayscaleRequests,
  ] = await Promise.all([
    listActiveDiscounts(client.id),
    listIdeationItems(client.id),
    listRoadmapItems(client.id),
    listMeetingSummaries(client.id),
    listToolStackItems(client.id),
    getLatestHealthScore(client.id),
    listClientServices(client.id),
    listServiceItems(),
    getActiveMonthlyTotal(client.id),
    listClientMetricsSnapshots(client.id),
    listClientTeamMembers(client.id),
    listClientHealthChannels(client.id),
    listClientActivityFeed(client.id),
    listEmailsForClient(client.id),
    client.companyId ? getCompany(client.companyId) : Promise.resolve(null),
    listPendingAccessRequests(client.id),
    listGrayscaleRequests(client.id),
  ]);

  const overallDiscountPercent = Number(client.overallDiscountPercent ?? 0);
  const finalMonthlyTotal = activeMonthlyTotal * (1 - overallDiscountPercent / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Client</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{client.name}</h1>
        <div style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)", alignItems: "center" }}>
          {status && <span className="gh-badge" data-status={status.tone}>{status.label}</span>}
          {finalMonthlyTotal > 0 && (
            <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              Est. monthly: ${finalMonthlyTotal.toLocaleString("en-NZ")}
            </span>
          )}
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

      {companyData && (
        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Company details</p>
          {/* onboardClient() only sets the business name; the six fields below are normally filled in by
              the client themselves on the onboarding wizard's "Confirm your details" step (§4.3 step 2),
              but editable here too so an admin can correct or fill them in directly. */}
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
            Normally filled in by the client during onboarding — editable here if it needs correcting.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span style={{ color: "var(--gh-text-muted)" }}>Business name</span>
            <span>{companyData.company.name}</span>
          </div>
          <form
            action={updateCompanyDetailsAction.bind(null, companyData.company.id, client.id)}
            style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Main email</span>
              <input className="gh-input" name="mainEmail" type="email" defaultValue={companyData.company.mainEmail ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Phone</span>
              <input className="gh-input" name="phone" defaultValue={companyData.company.phone ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Position</span>
              <input className="gh-input" name="mainContactPosition" defaultValue={companyData.company.mainContactPosition ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Address</span>
              <input className="gh-input" name="address" defaultValue={companyData.company.address ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Postal address</span>
              <input className="gh-input" name="postalAddress" defaultValue={companyData.company.postalAddress ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Referred by</span>
              <input className="gh-input" name="referredBy" defaultValue={companyData.company.referredBy ?? ""} />
            </label>
            <SubmitButton style={{ alignSelf: "flex-start" }}>Save company details</SubmitButton>
          </form>
        </section>
      )}

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Google Tasks list</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Route this client&apos;s synced tasks into their own Google Tasks list instead of the shared
          default list.
        </p>
        <TasklistLink clientId={client.id} currentTasklistId={client.googleTaskListId} />
        <HideFromTaskViewToggle clientId={client.id} hidden={client.hiddenFromTaskView} />
      </section>

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="gh-eyebrow">Portal access</p>
          <Link href={`/onboarding-preview/${client.id}`} target="_blank" style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-accent)" }}>
            Preview onboarding wizard ↗
          </Link>
        </div>
        {pendingAccessRequests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", textTransform: "uppercase", letterSpacing: "var(--gh-tracking-wide)" }}>
              Pending access requests
            </p>
            {pendingAccessRequests.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
                <span>
                  {r.email}
                  {r.displayName && <span style={{ color: "var(--gh-text-muted)" }}> ({r.displayName})</span>}
                </span>
                <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
                  <form action={approvePortalAccessRequestAction.bind(null, client.id, r.id)}>
                    <SubmitButton className="gh-btn-primary">Approve</SubmitButton>
                  </form>
                  <form action={denyPortalAccessRequestAction.bind(null, client.id, r.id)}>
                    <SubmitButton className="gh-btn-secondary">Deny</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        {accessRequestApproved && <p style={{ color: "var(--gh-success)", fontSize: "var(--gh-text-sm)" }}>Access approved.</p>}
        {accessRequestDenied && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Request denied.</p>}
        {accessRequestError && (
          <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>Couldn&apos;t approve: {accessRequestError}</p>
        )}
        {portalUsers.map((u) => {
          const invite = onboardingInvites.find((i) => i.email === u.email);
          const daysLeft = invite ? daysUntil(invite.expiresAt) : null;
          const defaults = defaultInviteEmail;
          return (
            <div key={u.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
                <span>{u.email}</span>
                <span style={{ color: "var(--gh-text-muted)" }}>{u.googleUid ? "Active" : "Invited — awaiting first sign-in"}</span>
              </div>
              {!u.googleUid && (
                <SendInviteGate missingDocumentNames={missingOnboardingDocumentNames}>
                  <details>
                    <summary style={{ fontSize: "var(--gh-text-sm)", cursor: "pointer", color: "var(--gh-accent)" }}>
                      {invite ? `Resend portal-setup invite (link expires in ${daysLeft}d)` : "Send portal-setup invite"}
                    </summary>
                    <form
                      action={sendOnboardingInviteAction.bind(null, client.id)}
                      style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
                    >
                      <input type="hidden" name="email" value={u.email} />
                      <input className="gh-input" name="subject" defaultValue={defaults.subject} required />
                      <textarea className="gh-input" name="body" defaultValue={defaults.body} rows={4} required />
                      <SubmitButton>{invite ? "Resend invite (invalidates the previous link)" : "Send invite"}</SubmitButton>
                    </form>
                  </details>
                </SendInviteGate>
              )}
            </div>
          );
        })}
        {portalUsers.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>No portal login invited yet.</p>
        )}
        {invited && <p style={{ color: "var(--gh-success)", fontSize: "var(--gh-text-sm)" }}>Invite sent.</p>}
        {inviteError && (
          <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>Couldn&apos;t invite: {inviteError}</p>
        )}
        {onboardingInviteSent && (
          <p style={{ color: "var(--gh-success)", fontSize: "var(--gh-text-sm)" }}>Portal-setup invite sent.</p>
        )}
        {onboardingInviteError && (
          <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>
            Couldn&apos;t send invite: {onboardingInviteError}
          </p>
        )}
        <form action={inviteClientAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <input className="gh-input" name="email" type="email" placeholder="Client email" required />
          <input className="gh-input" name="displayName" placeholder="Display name (optional)" />
          <SubmitButton>Invite to portal</SubmitButton>
        </form>
      </section>

      {grayscaleRequests.length > 0 && (
        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">GrayScale requests</p>
          {grayscaleRequests.map((r) => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "var(--gh-text-sm)" }}>
                <span>{r.products.join(", ")}</span>
                <span className="gh-badge" data-status={r.status === "new" ? "warning" : "success"}>
                  {r.status}
                </span>
              </div>
              {r.note && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>{r.note}</p>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
                  {new Date(r.createdAt).toLocaleDateString("en-NZ")}
                </span>
                {r.status === "new" && (
                  <form action={markGrayscaleRequestContactedAction.bind(null, client.id, r.id)}>
                    <SubmitButton className="gh-btn-secondary">Mark contacted</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      <CredentialsList clientId={client.id} />

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Onboarding documents</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          The four documents every client sees in the onboarding wizard and their portal&apos;s own Documents
          section. Attach each with a file or a link — same mechanism as any other document below, just tracked
          against these fixed names.
        </p>
        {ONBOARDING_DOCUMENT_NAMES.map((name) => {
          const existing = documents.find((d) => d.title === name);
          return (
            <div
              key={name}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}
            >
              <span>{name}</span>
              {existing ? (
                <span style={{ color: "var(--gh-success)" }}>✓ Attached</span>
              ) : (
                <details>
                  <summary style={{ cursor: "pointer", color: "var(--gh-accent)" }}>Attach</summary>
                  <form
                    action={uploadDocumentAction.bind(null, client.id)}
                    encType="multipart/form-data"
                    style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)", textAlign: "left" }}
                  >
                    <input type="hidden" name="companyId" value={client.companyId ?? ""} />
                    <input type="hidden" name="title" value={name} />
                    <input type="hidden" name="docType" value="other" />
                    <input className="gh-input" name="file" type="file" />
                    <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", textAlign: "center" }}>— or —</p>
                    <input className="gh-input" name="externalUrl" type="url" placeholder="Link a Drive/hosted PDF URL instead" />
                    <SubmitButton>Attach {name}</SubmitButton>
                  </form>
                </details>
              )}
            </div>
          );
        })}
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Documents</p>
        {documents.map((d) => (
          <div key={d.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
              <span>{d.title ?? d.docType}</span>
              <span style={{ display: "flex", gap: "var(--gh-space-3)", alignItems: "center" }}>
                {d.externalUrl ? (
                  <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer">Open link ↗</a>
                ) : (
                  <a href={`/api/documents/${d.id}/download`}>Download</a>
                )}
                <form action={deleteDocumentAction.bind(null, d.id, client.id)}>
                  <SubmitButton
                    className="gh-btn-secondary"
                    style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-micro)", padding: "var(--gh-space-1) var(--gh-space-2)" }}
                  >
                    Remove
                  </SubmitButton>
                </form>
              </span>
            </div>
            <details>
              <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Rename</summary>
              <form
                action={renameDocumentAction.bind(null, d.id, client.id)}
                style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
              >
                <input className="gh-input" name="title" defaultValue={d.title ?? ""} required style={{ flex: 1 }} />
                <SubmitButton style={{ fontSize: "var(--gh-text-micro)" }}>Save</SubmitButton>
              </form>
            </details>
          </div>
        ))}
        {documents.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No documents yet.</p>}
        <form
          action={uploadDocumentAction.bind(null, client.id)}
          encType="multipart/form-data"
          style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
        >
          <input type="hidden" name="companyId" value={client.companyId ?? ""} />
          <input className="gh-input" name="title" placeholder="Document name" required />
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

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="gh-eyebrow">Services</p>
          <div style={{ textAlign: "right", fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
            <div>Subtotal: ${activeMonthlyTotal.toLocaleString("en-NZ")}</div>
            {overallDiscountPercent > 0 && (
              <div>
                {overallDiscountPercent}% off → <strong style={{ color: "var(--gh-text-primary)" }}>${finalMonthlyTotal.toLocaleString("en-NZ")}</strong>/mo
              </div>
            )}
            {overallDiscountPercent === 0 && (
              <div><strong style={{ color: "var(--gh-text-primary)" }}>${finalMonthlyTotal.toLocaleString("en-NZ")}</strong>/mo</div>
            )}
          </div>
        </div>

        <details>
          <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
            Overall discount ({overallDiscountPercent}%)
          </summary>
          <form
            action={updateClientDiscountAction.bind(null, client.id)}
            style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
          >
            <input
              className="gh-input"
              name="overallDiscountPercent"
              placeholder="Overall discount %"
              defaultValue={client.overallDiscountPercent ?? ""}
              style={{ maxWidth: 200 }}
            />
            <SubmitButton className="gh-btn-secondary" pendingLabel="Saving…">Save</SubmitButton>
          </form>
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
            Applied on top of the subtotal below — e.g. a $2,400 package at 33% off nets $1,608/mo. Leave blank for no discount.
          </p>
        </details>

        {clientServices.map((s) => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", paddingBottom: "var(--gh-space-2)", borderBottom: "1px solid var(--gh-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
              <span>
                {s.deliverable}{" "}
                <span className="gh-badge">{s.status}</span>{" "}
                <span style={{ color: "var(--gh-text-muted)" }}>
                  ${s.customMonthlyPrice ?? s.currentMonthlyPrice ?? s.customSetupPrice ?? s.currentSetupPrice ?? "—"}
                  {s.customMonthlyPrice != null && s.currentMonthlyPrice != null && s.customMonthlyPrice !== s.currentMonthlyPrice && (
                    <> (catalogue: ${s.currentMonthlyPrice})</>
                  )}
                  {s.discountPercent != null && Number(s.discountPercent) > 0 && <> — {s.discountPercent}% off this item</>}
                </span>
              </span>
              <form action={removeClientServiceAction.bind(null, s.id, client.id)}>
                <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
              </form>
            </div>
            <details>
              <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                Override rate / discount
              </summary>
              <form
                action={updateClientServicePriceAction.bind(null, s.id, client.id)}
                style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)", flexWrap: "wrap" }}
              >
                <input
                  className="gh-input"
                  name="customMonthlyPrice"
                  placeholder="Custom monthly price"
                  defaultValue={s.customMonthlyPrice ?? ""}
                  style={{ maxWidth: 200 }}
                />
                <input
                  className="gh-input"
                  name="customSetupPrice"
                  placeholder="Custom setup price"
                  defaultValue={s.customSetupPrice ?? ""}
                  style={{ maxWidth: 200 }}
                />
                <input
                  className="gh-input"
                  name="discountPercent"
                  placeholder="This item's discount %"
                  defaultValue={s.discountPercent ?? ""}
                  style={{ maxWidth: 200 }}
                />
                <SubmitButton className="gh-btn-secondary" pendingLabel="Saving…">Save</SubmitButton>
              </form>
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
                Leave price blank to revert to the catalogue price (${s.currentMonthlyPrice ?? s.currentSetupPrice ?? "—"}). Leave discount blank for none.
              </p>
            </details>
          </div>
        ))}
        {clientServices.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No services attached yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add service</summary>
          <form action={addClientServiceAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <select className="gh-input" name="serviceItemId" required defaultValue="">
              <option value="" disabled>Select a catalogue item…</option>
              {serviceCatalogue.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.moduleCode} — {item.deliverable}
                </option>
              ))}
            </select>
            <input className="gh-input" name="customMonthlyPrice" placeholder="Custom monthly price (optional)" />
            <input className="gh-input" name="customSetupPrice" placeholder="Custom setup price (optional)" />
            <input className="gh-input" name="discountPercent" placeholder="Discount % on this item (optional)" />
            <input className="gh-input" name="startedOn" type="date" />
            <SubmitButton>Add service</SubmitButton>
          </form>
        </details>
      </section>

      {client.companyId && (
        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">New deal</p>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
            For upselling an existing client — creates a real pipeline deal against this client&apos;s company, same as Pipeline or the company page.
          </p>
          <form
            action={addClientDealAction.bind(null, client.id, client.companyId)}
            style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
          >
            {companyData && companyData.contacts.length > 0 && (
              <select className="gh-input" name="primaryContactId" defaultValue="">
                <option value="">Primary contact (optional)…</option>
                {companyData.contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            )}
            <input className="gh-input" name="nextAction" placeholder="Next action (required)" required />
            <input className="gh-input" name="nextActionDate" type="date" required />
            <input className="gh-input" name="valueNzd" placeholder="Value (NZD)" />
            <input className="gh-input" name="packageTier" placeholder="Package tier" />
            <input className="gh-input" name="source" placeholder="Source" defaultValue="Upsell" />
            <SubmitButton pendingLabel="Creating…">Create deal</SubmitButton>
          </form>
        </section>
      )}

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

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Performance snapshots</p>
        {metricsSnapshots.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>
              {m.periodLabel} — Ad spend ${m.adSpend ?? "—"} · Leads {m.leadsGenerated ?? "—"} · ROAS {m.roas ?? "—"}×
            </span>
            <form action={deleteClientMetricsSnapshotAction.bind(null, m.id, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
            </form>
          </div>
        ))}
        {metricsSnapshots.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No snapshots logged yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add snapshot</summary>
          <form action={addClientMetricsSnapshotAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="periodLabel" placeholder="Period (e.g. Aug 2026)" required />
            <input className="gh-input" name="adSpend" placeholder="Ad spend" />
            <input className="gh-input" name="leadsGenerated" placeholder="Leads generated" type="number" />
            <input className="gh-input" name="roas" placeholder="ROAS (e.g. 6.4)" />
            <SubmitButton>Add snapshot</SubmitButton>
          </form>
        </details>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Account team</p>
        {teamMembers.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{m.name} {m.role && <span style={{ color: "var(--gh-text-muted)" }}>({m.role})</span>}</span>
            <form action={deleteClientTeamMemberAction.bind(null, m.id, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
            </form>
          </div>
        ))}
        {teamMembers.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No team members added yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add team member</summary>
          <form action={addClientTeamMemberAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="name" placeholder="Name" required />
            <input className="gh-input" name="role" placeholder="Role (optional)" />
            <input className="gh-input" name="contactEmail" type="email" placeholder="Contact email (optional)" />
            <SubmitButton>Add member</SubmitButton>
          </form>
        </details>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Campaign health</p>
        {healthChannels.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{c.channelName} <span className="gh-badge" data-status={c.status === "ok" ? "success" : c.status === "warn" ? "warning" : undefined}>{c.statusLabel}</span></span>
            <form action={deleteClientHealthChannelAction.bind(null, c.id, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
            </form>
          </div>
        ))}
        {healthChannels.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No channels logged yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add channel</summary>
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
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="gh-eyebrow">Emails</p>
          <Link href="/email-triage/clients" style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
            View all in Email Triage →
          </Link>
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
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
            <span>{a.body} <span style={{ color: "var(--gh-text-muted)" }}>— {new Date(a.occurredAt).toLocaleDateString("en-NZ")}</span></span>
            <form action={deleteClientActivityFeedEntryAction.bind(null, a.id, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>Remove</SubmitButton>
            </form>
          </div>
        ))}
        {activityFeed.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No activity logged yet.</p>}
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Log activity</summary>
          <form action={addClientActivityFeedEntryAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="body" placeholder="What happened" required />
            <SubmitButton>Log activity</SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}
