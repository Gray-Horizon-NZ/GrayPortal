import "server-only";
import { clients, companies } from "@/lib/db/schema";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { withCaller } from "./auth";

export type Account =
  | { kind: "client"; id: string; name: string; companyName: string | null; nextPaymentDate: string | null }
  | { kind: "company"; id: string; name: string; industry: string | null; region: string | null };

/**
 * Backs the merged /clients list — clients and companies are genuinely
 * different entities (payment/features/portal vs contacts/deals), but Max
 * wants one searchable browse view over both. A company already linked to
 * a client (clients.companyId) is excluded from the company-only branch so
 * it appears exactly once, as the client row.
 */
export async function listAccounts(search?: string): Promise<Account[]> {
  return withCaller(async (_caller, tx) => {
    const clientRows = await tx
      .select({
        id: clients.id,
        name: clients.name,
        nextPaymentDate: clients.nextPaymentDate,
        companyId: clients.companyId,
        companyName: companies.name,
      })
      .from(clients)
      .leftJoin(companies, eq(clients.companyId, companies.id))
      .where(isNull(clients.deletedAt));

    const linkedCompanyIds = clientRows.map((c) => c.companyId).filter((id): id is string => !!id);

    const companyRows = await tx
      .select({ id: companies.id, name: companies.name, industry: companies.industry, region: companies.region })
      .from(companies)
      .where(
        linkedCompanyIds.length > 0
          ? and(isNull(companies.deletedAt), notInArray(companies.id, linkedCompanyIds))
          : isNull(companies.deletedAt)
      );

    const accounts: Account[] = [
      ...clientRows.map((c) => ({
        kind: "client" as const,
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        nextPaymentDate: c.nextPaymentDate,
      })),
      ...companyRows.map((c) => ({
        kind: "company" as const,
        id: c.id,
        name: c.name,
        industry: c.industry,
        region: c.region,
      })),
    ];

    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.kind === "client" && a.companyName?.toLowerCase().includes(q))
    );
  });
}
