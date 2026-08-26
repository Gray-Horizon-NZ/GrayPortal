import "server-only";
import { aiAgents } from "@/lib/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "./mutate";
import { z } from "zod";

// Max's own AI agent roadmap — admin-only, same design as the internal
// Ideation tab (Open-Work-Brief.md follow-up, 2026-08-26) but grouped by a
// fixed lifecycle instead of a free-form category list: "planned"/"in_dev"/
// "active" are inherent pipeline stages, not open-ended tags, so this is a
// pgEnum (db/sql/024 locks the table down to admin, no exceptions).
export const AiAgentStatus = z.enum(["planned", "in_dev", "active"]);

export const AiAgentInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: AiAgentStatus.default("planned"),
});
export type AiAgentInputT = z.infer<typeof AiAgentInput>;

export async function listAiAgents() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(aiAgents)
      .where(isNull(aiAgents.deletedAt))
      .orderBy(desc(aiAgents.createdAt));
  });
}

export async function createAiAgent(input: AiAgentInputT) {
  const data = AiAgentInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      aiAgents,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "ai_agent" }
    );
  });
}

export async function updateAiAgent(id: string, input: Partial<AiAgentInputT>) {
  const data = AiAgentInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedUpdate(tx, aiAgents, eq(aiAgents.id, id), id, { ...data, updatedBy: caller.userId }, { caller, entityType: "ai_agent" });
  });
}

export async function softDeleteAiAgent(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, aiAgents, id, { caller, entityType: "ai_agent" });
  });
}
