import Link from "next/link";
import { daysUntil } from "@/lib/date";
import { ONBOARDING_DOCUMENT_NAMES } from "@/config/onboarding";
import SubmitButton from "@/components/ui/SubmitButton";
import {
  approvePortalAccessRequestAction,
  denyPortalAccessRequestAction,
  sendOnboardingInviteAction,
  inviteClientAction,
  uploadDocumentAction,
} from "../../actions";
import SendInviteGate from "../SendInviteGate";
import CredentialsList from "../../../vault/CredentialsList";
import type { ClientRecord, PortalUser, OnboardingInvite, PendingAccessRequest, ClientDocument } from "./types";

export default function AccessTab({
  client,
  pendingAccessRequests,
  portalUsers,
  onboardingInvites,
  defaultInviteEmail,
  missingReadinessItems,
  documents,
  invited,
  inviteError,
  onboardingInviteSent,
  onboardingInviteError,
  accessRequestApproved,
  accessRequestDenied,
  accessRequestError,
}: {
  client: ClientRecord;
  pendingAccessRequests: PendingAccessRequest[];
  portalUsers: PortalUser[];
  onboardingInvites: OnboardingInvite[];
  defaultInviteEmail: { subject: string; body: string };
  missingReadinessItems: string[];
  documents: ClientDocument[];
  invited?: string;
  inviteError?: string;
  onboardingInviteSent?: string;
  onboardingInviteError?: string;
  accessRequestApproved?: string;
  accessRequestDenied?: string;
  accessRequestError?: string;
}) {
  return (
    <>
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
              <div key={r.id} className="gh-item-row">
                <div className="gh-item-row-info">
                  <span className="t">
                    {r.email}
                    {r.displayName && <span style={{ color: "var(--gh-text-muted)", fontWeight: 400 }}> ({r.displayName})</span>}
                  </span>
                </div>
                <div className="gh-item-row-actions">
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
                <SendInviteGate missingDocumentNames={missingReadinessItems}>
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
        <div className="gh-add-form">
          <form action={inviteClientAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <input className="gh-input" name="email" type="email" placeholder="Client email" required />
            <input className="gh-input" name="displayName" placeholder="Display name (optional)" />
            <SubmitButton>Invite to portal</SubmitButton>
          </form>
        </div>
      </section>

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
            <div key={name} className="gh-item-row">
              <span>{name}</span>
              {existing ? (
                <span style={{ color: "var(--gh-success)" }}>✓ Attached</span>
              ) : (
                <details>
                  <summary style={{ cursor: "pointer", color: "var(--gh-accent)", fontSize: "var(--gh-text-sm)" }}>Attach</summary>
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

      <CredentialsList clientId={client.id} />
    </>
  );
}
