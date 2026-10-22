import "server-only";
import { randomUUID } from "node:crypto";
import { clients, referrals, clientFeatures, users, documents, onboardingInvites } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { adminBucket } from "@/lib/firebase/admin";
import { z } from "zod";
import { percentString } from "./validation";

export const ClientInput = z.object({
  name: z.string().min(1),
  companyId: z.string().uuid().optional(),
  nextPaymentDate: z.string().optional(),
  driveFolderUrl: z.string().optional(),
  lookerStudioUrl: z.string().optional(),
  portalWelcomeMessage: z.string().optional(),
  // Applied on top of the summed active client_services total (see
  // src/lib/dal/clientServices.ts's getActiveMonthlyTotal) — the "this
  // client's whole retainer is X% off" knob, independent of any
  // per-service discountPercent.
  overallDiscountPercent: percentString,
});
export type ClientInputT = z.infer<typeof ClientInput>;

// Registry of known portal feature keys — validated here at the app layer
// (brief-style "one place," not a DB enum) so new features don't need a
// migration, per the dynamic-portal-builder scope agreed mid-build.
export const PORTAL_FEATURE_KEYS = [
  "tasks",
  "documents",
  "referrals",
  "grayscale_page",
  "invoices",
  "ideation",
  "roadmap",
  "meeting_summaries",
  "tool_stack",
  "drive",
  "reporting",
  "account_team",
  "campaign_health",
  "deliverables",
  "activity_feed",
] as const;
export type PortalFeatureKey = (typeof PORTAL_FEATURE_KEYS)[number];

export async function listClients() {
  return withCaller(async (_caller, tx) => {
    return tx.select().from(clients).where(isNull(clients.deletedAt));
  });
}

/** Used to guard against onboarding the same prospect company twice — see lib/dal/onboarding.ts. */
export async function getClientByCompanyId(companyId: string) {
  return withCaller(async (_caller, tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .limit(1);
    return client ?? null;
  });
}

export async function getClient(id: string) {
  return withCaller(async (_caller, tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .limit(1);
    if (!client) return null;

    const clientReferrals = await tx
      .select()
      .from(referrals)
      .where(and(eq(referrals.clientId, id), isNull(referrals.deletedAt)));

    const features = await tx
      .select()
      .from(clientFeatures)
      .where(and(eq(clientFeatures.clientId, id), isNull(clientFeatures.deletedAt)));

    const portalUsers = await tx
      .select()
      .from(users)
      .where(and(eq(users.clientId, id), isNull(users.deletedAt)));

    const clientDocuments = await tx
      .select()
      .from(documents)
      .where(and(eq(documents.clientId, id), isNull(documents.deletedAt)));

    // Foundation slice of the onboarding wizard (Open-Work-Brief.md §4) —
    // only the still-active invite(s) matter for the "Send" vs "Resend"
    // button state; revoked history isn't shown on this page.
    const activeOnboardingInvites = await tx
      .select()
      .from(onboardingInvites)
      .where(and(eq(onboardingInvites.clientId, id), eq(onboardingInvites.status, "active")));

    return {
      client,
      referrals: clientReferrals,
      features,
      portalUsers,
      documents: clientDocuments,
      onboardingInvites: activeOnboardingInvites,
    };
  });
}

/** Same precedent as linkClientToXeroContact (dal/xero.ts) — admin-only, one-time explicit choice from the client detail page. */
export async function setClientGoogleTasklist(clientId: string, googleTaskListId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedUpdate(
      tx,
      clients,
      eq(clients.id, clientId),
      clientId,
      { googleTaskListId, updatedBy: caller.userId },
      { caller, entityType: "client" }
    );
  });
}

/** Same shape as setClientGoogleTasklist — admin toggle, e.g. for a test-only client with no real tasks. */
/** Terminal UI banner tint (e.g. "#d9487a"); null falls back to the brand gold. */
export async function setClientBrandColor(clientId: string, color: string | null) {
  const value = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().parse(color);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      clients,
      eq(clients.id, clientId),
      clientId,
      { brandColor: value, updatedBy: caller.userId },
      { caller, entityType: "client" }
    );
  });
}

/** Clears a client's logo (the banner's "Remove"). The Storage object is left in place. */
export async function clearClientLogo(clientId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(tx, clients, eq(clients.id, clientId), clientId, { logoUrl: null, updatedBy: caller.userId }, { caller, entityType: "client" });
  });
}

export async function setClientHiddenFromTaskView(clientId: string, hidden: boolean) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedUpdate(
      tx,
      clients,
      eq(clients.id, clientId),
      clientId,
      { hiddenFromTaskView: hidden, updatedBy: caller.userId },
      { caller, entityType: "client" }
    );
  });
}

export async function createClient(input: ClientInputT) {
  const data = ClientInput.parse(input);
  return withCaller(async (caller, tx) => {
    const client = await auditedInsert(
      tx,
      clients,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "client" }
    );
    // Every client starts with the feature registry present but disabled —
    // the dynamic portal builder toggles these on/off later; having the
    // rows exist from creation means "is this feature on" is always a
    // simple lookup, never a missing-row special case.
    for (const key of PORTAL_FEATURE_KEYS) {
      await auditedInsert(
        tx,
        clientFeatures,
        { clientId: (client as { id: string }).id, featureKey: key, enabled: false },
        { caller, entityType: "client_feature" }
      );
    }
    return client;
  });
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/**
 * Logos aren't sensitive like documents, but this project's Storage bucket
 * has Uniform Bucket-Level Access (no per-object ACLs), so `makePublic()`
 * isn't available — same signed-URL mechanism as documents, just with a
 * far-future expiry instead of documents' 5-minute one, since a logo is
 * meant to be embedded/rendered repeatedly, not gated per-view.
 */
