import "server-only";
import { after } from "next/server";
import { and, eq, isNull, ne, notInArray, sql } from "drizzle-orm";
import { tasks, incrementumLaunchItems } from "@/lib/db/schema";
import { auditedInsert, auditedUpdate } from "../mutate";
import type { Caller, Tx } from "../session";
import { withIncrementum, actor } from "./core";
import { syncIncrementumTask } from "./tasks";
import { INCREMENTUM_LIST_KEY, LAUNCH_GATES } from "@/lib/incrementum/registry";

/**
 * Launch readiness ↔ GrayPortal tasks (Max, 2026-10-24: "the launch list
 * isn't linked to GrayPortal, the Incrementum list remains empty").
 *
 * Every open, launch-critical, hand-ticked item in the CURRENT gate (the
 * first gate, P excluded, that still has one) gets a task on the Incrementum
 * main list, i.e. the gold Project Incrementum column in the Master Task
 * View, synced to Google Tasks. When that gate is finished the next gate's
 * items arrive on the next page load. Only the current gate, so the column
 * holds what's being worked on rather than ~80 items. "Make task" on the
 * launch page still pulls in any other item early.
 *
 * Automatic (⚙) items are skipped: they tick themselves from live data and
 * can't be ticked by hand, so a task for one would be a checkbox that lies.
 *
 * Status mirrors both ways at the point of change (launchLink.ts:
 * updateLaunchItem → the task, setTaskStatus → the item). This reconciler
 * only ever creates missing tasks. It never copies statuses, because it
 * can't tell which side changed last.
 */
const CLOSED = ["done", "na"];

export async function syncLaunchTasks(): Promise<void> {
  const created = await withIncrementum(async (caller, tx) => {
    const pending = await currentGateUnlinked(tx);
    if (!pending.length) return [];
    // Two pages loading at once (Home + the launch page) would otherwise
    // both see the same unlinked items. Serialise, then re-read.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('incrementum_launch_tasks'))`);
    const items = await currentGateUnlinked(tx);
    const out: (typeof tasks.$inferSelect)[] = [];
    for (const item of items) {
      const task = await insertLaunchTask(tx, caller, item);
      await auditedUpdate(
        tx,
        incrementumLaunchItems,
        eq(incrementumLaunchItems.id, item.id),
        item.id,
        { taskId: task.id, updatedBy: caller.userId },
        { caller, entityType: "incrementum_launch_item" }
      );
      out.push(task);
    }
    return out;
  });
  for (const task of created) after(() => syncIncrementumTask(task));
}

async function currentGateUnlinked(tx: Tx) {
  const open = await tx
    .select()
    .from(incrementumLaunchItems)
    .where(
      and(
        isNull(incrementumLaunchItems.deletedAt),
        isNull(incrementumLaunchItems.metricKey),
        eq(incrementumLaunchItems.critical, true),
        ne(incrementumLaunchItems.gate, "P"),
        notInArray(incrementumLaunchItems.status, CLOSED)
      )
    );
  const gate = LAUNCH_GATES.find((g) => open.some((i) => i.gate === g));
  return open.filter((i) => i.gate === gate && !i.taskId).sort((a, b) => a.sortOrder - b.sortOrder);
}

function insertLaunchTask(tx: Tx, caller: Caller, item: typeof incrementumLaunchItems.$inferSelect) {
  return auditedInsert<typeof tasks.$inferSelect>(
    tx,
    tasks,
    {
      internalList: INCREMENTUM_LIST_KEY,
      incrementumListId: null,
      title: item.title,
      dueDate: item.dueDate,
      status: item.status === "in_progress" || item.status === "blocked" ? "in_progress" : "not_started",
      assignedTo: caller.userId,
      ...actor(caller),
    },
    { caller, entityType: "task" }
  );
}
