import "server-only";
import { recurringTemplates, tasks, notifications } from "@/lib/db/schema";
import { and, eq, isNull, lte } from "drizzle-orm";
import { withCaller } from "./auth";
import { withAdminScope, assertRole } from "./session";
import { auditedInsert, auditedSoftDelete } from "./mutate";
import { z } from "zod";

export const RecurrenceInterval = z.enum(["monthly", "quarterly", "custom"]);

export const RecurringTemplateInput = z.object({
  name: z.string().min(1),
  interval: RecurrenceInterval,
  intervalDays: z.number().int().positive().optional(),
  nextDueDate: z.string(),
  taskTitle: z.string().min(1),
});
export type RecurringTemplateInputT = z.infer<typeof RecurringTemplateInput>;

export async function listRecurringTemplates() {
  return withCaller(async (_caller, tx) => {
    return tx.select().from(recurringTemplates).where(isNull(recurringTemplates.deletedAt));
  });
}

export async function createRecurringTemplate(input: RecurringTemplateInputT) {
  const data = RecurringTemplateInput.parse(input);
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    return auditedInsert(
      tx,
      recurringTemplates,
      { ...data, intervalDays: data.intervalDays ? String(data.intervalDays) : null, createdBy: caller.userId, updatedBy: caller.userId },
      { caller, entityType: "recurring_template" }
    );
  });
}

export async function softDeleteRecurringTemplate(id: string) {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await auditedSoftDelete(tx, recurringTemplates, id, { caller, entityType: "recurring_template" });
  });
}

function advance(date: Date, interval: "monthly" | "quarterly" | "custom", intervalDays: number | null): Date {
  const next = new Date(date);
  if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  else if (interval === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setDate(next.getDate() + (intervalDays ?? 30));
  return next;
}

/**
 * Scheduled generation (brief §13), same admin-scope pattern as the other
 * cron-triggered DAL functions. Reuses the plain `tasks` table rather than
 * a second task mechanism (matches Phase 5's onboarding task generation,
 * per the brief's explicit instruction), and fires a "reminder_due"
 * notification (the type reserved for this since Phase 12) alongside it.
 */
export async function runDueRecurringTemplates() {
  return withAdminScope("Scheduled recurring template run", async (tx) => {
    const today = new Date().toISOString().slice(0, 10);
    const due = await tx
      .select()
      .from(recurringTemplates)
      .where(and(isNull(recurringTemplates.deletedAt), lte(recurringTemplates.nextDueDate, today)));

    let created = 0;
    for (const template of due) {
      await tx.insert(tasks).values({
        title: template.taskTitle,
        dueDate: template.nextDueDate,
        status: "not_started",
      });
      await tx.insert(notifications).values({
        type: "reminder_due",
        payload: { entityType: "recurring_template", entityId: template.id, name: template.name },
      });

      const next = advance(
        new Date(template.nextDueDate),
        template.interval,
        template.intervalDays ? Number(template.intervalDays) : null
      );
      await tx
        .update(recurringTemplates)
        .set({ nextDueDate: next.toISOString().slice(0, 10), updatedAt: new Date() })
        .where(eq(recurringTemplates.id, template.id));
      created++;
    }
    return { created };
  });
}