/**
 * Public Firebase Storage download-token URL, not a signed URL — a client
 * logo needs to render forever in every portal pageview, not for a bounded
 * window, and on App Hosting/Cloud Run there's no local private key to sign
 * with (adminApp uses applicationDefault()), so getSignedUrl() falls back to
 * an IAM signBlob() round-trip that turned out to produce a URL GCS itself
 * rejects with "SignatureDoesNotMatch" (confirmed by curl against a real
 * stored logo — the upload silently "succeeded" but the URL never worked,
 * in the admin preview or the portal). A download token sidesteps signing
 * entirely: it's just object metadata, verified by the firebasestorage.
 * googleapis.com REST layer, the same mechanism the Firebase client SDKs
 * use for public downloads.
 */
function firebaseDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

/**
 * Storage object path from a stored logo URL. Two shapes exist in the data:
 * the download-token URL below (…/v0/b/<bucket>/o/<encoded path>?alt=media…)
 * and an older plain GCS URL (storage.googleapis.com/<bucket>/<path>).
 */
function logoObjectPath(logoUrl: string, bucketName: string): string | null {
  try {
    const u = new URL(logoUrl);
    const fb = u.pathname.match(/\/o\/(.+)$/);
    if (fb) return decodeURIComponent(fb[1]);
    const prefix = `/${bucketName}/`;
    if (u.pathname.startsWith(prefix)) return decodeURIComponent(u.pathname.slice(prefix.length));
  } catch {
    /* not a URL */
  }
  return null;
}

/**
 * The client's logo bytes, read server-side so the browser loads it from
 * GrayPortal's own origin (/api/clients/<id>/logo). Neither stored URL
 * shape renders directly: the bucket isn't Firebase-linked, so token URLs
 * answer 412, and the plain GCS URL isn't public. Access goes through
 * withCaller, so RLS decides who may see which client's logo (admins, and
 * that client's own portal users).
 */
export async function getClientLogo(clientId: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const logoUrl = await withCaller(async (_caller, tx) => {
    const [row] = await tx
      .select({ logoUrl: clients.logoUrl })
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);
    return row?.logoUrl ?? null;
  });
  if (!logoUrl) return null;
  const bucket = adminBucket();
  const objectPath = logoObjectPath(logoUrl, bucket.name);
  if (!objectPath) return null;
  const file = bucket.file(objectPath);
  const [[bytes], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
  return { bytes, contentType: meta.contentType ?? "image/png" };
}

/** Same-origin src for a client's logo, or null; `v` busts caches when the logo changes. */
export function clientLogoSrc(client: { id: string; logoUrl: string | null }): string | null {
  if (!client.logoUrl) return null;
  let v = 0;
  for (const ch of client.logoUrl) v = (v * 31 + ch.charCodeAt(0)) >>> 0;
  return `/api/clients/${client.id}/logo?v=${v.toString(36)}`;
}

export async function uploadClientLogo(clientId: string, file: File) {
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(`Logo exceeds ${MAX_LOGO_BYTES / (1024 * 1024)}MB limit`);
  }
  return withCaller(async (caller, tx) => {
    const objectPath = `logos/${clientId}/${file.name}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const token = randomUUID();
    const bucket = adminBucket();
    await bucket.file(objectPath).save(bytes, {
      contentType: file.type || "image/png",
      resumable: false,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    const url = firebaseDownloadUrl(bucket.name, objectPath, token);

    return auditedUpdate(
      tx,
      clients,
      eq(clients.id, clientId),
      clientId,
      { logoUrl: url, updatedBy: caller.userId },
      { caller, entityType: "client" }
    );
  });
}

export async function updateClient(id: string, input: Partial<ClientInputT>) {
  const data = ClientInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      clients,
      eq(clients.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "client" }
    );
  });
}

export async function softDeleteClient(id: string) {
  return withCaller(async (caller, tx) => {
    return auditedSoftDelete(tx, clients, id, { caller, entityType: "client" });
  });
}

export async function setClientFeature(clientId: string, featureKey: PortalFeatureKey, enabled: boolean) {
  if (!PORTAL_FEATURE_KEYS.includes(featureKey)) {
    throw new Error(`Unknown feature key: ${featureKey}`);
  }
  return withCaller(async (caller, tx) => {
    const [row] = await tx
      .select()
      .from(clientFeatures)
      .where(and(eq(clientFeatures.clientId, clientId), eq(clientFeatures.featureKey, featureKey)))
      .limit(1);
    if (!row) {
      return auditedInsert(
        tx,
        clientFeatures,
        { clientId, featureKey, enabled },
        { caller, entityType: "client_feature" }
      );
    }
    return auditedUpdate(
      tx,
      clientFeatures,
      eq(clientFeatures.id, row.id),
      row.id,
      { enabled },
      { caller, entityType: "client_feature" }
    );
  });
}
