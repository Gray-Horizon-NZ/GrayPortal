import "server-only";
import { clientTeamMembers } from "@/lib/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const ClientTeamMemberInput = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});
export type ClientTeamMemberInputT = z.infer<typeof ClientTeamMemberInput>;

export async function listClientTeamMembers(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(clientTeamMembers)
      .where(and(eq(clientTeamMembers.clientId, clientId), isNull(clientTeamMembers.deletedAt)))
      .orderBy(asc(clientTeamMembers.sortOrder));
  });
}

export async function addClientTeamMember(input: ClientTeamMemberInputT) {
  const data = ClientTeamMemberInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(clientTeamMembers)
      .where(and(eq(clientTeamMembers.clientId, data.clientId), isNull(clientTeamMembers.deletedAt)));
    return auditedInsert(
      tx,
      clientTeamMembers,
      {
        ...data,
        contactEmail: data.contactEmail || null,
        sortOrder: Number(count),
        createdBy: caller.userId,
        updatedBy: caller.userId,
      },
      { caller, entityType: "client_team_member" }
    );
  });
}

export async function softDeleteClientTeamMember(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, clientTeamMembers, id, { caller, entityType: "client_team_member" });
  });
}
