import "server-only";
import { clients, tasks, deals, contacts, activities, clientHealthScores } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole } from "./session";
import { paymentStatus } from "@/lib/paymentStatus";
import { isClosedStage } from "@/config/pipeline";

const COMPONENT_MAX = 25;

function paymentComponentFor(nextPaymentDate: string | null): number {
  const status = paymentStatus(nextPaymentDate);
  if (!status) return COMPONENT_MAX * 0.6; // no payment date on file — neutral, not penalised
  if (status.tone === "success") return COMPONENT_MAX;
  if (status.tone === "warning") return COMPONENT_MAX * 0.6;
  return 0; // overdue
}

function taskComponentFor(clientTasks: { status: string }[]): number {
  if (clientTasks.length === 0) return COMPONENT_MAX * 0.6; // no tasks yet — neutral
  const done = clientTasks.filter((t) => t.status === "done").length;
  return (done / clientTasks.length) * COMPONENT_MAX;
}

function activityComponentFor(lastActivityAt: Date | null): number {
  if (!lastActivityAt) return 0;
  const days = (Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return COMPONENT_MAX;
  if (days <= 30) return COMPONENT_MAX * 0.6;
  if (days <= 90) return COMPONENT_MAX * 0.2;
  return 0;
}

function dealMomentumComponentFor(openDeals: { nextActionDate: string }[]): number {
  if (openDeals.length === 0) return COMPONENT_MAX * 0.6; // no open deals — neutral, not a red flag on its own
  const today = new Date().toISOString().slice(0, 10);
  const stalled = openDeals.filter((d) => d.nextActionDate < today).length;
  return Math.max(0, (1 - stalled / openDeals.length)) * COMPONENT_MAX;
}

/**
 * Scheduled computation (brief §9), same admin-scope pattern as
 * purgeOldDoneTasks/generateNotifications — no caller exists for a
 * scheduled job. Appends one row per client every run rather than
 * updating in place, so trend has something to compare against. Payment
 * lateness is a proxy off clients.nextPaymentDate (Phase 9's real
 * Xero-sourced data doesn't exist yet); "days since last logged activity"
 * resolves through the client's company's deals/contacts, since
 * activities don't carry a clientId directly.
 */
export async function computeClientHealthScores() {
  return withAdminScope("Scheduled client health scoring", async (tx) => {
    const allClients = await tx.select().from(clients).where(isNull(clients.deletedAt));
    let computed = 0;

    for (const client of allClients) {
      const clientTasks = await tx
        .select({ status: tasks.status })
        .from(tasks)
        .where(and(eq(tasks.clientId, client.id), isNull(tasks.deletedAt)));

      let lastActivityAt: Date | null = null;
      let openDeals: { nextActionDate: string }[] = [];

      if (client.companyId) {
        const companyDeals = await tx
          .select({ id: deals.id, nextActionDate: deals.nextActionDate, stage: deals.stage })
          .from(deals)
          .where(and(eq(deals.companyId, client.companyId), isNull(deals.deletedAt)));
        openDeals = companyDeals.filter((d) => !isClosedStage(d.stage));

        const companyContacts = await tx
          .select({ id: contacts.id })
          .from(contacts)
          .where(and(eq(contacts.companyId, client.companyId), isNull(contacts.deletedAt)));

        const dealIds = companyDeals.map((d) => d.id);
        const contactIds = companyContacts.map((c) => c.id);
        if (dealIds.length > 0 || contactIds.length > 0) {
          const conditions = [];
          if (dealIds.length > 0) conditions.push(inArray(activities.dealId, dealIds));
          if (contactIds.length > 0) conditions.push(inArray(activities.contactId, contactIds));
          const recentActivities = await tx
            .select({ occurredAt: activities.occurredAt })
            .from(activities)
            .where(and(isNull(activities.deletedAt), or(...conditions)))
            .orderBy(desc(activities.occurredAt))
            .limit(1);
          lastActivityAt = recentActivities[0]?.occurredAt ?? null;
        }
      }

      const paymentComponent = paymentComponentFor(client.nextPaymentDate);
      const taskComponent = taskComponentFor(clientTasks);
      const activityComponent = activityComponentFor(lastActivityAt);
      const dealMomentumComponent = dealMomentumComponentFor(openDeals);
      const score = paymentComponent + taskComponent + activityComponent + dealMomentumComponent;

      const [previous] = await tx
        .select({ score: clientHealthScores.score })
        .from(clientHealthScores)
        .where(eq(clientHealthScores.clientId, client.id))
        .orderBy(desc(clientHealthScores.computedAt))
        .limit(1);

      const prevScore = previous ? Number(previous.score) : null;
      const trend = prevScore === null ? "flat" : score > prevScore + 1 ? "up" : score < prevScore - 1 ? "down" : "flat";

      await tx.insert(clientHealthScores).values({
        clientId: client.id,
        score: score.toFixed(2),
        trend,
        paymentComponent: paymentComponent.toFixed(2),
        taskComponent: taskComponent.toFixed(2),
        activityComponent: activityComponent.toFixed(2),
        dealMomentumComponent: dealMomentumComponent.toFixed(2),
      });
      computed++;
    }

    return { computed };
  });
}

export async function getLatestHealthScore(clientId: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    const [row] = await tx
      .select()
      .from(clientHealthScores)
      .where(eq(clientHealthScores.clientId, clientId))
      .orderBy(desc(clientHealthScores.computedAt))
      .limit(1);
    return row ?? null;
  });
}

/** One row per client (latest only) — for the client list and Homepage. */
export async function listLatestHealthScores() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    const rows = await tx
      .select()
      .from(clientHealthScores)
      .orderBy(desc(clientHealthScores.computedAt));
    const latestByClient = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByClient.has(row.clientId)) latestByClient.set(row.clientId, row);
    }
    return Array.from(latestByClient.values());
  });
}
