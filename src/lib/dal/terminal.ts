import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  activities,
  clientHealthScores,
  clientServices,
  clients,
  companies,
  contacts,
  deals,
  incrementumEngagements,
  serviceItems,
  xeroInvoices,
} from "@/lib/db/schema";
import { withCaller } from "./auth";
import { assertRole } from "./session";

// Read-only queries behind the terminal UI's screens (src/terminal/load.ts
// turns their rows into the concept's data shapes). Each is its own small
// transaction so a screen can run them in parallel: with the database
// ~100ms away, several concurrent short transactions finish far sooner
// than one long one issuing its queries back to back. Admin-only.

export async function qClientsWithCompany() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select({ client: clients, company: companies })
      .from(clients)
      .leftJoin(companies, eq(clients.companyId, companies.id))
      .where(isNull(clients.deletedAt))
      .orderBy(clients.name);
  });
}

export async function qContacts() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx.select().from(contacts).where(isNull(contacts.deletedAt)).orderBy(contacts.createdAt);
  });
}

export async function qClientServices() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select({ svc: clientServices, item: serviceItems })
      .from(clientServices)
      .innerJoin(serviceItems, eq(clientServices.serviceItemId, serviceItems.id))
      .where(isNull(clientServices.deletedAt));
  });
}

/** Each client's Project Incrementum engagements (the Incrementum badge on Clients). */
export async function qIncrementumEngagements() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select({ id: incrementumEngagements.id, clientId: incrementumEngagements.clientId, status: incrementumEngagements.status })
      .from(incrementumEngagements)
      .where(isNull(incrementumEngagements.deletedAt));
  });
}

/** Latest health row per client, with its components. */
export async function qLatestHealth() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const rows = await tx.select().from(clientHealthScores).orderBy(desc(clientHealthScores.computedAt));
    const latest = new Map<string, (typeof rows)[number]>();
    const history = new Map<string, number[]>();
    for (const r of rows) {
      if (!latest.has(r.clientId)) latest.set(r.clientId, r);
      const h = history.get(r.clientId) ?? [];
      if (h.length < 12) h.unshift(Math.round(Number(r.score)));
      history.set(r.clientId, h);
    }
    return { latest, history };
  });
}

export async function qDeals() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select({ deal: deals, company: companies, contact: contacts })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(isNull(deals.deletedAt));
  });
}

/** Deal activity, newest first — stage changes give "days in stage". */
export async function qDealActivities() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx
      .select()
      .from(activities)
      .where(and(isNull(activities.deletedAt)))
      .orderBy(desc(activities.occurredAt));
  });
}


export async function qInvoices() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return tx.select().from(xeroInvoices).orderBy(desc(xeroInvoices.invoiceDate));
  });
}
