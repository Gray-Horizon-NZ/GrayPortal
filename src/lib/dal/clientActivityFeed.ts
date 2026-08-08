import "server-only";
import { clientActivityFeed } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const ClientActivityFeedInput = z.object({
  clientId: z.string().uuid(),
  body: z.string().min(1),
});
export type ClientActivityFeedInputT = z.infer<typeof ClientActivityFeedInput>;

export async function listClientActivityFeed(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(clientActivityFeed)
      .where(and(eq(clientActivityFeed.clientId, clientId), isNull(clientActivityFeed.deletedAt)))
      .orderBy(desc(clientActivityFeed.occurredAt));
  });
}

export async function addClientActivityFeedEntry(input: ClientActivityFeedInputT) {
  const data = ClientActivityFeedInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      clientActivityFeed,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "client_activity_feed_entry" }
    );
  });
}

export async function softDeleteClientActivityFeedEntry(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, clientActivityFeed, id, { caller, entityType: "client_activity_feed_entry" });
  });
}
