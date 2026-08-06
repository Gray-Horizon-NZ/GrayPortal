import "server-only";
import { clients, referrals, clientFeatures, users, documents } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { auditedInsert, auditedUpdate } from "./mutate";
import { z } from "zod";

export const ClientInput = z.object({
  name: z.string().min(1),
  companyId: z.string().uuid().optional(),
  nextPaymentDate: z.string().optional(),
});
export type ClientInputT = z.infer<typeof ClientInput>;

// Registry of known portal feature keys — validated here at the app layer
// (brief-style "one place," not a DB enum) so new features don't need a
// migration, per the dynamic-portal-builder scope agreed mid-build.
export const PORTAL_FEATURE_KEYS = ["tasks", "documents", "referrals", "grayscale_page"] as const;
export type PortalFeatureKey = (typeof PORTAL_FEATURE_KEYS)[number];

export async function listClients() {
  return withCaller(async (_caller, tx) => {
    return tx.select().from(clients).where(isNull(clients.deletedAt));
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

    return { client, referrals: clientReferrals, features, portalUsers, documents: clientDocuments };
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
