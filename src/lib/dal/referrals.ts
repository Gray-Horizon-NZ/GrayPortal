import "server-only";
import { referrals, referralDiscounts } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
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

export const ReferralStatus = z.enum(["submitted", "contacted", "converted", "discount_applied", "declined"]);
const DISCOUNT_PERCENT = "20";
const DISCOUNT_MONTHS = 2;

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

/**
 * For the non-conversion transitions only (submitted/contacted/declined) —
 * "converted" and "discount_applied" are stamped together by
 * convertReferral() below, since the brief wants the discount applied
 * automatically the moment a referral converts, not as a separate manual
 * step an admin could forget.
 */
export async function setReferralStatus(id: string, status: z.infer<typeof ReferralStatus>) {
  const parsed = ReferralStatus.parse(status);
  if (parsed === "converted" || parsed === "discount_applied") {
    throw new Error("Use convertReferral() to record a conversion — it applies the discount automatically.");
  }
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      referrals,
      eq(referrals.id, id),
      id,
      { status: parsed, updatedBy: caller.userId },
      { caller, entityType: "referral" }
    );
  });
}

/**
 * The brief's "applies the documented 20%-off-for-2-months rule (with
 * stacking) automatically when a referral converts, rather than tracking
 * that manually" (Phase 8 §4). Stamps both "converted" and
 * "discount_applied" in one transaction — there's no meaningful gap
 * between them since the discount application isn't a separate human step
 * here, just a recorded fact. "Stacking": this inserts a new
 * referral_discounts row every time, so a client with multiple converted
 * referrals ends up with multiple concurrent (possibly overlapping) active
 * windows rather than one field being overwritten.
 */
export async function convertReferral(id: string) {
  return withCaller(async (caller, tx) => {
    const [referral] = await tx
      .select()
      .from(referrals)
      .where(and(eq(referrals.id, id), isNull(referrals.deletedAt)))
      .limit(1);
    if (!referral) throw new Error("Referral not found");

    await auditedUpdate(
      tx,
      referrals,
      eq(referrals.id, id),
      id,
      { status: "converted", updatedBy: caller.userId },
      { caller, entityType: "referral" }
    );

    const startsOn = new Date();
    const endsOn = new Date(startsOn);
    endsOn.setMonth(endsOn.getMonth() + DISCOUNT_MONTHS);

    await auditedInsert(
      tx,
      referralDiscounts,
      {
        clientId: referral.clientId,
        referralId: id,
        discountPercent: DISCOUNT_PERCENT,
        startsOn: startsOn.toISOString().slice(0, 10),
        endsOn: endsOn.toISOString().slice(0, 10),
        createdBy: caller.userId,
        updatedBy: caller.userId,
      },
      { caller, entityType: "referral_discount" }
    );

    return auditedUpdate(
      tx,
      referrals,
      eq(referrals.id, id),
      id,
      { status: "discount_applied", updatedBy: caller.userId },
      { caller, entityType: "referral" }
    );
  });
}

export async function listActiveDiscounts(clientId: string) {
  return withCaller(async (_caller, tx) => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await tx
      .select()
      .from(referralDiscounts)
      .where(and(eq(referralDiscounts.clientId, clientId), isNull(referralDiscounts.deletedAt)));
    return rows.filter((r) => r.startsOn <= today && r.endsOn >= today);
  });
}
