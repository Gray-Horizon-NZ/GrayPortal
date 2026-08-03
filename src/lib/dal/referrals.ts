import "server-only";
import { referrals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withCaller } from "./auth";
import { auditedInsert, auditedUpdate } from "./mutate";
import { z } from "zod";

// Referrals are manually managed by Gray Horizon staff for now (confirmed
// with Max) — status is a plain admin-set field, not computed from any
// automated tracking. Automating detection/attribution is a later problem.
export const ReferralInput = z.object({
  clientId: z.string().uuid(),
  referredName: z.string().min(1),
  referredCompanyId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type ReferralInputT = z.infer<typeof ReferralInput>;

export const ReferralStatus = z.enum(["pending", "confirmed", "credited", "declined"]);

export async function createReferral(input: ReferralInputT) {
  const data = ReferralInput.parse(input);
  return withCaller(async (caller, tx) => {
    return auditedInsert(
      tx,
      referrals,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "referral" }
    );
  });
}

export async function setReferralStatus(
  id: string,
  status: z.infer<typeof ReferralStatus>,
  creditAmountNzd?: string
) {
  const parsed = ReferralStatus.parse(status);
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      referrals,
      eq(referrals.id, id),
      id,
      {
        status: parsed,
        creditAmountNzd: parsed === "credited" ? creditAmountNzd : undefined,
        updatedBy: caller.userId,
      },
      { caller, entityType: "referral" }
    );
  });
}
