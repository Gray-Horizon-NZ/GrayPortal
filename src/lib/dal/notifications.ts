import "server-only";
import { notifications, deals, tasks } from "@/lib/db/schema";
import { and, desc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole } from "./session";
import { CLOSED_STAGES } from "@/config/pipeline";

export async function listMyNotifications() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    return tx
      .select()
      .from(notifications)
      .where(or(isNull(notifications.recipientUserId), eq(notifications.recipientUserId, caller.userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
  });
}

export async function unreadNotificationCount() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    const rows = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          or(isNull(notifications.recipientUserId), eq(notifications.recipientUserId, caller.userId)),
          eq(notifications.read, false)
        )
      );
    return rows.length;
  });
}

export async function markNotificationRead(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    await tx.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  });
}

export async function markAllNotificationsRead() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin", "contractor");
    await tx
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          or(isNull(notifications.recipientUserId), eq(notifications.recipientUserId, caller.userId)),
          eq(notifications.read, false)
        )
      );
  });
}

/**
 * Scheduled generation (brief §8, "Triggers to wire up first") — same
 * admin-scope pattern as purgeOldDoneTasks (src/lib/dal/tasks.ts), since
 * this runs on a schedule with no caller. Only "deal with no next action"
 * (interpreted as an overdue nextActionDate — deals always have one, so
 * "no next action" means it's gone stale) and "task overdue" are wired up:
 * payment-due-soon (Phase 9), security alerts (Phase 19), and reminders
 * firing (Phase 17) aren't buildable yet since those phases don't exist.
 * Idempotent: skips creating a duplicate if an unread notification for the
 * same entity+type already exists, so re-running this daily doesn't spam
 * the same stale deal every day.
 */
export async function generateNotifications() {
  return withAdminScope("Scheduled notification generation", async (tx) => {
    const today = new Date().toISOString().slice(0, 10);
    let created = 0;

    const stalledDeals = await tx
      .select({ id: deals.id, companyId: deals.companyId, nextAction: deals.nextAction, stage: deals.stage })
      .from(deals)
      .where(and(isNull(deals.deletedAt), lt(deals.nextActionDate, today)));

    for (const deal of stalledDeals) {
      if (CLOSED_STAGES.includes(deal.stage)) continue;
      const [existing] = await tx
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, "deal_stalled"),
            eq(notifications.read, false),
            sql`${notifications.payload}->>'entityId' = ${deal.id}`
          )
        )
        .limit(1);
      if (existing) continue;
      await tx.insert(notifications).values({
        type: "deal_stalled",
        payload: { entityId: deal.id, entityType: "deal", nextAction: deal.nextAction },
      });
      created++;
    }

    const overdueTasks = await tx
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(and(isNull(tasks.deletedAt), lt(tasks.dueDate, today), ne(tasks.status, "done")));

    for (const task of overdueTasks) {
      const [existing] = await tx
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, "task_overdue"),
            eq(notifications.read, false),
            sql`${notifications.payload}->>'entityId' = ${task.id}`
          )
        )
        .limit(1);
      if (existing) continue;
      await tx.insert(notifications).values({
        type: "task_overdue",
        payload: { entityId: task.id, entityType: "task", title: task.title },
      });
      created++;
    }

    return { created };
  });
}
