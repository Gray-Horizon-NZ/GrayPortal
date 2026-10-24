import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { incrementumLaunchItems } from "@/lib/db/schema";
import { auditedUpdate } from "../mutate";
import type { Caller, Tx } from "../session";

// The two status mirrors between a launch item and its task (see
// launchTasks.ts). No imports from the task DALs, so dal/tasks.ts can use
// this without an import cycle.
const CLOSED = ["done", "na"];

/** Launch item status → its task's status. done and N/A both close the task. */
export function launchStatusToTask(status: string): "done" | "in_progress" | "not_started" {
  if (status === "done" || status === "na") return "done";
  if (status === "in_progress" || status === "blocked") return "in_progress";
  return "not_started";
}

/**
 * A linked task was ticked or reopened (Master Task View, Home, Incrementum
 * Tasks, the MCP): carry it to the launch item in the same
 * transaction. Ticking closes the item; reopening a task only reopens an
 * item that was done (N/A and Blocked are left alone). Automatic items
 * ignore it, same rule as the launch page.
 */
export async function mirrorTaskToLaunchItem(tx: Tx, caller: Caller, taskId: string, taskStatus: string) {
  const [item] = await tx
    .select()
    .from(incrementumLaunchItems)
    .where(and(eq(incrementumLaunchItems.taskId, taskId), isNull(incrementumLaunchItems.deletedAt), isNull(incrementumLaunchItems.metricKey)))
    .limit(1);
  if (!item) return;
  let next: string | null = null;
  if (taskStatus === "done") next = CLOSED.includes(item.status) ? null : "done";
  else if (item.status === "done") next = taskStatus === "not_started" ? "not_started" : "in_progress";
  if (!next) return;
  await auditedUpdate(
    tx,
    incrementumLaunchItems,
    eq(incrementumLaunchItems.id, item.id),
    item.id,
    { status: next, updatedBy: caller.userId },
    { caller, entityType: "incrementum_launch_item" }
  );
}
