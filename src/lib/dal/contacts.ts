import "server-only";
import { contacts, activities } from "@/lib/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { withCaller } from "./auth";
import { auditedInsert, auditedSoftDelete, auditedUpdate } from "./mutate";
import { z } from "zod";

export const ContactInput = z.object({
  companyId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roleTitle: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
export type ContactInputT = z.infer<typeof ContactInput>;

export async function getContact(id: string) {
  return withCaller(async (_caller, tx) => {
    const [contact] = await tx
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);
    if (!contact) return null;
    // Phase 10 — activities include inbound/outbound email, matching the
    // deal detail page's timeline (src/lib/dal/deals.ts's getDeal).
    const contactActivities = await tx
      .select()
      .from(activities)
      .where(and(eq(activities.contactId, id), isNull(activities.deletedAt)));
    return { contact, activities: contactActivities };
  });
}

export async function createContact(input: ContactInputT) {
  const data = ContactInput.parse(input);
  return withCaller(async (caller, tx) => {
    return auditedInsert(
      tx,
      contacts,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "contact" }
    );
  });
}

export async function updateContact(id: string, input: Partial<ContactInputT>) {
  const data = ContactInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      contacts,
      eq(contacts.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "contact" }
    );
  });
}

/** Phase 10 — inbox triage's manual match picker (mirrors XeroLink's search-and-pick, no fuzzy auto-match). */
export async function searchContacts(term: string) {
  return withCaller(async (_caller, tx) => {
    const like = `%${term}%`;
    return tx
      .select()
      .from(contacts)
      .where(
        and(
          isNull(contacts.deletedAt),
          or(ilike(contacts.firstName, like), ilike(contacts.lastName, like), ilike(contacts.email, like))
        )
      )
      .limit(10);
  });
}

export async function softDeleteContact(id: string) {
  return withCaller(async (caller, tx) => {
    return auditedSoftDelete(tx, contacts, id, { caller, entityType: "contact" });
  });
}
