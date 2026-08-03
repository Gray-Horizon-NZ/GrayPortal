import "server-only";
import { contacts } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
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
    return contact ?? null;
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

export async function softDeleteContact(id: string) {
  return withCaller(async (caller, tx) => {
    return auditedSoftDelete(tx, contacts, id, { caller, entityType: "contact" });
  });
}
