import "server-only";
import { activities } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { auditedInsert } from "./mutate";
import { z } from "zod";

export const ActivityInput = z
  .object({
    dealId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    type: z.enum(["call", "email", "meeting", "note"]),
    body: z.string().optional(),
    outcome: z.string().optional(),
  })
  .refine((v) => Boolean(v.dealId) !== Boolean(v.contactId), {
    message: "Exactly one of dealId or contactId must be set",
  });
export type ActivityInputT = z.infer<typeof ActivityInput>;

export async function logActivity(input: ActivityInputT) {
  const data = ActivityInput.parse(input);
  return withCaller(async (caller, tx) => {
    return auditedInsert(
      tx,
      activities,
      { ...data, actorUserId: caller.userId },
      { caller, entityType: "activity" }
    );
  });
}
