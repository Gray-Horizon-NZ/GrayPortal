import "server-only";
import { tasks, deals } from "@/lib/db/schema";
import { and, isNull, ne } from "drizzle-orm";
import { withCaller } from "./auth";
import { listLatestHealthScores } from "./health";

/**
 * Phase 20 — read-only task prioritization (brief §16). Proposes an order,
 * never reassigns or reorders anything itself: readOnlyHint: true on the
 * MCP tool that wraps this (src/app/api/mcp/route.ts's prioritize_tasks).
 * If this ever gains the ability to actually reorder/reassign tasks, that
 * becomes a write action requiring the same prompt-before-execute pattern
 * every other risk-tiered MCP tool uses — not an extension of this
 * function.
 */
export async function prioritizeTasks() {
  return withCaller(async (_caller, tx) => {
    const openTasks = await tx
      .select()
      .from(tasks)
      .where(and(isNull(tasks.deletedAt), ne(tasks.status, "done")));

    const openDeals = await tx
      .select({ id: deals.id, stage: deals.stage, nextActionDate: deals.nextActionDate })
      .from(deals)
      .where(isNull(deals.deletedAt));
    const dealsById = new Map(openDeals.map((d) => [d.id, d]));

    const healthScores = await listLatestHealthScores();
    const decliningClientIds = new Set(healthScores.filter((h) => h.trend === "down").map((h) => h.clientId));

    const today = new Date().toISOString().slice(0, 10);

    const scored = openTasks.map((task) => {
      let score = 0;
      const reasons: string[] = [];

      if (task.dueDate && task.dueDate < today) {
        score += 100;
        reasons.push("overdue");
      }
      if (task.clientId && decliningClientIds.has(task.clientId)) {
        score += 50;
        reasons.push("linked to a client with a declining health score");
      }
      const deal = task.dealId ? dealsById.get(task.dealId) : undefined;
      if (deal && deal.nextActionDate < today) {
        score += 30;
        reasons.push("linked to a stalled deal");
      }
      if (task.dueDate) {
        const daysUntilDue = Math.round(
          (new Date(task.dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
        );
        score += Math.max(0, 20 - daysUntilDue); // closer due dates score slightly higher, secondary to the flags above
      }

      return { task, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(({ task, score, reasons }) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status,
      priorityScore: score,
      reasons,
    }));
  });
}
