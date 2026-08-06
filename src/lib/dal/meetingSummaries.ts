import "server-only";
import { meetingSummaries } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// "Manually entered or agent-drafted" per the brief — agent-drafted just
// means an MCP-authenticated caller can call createMeetingSummary the same
// way a human admin does (Phase 20's relationship to this is future work,
// not built here); no separate ingestion path exists yet.
export const MeetingSummaryInput = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  occurredAt: z.string().optional(),
  summary: z.string().min(1),
});
export type MeetingSummaryInputT = z.infer<typeof MeetingSummaryInput>;

export async function listMeetingSummaries(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(meetingSummaries)
      .where(and(eq(meetingSummaries.clientId, clientId), isNull(meetingSummaries.deletedAt)))
      .orderBy(desc(meetingSummaries.occurredAt));
  });
}

export async function createMeetingSummary(input: MeetingSummaryInputT) {
  const data = MeetingSummaryInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      meetingSummaries,
      {
        ...data,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        createdBy: caller.userId,
        updatedBy: caller.userId,
      },
      { caller, entityType: "meeting_summary" }
    );
  });
}

export async function softDeleteMeetingSummary(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, meetingSummaries, id, { caller, entityType: "meeting_summary" });
  });
}
