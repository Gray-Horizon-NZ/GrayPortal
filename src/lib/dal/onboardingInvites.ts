import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { onboardingInvites, clients, companies, clientServices, serviceItems, emailTemplates, users, documents, roadmapItems } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { withAdminScope, assertRole, type Tx } from "./session";
import { auditedInsert } from "./mutate";
import { sendGmail } from "@/lib/google/gmailAdapter";
import { wrapEmailHtml, sanitizeEmailHtml, stripHtmlToText, ctaButtonHtml, MUTED } from "@/lib/email/chrome";
import { renderTemplate } from "./emails";
import { ONBOARDING_DOCUMENT_NAMES } from "@/config/onboarding";

// Client onboarding wizard, foundation slice (Open-Work-Brief.md §4, §7 item
// 10 — decided 2026-08-27: 14 days, admin can resend anytime).
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function generateInviteToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

/**
 * Default subject/body for the "send/resend portal-setup invite" review-
 * and-edit form (client detail page) — pulled from the editable
 * onboarding_invite email template if one's been saved (Email Templates
 * tab), so the same copy that's edited/previewed/tested there is what
 * pre-fills every send, and a wording change only has to happen in one
 * place. Falls back to the original hardcoded copy if that template
 * hasn't been seeded yet, so nothing breaks in the meantime.
 */
export async function getDefaultOnboardingInviteEmail(clientName: string): Promise<{ subject: string; body: string }> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [template] = await tx
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.key, "onboarding_invite"), isNull(emailTemplates.deletedAt)))
      .limit(1);
    if (!template) {
      const { defaultOnboardingInviteEmail } = await import("@/config/onboarding");
      return defaultOnboardingInviteEmail(clientName);
    }
    const rendered = renderTemplate(template, { client_name: clientName });
    return { subject: rendered.subject, body: rendered.htmlBody };
  });
}

/**
 * Fires once, on a client's genuinely first successful portal sign-in
 * (claimOrVerifyAllowlist) — landing in a real, working portal is a more
 * meaningful "onboarding complete" signal than the wizard's own last step,
 * since a client could finish every wizard step and never actually sign
 * in. Sent to both the client and every admin, confirming completion from
 * both sides (Open-Work-Brief.md §4.2). Takes the caller's own tx directly
 * — no real Caller exists yet at sign-in time, same constraint every other
 * pre-caller write in this file works around. Best-effort throughout: a
 * failed send must never block the client's actual sign-in.
 */
export async function sendOnboardingCompletionEmail(tx: Tx, clientId: string, clientEmail: string) {
  try {
    const [client] = await tx.select({ name: clients.name }).from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client) return;

    const [template] = await tx
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.key, "onboarding_completion"), isNull(emailTemplates.deletedAt)))
      .limit(1);
    if (!template) {
      console.error("onboarding_completion email template not found — completion email not sent");
      return;
    }

    const rendered = renderTemplate(template, { client_name: client.name });
    const html = wrapEmailHtml(sanitizeEmailHtml(rendered.htmlBody));
    const admins = await tx
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const to of [clientEmail, ...admins.map((a) => a.email)]) {
      const sent = await sendGmail({ to, subject: rendered.subject, bodyText: stripHtmlToText(rendered.htmlBody), bodyHtml: html });
      if (!sent) console.error(`Failed to send onboarding completion email to ${to}`);
    }
  } catch (err) {
    console.error("Onboarding completion email failed", err);
  }
}

function inviteCtaHtml(link: string): string {
  return `
    ${ctaButtonHtml("Set up your portal", link)}
    <p style="margin:12px 0 0; font-size:13px; color:${MUTED};">
      Or copy this link: ${link}
    </p>
  `;
}

export const SendOnboardingInviteInput = z.object({
  clientId: z.string().uuid(),
  toEmail: z.string().email(),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  appOrigin: z.string().url(),
});
export type SendOnboardingInviteInputT = z.infer<typeof SendOnboardingInviteInput>;

/**
 * Shared by sendOnboardingInvite's pre-send gate below and buildWizardData's
 * step 4 (same query) — one place, so "did the client get their documents"
 * never drifts between the two checks that ask it.
 */
