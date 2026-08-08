import "server-only";
import { clientHealthChannels } from "@/lib/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const ClientHealthChannelStatus = z.enum(["ok", "warn", "off"]);

export const ClientHealthChannelInput = z.object({
  clientId: z.string().uuid(),
  channelName: z.string().min(1),
  status: ClientHealthChannelStatus.default("ok"),
  statusLabel: z.string().min(1),
});
export type ClientHealthChannelInputT = z.infer<typeof ClientHealthChannelInput>;

export async function listClientHealthChannels(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(clientHealthChannels)
      .where(and(eq(clientHealthChannels.clientId, clientId), isNull(clientHealthChannels.deletedAt)))
      .orderBy(asc(clientHealthChannels.sortOrder));
  });
}

export async function addClientHealthChannel(input: ClientHealthChannelInputT) {
  const data = ClientHealthChannelInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(clientHealthChannels)
      .where(and(eq(clientHealthChannels.clientId, data.clientId), isNull(clientHealthChannels.deletedAt)));
    return auditedInsert(
      tx,
      clientHealthChannels,
      { ...data, sortOrder: Number(count), createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "client_health_channel" }
    );
  });
}

export async function updateClientHealthChannel(
  id: string,
  input: Partial<Omit<ClientHealthChannelInputT, "clientId">>
) {
  const data = ClientHealthChannelInput.omit({ clientId: true }).partial().parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(
      tx,
      clientHealthChannels,
      eq(clientHealthChannels.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "client_health_channel" }
    );
  });
}

export async function softDeleteClientHealthChannel(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, clientHealthChannels, id, { caller, entityType: "client_health_channel" });
  });
}
