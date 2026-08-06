import "server-only";
import { companies, contacts, deals } from "@/lib/db/schema";
import { and, isNull, or, ilike } from "drizzle-orm";
import { withCaller } from "./auth";

export async function searchAll(query: string) {
  return withCaller(async (_caller, tx) => {
    const term = `%${query}%`;
    const companyRows = await tx
      .select()
      .from(companies)
      .where(and(isNull(companies.deletedAt), ilike(companies.name, term)));
    const contactRows = await tx
      .select()
      .from(contacts)
      .where(
        and(
          isNull(contacts.deletedAt),
          or(ilike(contacts.firstName, term), ilike(contacts.lastName, term), ilike(contacts.email, term))
        )
      );
    const dealRows = await tx
      .select()
      .from(deals)
      .where(and(isNull(deals.deletedAt), ilike(deals.nextAction, term)));
    return { companyRows, contactRows, dealRows };
  });
}