async function getAttachedOnboardingDocumentNames(tx: Tx, clientId: string): Promise<string[]> {
  const rows = await tx
    .select({ title: documents.title })
    .from(documents)
    .where(
      and(
        eq(documents.clientId, clientId),
        inArray(documents.title, [...ONBOARDING_DOCUMENT_NAMES]),
        isNull(documents.deletedAt)
      )
    );
  return rows.map((d) => d.title!);
}

/**
 * Shared by sendOnboardingInvite's pre-send gate and the client-detail page's
 * UI gate, same "one place" reasoning as getAttachedOnboardingDocumentNames —
 * a client can't get a portal-setup invite until their roadmap actually has
 * something on it (Max: an empty roadmap means the portal isn't ready to
 * hand over, same blocker class as a missing onboarding document).
 */
async function clientHasRoadmapItems(tx: Tx, clientId: string): Promise<boolean> {
  const rows = await tx
    .select({ id: roadmapItems.id })
    .from(roadmapItems)
    .where(and(eq(roadmapItems.clientId, clientId), isNull(roadmapItems.deletedAt)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Mints a fresh 14-day portal-setup token and emails it — the only way an
 * onboarding-wizard link gets created or resent. Calling this again for the
 * same client always wins: any existing active invite is revoked first, so
 * only the newest emailed link ever verifies. The link itself is a fixed CTA
 * appended after the admin's (freely edited, sanitized) message — never part
 * of the editable body — so an edit can't accidentally drop it.
 *
 * Gated on all four onboarding documents (Open-Work-Brief.md §4.5) being
 * attached, and the roadmap being non-empty, first — enforced here, not just in the UI, so the rule holds
 * regardless of caller (a direct action call bypassing the client-detail
 * page can't skip it either). The client-detail page's own gate is a UX
 * nicety on top of this, not the real enforcement.
 */
export async function sendOnboardingInvite(input: SendOnboardingInviteInputT) {
  const data = SendOnboardingInviteInput.parse(input);

  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const attached = await getAttachedOnboardingDocumentNames(tx, data.clientId);
    const missing: string[] = ONBOARDING_DOCUMENT_NAMES.filter((name) => !attached.includes(name));
    if (!(await clientHasRoadmapItems(tx, data.clientId))) {
      missing.push("Roadmap");
    }
    if (missing.length > 0) {
      throw new Error(`Attach all onboarding documents and set up a roadmap before sending an invite — still missing: ${missing.join(", ")}`);
    }

    // Bulk status flip, not auditedUpdate: there's no meaningful before/after
    // diff to record on the superseded rows beyond "revoked because a newer
    // invite was just issued," which the new row's own create-audit already
    // implies. Same unaudited-bookkeeping-stamp precedent as
    // claimOrVerifyAllowlist's raw googleUid update.
    await tx
      .update(onboardingInvites)
      .set({ status: "revoked" })
      .where(and(eq(onboardingInvites.clientId, data.clientId), eq(onboardingInvites.status, "active")));

    const { raw, hash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await auditedInsert<{ id: string; expiresAt: Date }>(
      tx,
      onboardingInvites,
      {
        clientId: data.clientId,
        email: data.toEmail,
        tokenHash: hash,
        expiresAt,
        createdBy: caller.userId,
      },
      { caller, entityType: "onboarding_invite" }
    );

    const link = `${data.appOrigin}/onboard/${raw}`;
    const messageHtml = sanitizeEmailHtml(data.bodyHtml) + inviteCtaHtml(link);
    const html = wrapEmailHtml(messageHtml);

    // Deliberately bypasses sendEmail (src/lib/dal/emails.ts): that function
    // requires exactly one of contactId/dealId and the emails table has no
    // clientId column at all — neither fits a brand-new client invite sent
    // before any contact/deal row exists. Sends via the Gmail adapter
    // directly instead, same as campaign sends do.
    const sent = await sendGmail({
      to: data.toEmail,
      subject: data.subject,
      bodyText: stripHtmlToText(messageHtml),
      bodyHtml: html,
    });
    if (!sent) throw new Error("Gmail is not connected — could not send the invite");

    return invite;
  });
}

type ResolvedInvite =
  | { status: "valid"; clientId: string; companyId: string | null; clientName: string }
  | { status: "expired" }
  | { status: "not_found" };

/**
 * The one place a raw token gets resolved to a client — every token-gated
 * wizard function (verify, update details, submit an access request) goes
 * through this, so a hidden clientId field can never substitute for a real
 * verified token. Must run inside a transaction already opened by
 * withAdminScope (no caller exists yet — see verifyOnboardingToken below).
 * A revoked or unknown token both report "not_found," deliberately not
 * distinguishing "this was a real invite that's since been superseded"
 * from "this token never existed."
 */
export async function resolveActiveInvite(tx: Tx, rawToken: string): Promise<ResolvedInvite> {
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const [row] = await tx
    .select({
      clientId: onboardingInvites.clientId,
      status: onboardingInvites.status,
      expiresAt: onboardingInvites.expiresAt,
      clientName: clients.name,
      companyId: clients.companyId,
    })
    .from(onboardingInvites)
    .innerJoin(clients, eq(clients.id, onboardingInvites.clientId))
    .where(eq(onboardingInvites.tokenHash, hash))
    .limit(1);

  if (!row || row.status !== "active") return { status: "not_found" };
  if (row.expiresAt.getTime() < Date.now()) return { status: "expired" };
  return { status: "valid", clientId: row.clientId, companyId: row.companyId, clientName: row.clientName };
}

export type OnboardingTokenVerification = ResolvedInvite;

/**
 * Runs before any session exists — the client clicking the emailed link has
 * no Firebase identity yet. Uses withAdminScope, the app's existing audited
 * escape hatch for exactly this shape of pre-caller DB access (same pattern
 * claimOrVerifyAllowlist already uses for the first-sign-in allowlist check
 * in src/lib/dal/allowlist.ts).
 */
export async function verifyOnboardingToken(rawToken: string): Promise<OnboardingTokenVerification> {
  return withAdminScope("onboarding invite token verify", (tx) => resolveActiveInvite(tx, rawToken));
}

type WizardCompanyDetails = {
  businessName: string | null;
  mainEmail: string | null;
  phone: string | null;
  mainContactPosition: string | null;
  address: string | null;
  postalAddress: string | null;
  referredBy: string | null;
};

type WizardServiceRow = {
  id: string;
  deliverable: string;
  billingType: string;
  currentSetupPrice: string | null;
  currentMonthlyPrice: string | null;
  customSetupPrice: string | null;
  customMonthlyPrice: string | null;
  discountPercent: string | null;
};

export type OnboardingWizardData =
  | {
      status: "valid";
      clientId: string;
      clientName: string;
      company: WizardCompanyDetails;
      services: WizardServiceRow[];
      attachedDocumentNames: string[];
    }
  | { status: "expired" }
  | { status: "not_found" };

const EMPTY_COMPANY_DETAILS: WizardCompanyDetails = {
  businessName: null,
  mainEmail: null,
  phone: null,
  mainContactPosition: null,
  address: null,
  postalAddress: null,
  referredBy: null,
};

/** Shared by the live (token-verified) and preview (admin-caller) wizard
 * data loaders — everything after "which client" is identical either way. */
async function buildWizardData(
  tx: Tx,
  clientId: string,
  clientName: string,
  companyId: string | null
): Promise<OnboardingWizardData> {
  let company = EMPTY_COMPANY_DETAILS;
  if (companyId) {
    const [row] = await tx
      .select({
        businessName: companies.name,
        mainEmail: companies.mainEmail,
        phone: companies.phone,
        mainContactPosition: companies.mainContactPosition,
        address: companies.address,
        postalAddress: companies.postalAddress,
        referredBy: companies.referredBy,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (row) company = row;
  }

  // Step 5 shows what's currently agreed, not history — active services only.
  const services = await tx
    .select({
      id: clientServices.id,
      deliverable: serviceItems.deliverable,
      billingType: serviceItems.billingType,
      currentSetupPrice: serviceItems.currentSetupPrice,
      currentMonthlyPrice: serviceItems.currentMonthlyPrice,
      customSetupPrice: clientServices.customSetupPrice,
      customMonthlyPrice: clientServices.customMonthlyPrice,
      discountPercent: clientServices.discountPercent,
    })
    .from(clientServices)
    .innerJoin(serviceItems, eq(clientServices.serviceItemId, serviceItems.id))
    .where(
      and(
        eq(clientServices.clientId, clientId),
        eq(clientServices.status, "active"),
        isNull(clientServices.deletedAt)
      )
    );

  // Step 4's real state (Open-Work-Brief.md §4.5) — which of the four fixed
  // onboarding documents are actually attached, matched by title against
  // the shared ONBOARDING_DOCUMENT_NAMES registry rather than a new docType.
  const attachedDocumentNames = await getAttachedOnboardingDocumentNames(tx, clientId);

  return { status: "valid", clientId, clientName, company, services, attachedDocumentNames };
}

/** Live wizard entry point — /onboard/[token]. */
export async function loadOnboardingWizardData(rawToken: string): Promise<OnboardingWizardData> {
  return withAdminScope("onboarding wizard: load live data", async (tx) => {
    const resolved = await resolveActiveInvite(tx, rawToken);
    if (resolved.status !== "valid") return resolved;
    return buildWizardData(tx, resolved.clientId, resolved.clientName, resolved.companyId);
  });
}

/**
 * Admin preview entry point — /onboarding-preview/[clientId]. No token, no
 * write path: the preview UI never calls the mutating wizard actions at
 * all, so there's nothing here to gate beyond "caller is an admin."
 */
export async function loadOnboardingWizardPreviewData(clientId: string): Promise<OnboardingWizardData> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [client] = await tx
      .select({ id: clients.id, name: clients.name, companyId: clients.companyId })
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);
    if (!client) return { status: "not_found" };
    return buildWizardData(tx, client.id, client.name, client.companyId);
  });
}

export const UpdateOnboardingCompanyDetailsInput = z.object({
  businessName: z.string().optional(),
  mainEmail: z.string().optional(),
  phone: z.string().optional(),
  mainContactPosition: z.string().optional(),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
  referredBy: z.string().optional(),
});
export type UpdateOnboardingCompanyDetailsInputT = z.infer<typeof UpdateOnboardingCompanyDetailsInput>;

function blankToNull(v?: string): string | null {
  const trimmed = v?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Wizard step 2, "Confirm your details" — live mode only (the preview UI
 * never calls this). Re-resolves clientId/companyId from the token itself
 * rather than trusting a client-supplied id, same reasoning as
 * resolveActiveInvite's own doc comment.
 */
export async function updateOnboardingCompanyDetails(rawToken: string, input: UpdateOnboardingCompanyDetailsInputT) {
  const data = UpdateOnboardingCompanyDetailsInput.parse(input);

  return withAdminScope("onboarding wizard: update company details", async (tx) => {
    const resolved = await resolveActiveInvite(tx, rawToken);
    if (resolved.status !== "valid" || !resolved.companyId) {
      throw new Error("This onboarding link is no longer valid");
    }

    // Plain update, not auditedUpdate: no real Caller exists in this
    // pre-session context to attribute the audit row to — same tradeoff
    // claimOrVerifyAllowlist already makes for its own pre-caller write.
    // companies.name is NOT NULL, so it's only ever touched when the client
    // actually typed a replacement — never blanked out to null like the
    // other fields.
    await tx
      .update(companies)
      .set({
        ...(blankToNull(data.businessName) ? { name: blankToNull(data.businessName)! } : {}),
        mainEmail: blankToNull(data.mainEmail),
        phone: blankToNull(data.phone),
        mainContactPosition: blankToNull(data.mainContactPosition),
        address: blankToNull(data.address),
        postalAddress: blankToNull(data.postalAddress),
        referredBy: blankToNull(data.referredBy),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, resolved.companyId));
  });
}
