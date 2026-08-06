import "server-only";
import { companies, contacts } from "@/lib/db/schema";
import { withAdminScope } from "./session";
import { z } from "zod";

export const LeadInput = z.object({
  companyName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  message: z.string().optional(),
});
export type LeadInputT = z.infer<typeof LeadInput>;

/**
 * The public website inquiry form's entry point (Phase 11 brief) — a new
 * *entry point* into the existing Company/Contact creation shape, not new
 * business logic. No authenticated caller exists here (the form poster has
 * no Gray Portal session), so this runs under the same admin-scope escape
 * hatch as the cron purge job (src/lib/dal/tasks.ts's purgeOldDoneTasks) —
 * raw inserts, not the caller-based auditedInsert wrapper, for the same
 * reason: there's no caller to attribute the write to. No audit_log row is
 * written for these inserts (matching that precedent); the new
 * company/contact simply appears for staff to pick up, status
 * "Identified" marking it as a fresh top-of-funnel lead rather than an
 * existing/active relationship.
 */
export async function createLead(input: LeadInputT) {
  const data = LeadInput.parse(input);
  return withAdminScope("Public lead capture intake", async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values({
        name: data.companyName,
        website: data.website,
        source: "Website inquiry form",
        status: "Identified",
        notes: data.message,
      })
      .returning();

    const [contact] = await tx
      .insert(contacts)
      .values({
        companyId: company.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      })
      .returning();

    return { company, contact };
  });
}
