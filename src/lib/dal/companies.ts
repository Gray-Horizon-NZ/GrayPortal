import "server-only";
import { companies, contacts, deals } from "@/lib/db/schema";
import { and, desc, eq, isNull, ilike } from "drizzle-orm";
import { withCaller } from "./auth";
import { auditedInsert, auditedSoftDelete, auditedUpdate } from "./mutate";
import { z } from "zod";

export const CompanyInput = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  region: z.string().optional(),
  website: z.string().optional(),
  sizeBand: z.string().optional(),
  source: z.string().min(1),
  status: z.string().optional(),
  notes: z.string().optional(),
});
export type CompanyInputT = z.infer<typeof CompanyInput>;

export async function listCompanies(search?: string) {
  return withCaller(async (_caller, tx) => {
    const conditions = [isNull(companies.deletedAt)];
    if (search) {
      conditions.push(ilike(companies.name, `%${search}%`));
    }
    return tx
      .select()
      .from(companies)
      .where(and(...conditions))
      .orderBy(desc(companies.updatedAt));
  });
}

export async function getCompany(id: string) {
  return withCaller(async (_caller, tx) => {
    const [company] = await tx
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
      .limit(1);
    if (!company) return null;

    const companyContacts = await tx
      .select()
      .from(contacts)
      .where(and(eq(contacts.companyId, id), isNull(contacts.deletedAt)));

    const companyDeals = await tx
      .select()
      .from(deals)
      .where(and(eq(deals.companyId, id), isNull(deals.deletedAt)));

    return { company, contacts: companyContacts, deals: companyDeals };
  });
}

export async function createCompany(input: CompanyInputT) {
  const data = CompanyInput.parse(input);
  return withCaller(async (caller, tx) => {
    return auditedInsert(
      tx,
      companies,
      { ...data, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "company" }
    );
  });
}

export async function updateCompany(id: string, input: Partial<CompanyInputT>) {
  const data = CompanyInput.partial().parse(input);
  return withCaller(async (caller, tx) => {
    return auditedUpdate(
      tx,
      companies,
      eq(companies.id, id),
      id,
      { ...data, updatedBy: caller.userId },
      { caller, entityType: "company" }
    );
  });
}

export async function softDeleteCompany(id: string) {
  return withCaller(async (caller, tx) => {
    return auditedSoftDelete(tx, companies, id, { caller, entityType: "company" });
  });
}
