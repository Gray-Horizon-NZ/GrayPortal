import "server-only";
import { and, eq, isNull, asc, desc } from "drizzle-orm";
import { z } from "zod";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  incrementumSettings,
  incrementumLaunchItems,
  incrementumPhases,
  incrementumPhaseCriteria,
  incrementumMilestones,
  incrementumGoals,
  incrementumExperiments,
  incrementumWeeklyReviews,
  incrementumPlaybooks,
  incrementumAdMonths,
  incrementumHomeLayouts,
  incrementumNextMoveDismissals,
  incrementumHours,
} from "@/lib/db/schema";
import { auditedInsert, auditedUpdate, auditedSoftDelete } from "../mutate";
import { withIncrementum, actor, nullable, numOrNull } from "./core";
import { createIncrementumTask } from "./tasks";
import {
  LAUNCH_GATES,
  LAUNCH_ITEM_STATUSES,
  METRIC_KEYS,
  EXPERIMENT_TYPES,
  EXPERIMENT_VERDICTS,
  HOME_SECTIONS,
  type HomeSectionKey,
} from "@/lib/incrementum/registry";
import { mondayOf } from "@/lib/incrementum/evaluate";
import { getIncrementumSnapshot } from "./snapshot";

const metricKey = z.enum(METRIC_KEYS as [string, ...string[]]).nullable();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

async function updateById(table: PgTable, entityType: string, id: string, values: Record<string, unknown>) {
  return withIncrementum(async (caller, tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;
    return auditedUpdate(tx, table, eq(t.id, id), id, { ...values, updatedBy: caller.userId }, { caller, entityType });
  });
}

async function softDeleteById(table: PgTable, entityType: string, id: string) {
  return withIncrementum(async (caller, tx) => auditedSoftDelete(tx, table, id, { caller, entityType }));
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
// Partial: only the keys a form sends are written, so each Settings view can
// save its own fields without resetting the others.
export const SettingsInput = z.object({
  defaultMarkupPct: z.string().nullable().optional(),
  freedomTarget: z.string().nullable().optional(),
  freedomGold: z.string().nullable().optional(),
  freedomDiamond: z.string().nullable().optional(),
  adBudgetTotal: z.string().nullable().optional(),
  responseTargetMinutes: z.coerce.number().int().min(1).max(10_000).optional(),
  defaultSlotsPerContractor: z.string().nullable().optional(),
  defaultRecruitDays: z.coerce.number().int().min(1).max(365).optional(),
  minBench: z.coerce.number().int().min(0).max(50).optional(),
  lowSlotsWarn: z.coerce.number().int().min(0).max(50).optional(),
  launchDate: isoDate.optional(),
  homeModeOverride: z.enum(["pre", "live"]).nullable().optional(),
});

export async function updateIncrementumSettings(input: z.input<typeof SettingsInput>) {
  const data = SettingsInput.parse(input);
  return withIncrementum(async (caller, tx) => {
    const [row] = await tx.select({ id: incrementumSettings.id }).from(incrementumSettings).where(eq(incrementumSettings.key, "singleton")).limit(1);
    const values: Record<string, unknown> = { updatedBy: caller.userId };
    for (const k of ["responseTargetMinutes", "defaultRecruitDays", "minBench", "lowSlotsWarn", "launchDate", "homeModeOverride"] as const) {
      if (data[k] !== undefined) values[k] = data[k];
    }
    for (const k of ["defaultMarkupPct", "freedomTarget", "freedomGold", "freedomDiamond", "adBudgetTotal", "defaultSlotsPerContractor"] as const) {
      const v = numOrNull(data[k]);
      if (v !== null) values[k] = v;
    }
    return auditedUpdate(tx, incrementumSettings, eq(incrementumSettings.id, row.id), row.id, values, { caller, entityType: "incrementum_settings" });
  });
}

/** ADS LIVE pop-up on the rail: set, change or clear the launch date. */
export async function setLaunchDate(date: string | null) {
  return updateIncrementumSettings({ launchDate: isoDate.parse(date) });
}

export async function saveCapacityThresholds(input: { defaultSlotsPerContractor: string | null; minBench: number | string; lowSlotsWarn: number | string; defaultRecruitDays: number | string }) {
  return updateIncrementumSettings({
    defaultSlotsPerContractor: input.defaultSlotsPerContractor,
    minBench: Number(input.minBench),
    lowSlotsWarn: Number(input.lowSlotsWarn),
    defaultRecruitDays: Number(input.defaultRecruitDays),
  });
}

// ---------------------------------------------------------------------------
// Launch checklist
// ---------------------------------------------------------------------------
export const LaunchItemInput = z.object({
  gate: z.enum(LAUNCH_GATES),
  title: z.string().min(1),
  detail: z.string().nullable(),
  critical: z.boolean(),
  dueDate: isoDate,
});

export async function createLaunchItem(input: z.input<typeof LaunchItemInput>) {
  const data = LaunchItemInput.parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumLaunchItems, { ...data, sortOrder: 9999, ...actor(caller) }, { caller, entityType: "incrementum_launch_item" })
  );
}

export const LaunchItemUpdate = z.object({
  status: z.enum(LAUNCH_ITEM_STATUSES).optional(),
  dueDate: isoDate.optional(),
  notes: z.string().nullable().optional(),
  evidenceUrl: z.string().nullable().optional(),
  naReason: z.string().nullable().optional(),
  critical: z.boolean().optional(),
  title: z.string().min(1).optional(),
});

export async function updateLaunchItem(id: string, input: z.input<typeof LaunchItemUpdate>) {
  const data = LaunchItemUpdate.parse(input);
  if (data.status === "na" && !data.naReason) {
    throw new Error("Give a reason when marking an item N/A.");
  }
  return withIncrementum(async (caller, tx) => {
    const [item] = await tx.select().from(incrementumLaunchItems).where(eq(incrementumLaunchItems.id, id)).limit(1);
    if (!item) throw new Error("Launch item not found");
    // Automatic items tick themselves from live data — they can't be ticked
    // by hand (plan §6.1: "so the checklist can't lie"). N/A is still allowed.
    if (item.metricKey && data.status === "done") throw new Error("This item ticks itself from live data and can't be marked done by hand.");
    return auditedUpdate(tx, incrementumLaunchItems, eq(incrementumLaunchItems.id, id), id, { ...data, updatedBy: caller.userId }, { caller, entityType: "incrementum_launch_item" });
  });
}

export async function deleteLaunchItem(id: string) {
  return softDeleteById(incrementumLaunchItems, "incrementum_launch_item", id);
}

/** "Make task": creates an Incrementum task (in a sub-list if given) linked back to the item. */
export async function makeTaskFromLaunchItem(id: string, listId: string | null) {
  const item = await withIncrementum(async (_c, tx) => {
    const [row] = await tx.select().from(incrementumLaunchItems).where(eq(incrementumLaunchItems.id, id)).limit(1);
    return row ?? null;
  });
  if (!item) throw new Error("Launch item not found");
  if (item.taskId) return item.taskId;
  const task = await createIncrementumTask({ title: item.title, dueDate: item.dueDate, listId });
  await updateById(incrementumLaunchItems, "incrementum_launch_item", id, { taskId: task.id, status: item.status === "not_started" ? "in_progress" : item.status });
  return task.id;
}

// ---------------------------------------------------------------------------
// Phases, criteria, milestones
// ---------------------------------------------------------------------------
export const PhaseUpdate = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().nullable().optional(),
  adBudget: z.string().nullable().optional(),
  services: z.string().nullable().optional(),
  clientMin: z.coerce.number().int().nullable().optional(),
  clientMax: z.coerce.number().int().nullable().optional(),
  contractorTarget: z.coerce.number().int().nullable().optional(),
  targetDate: isoDate.optional(),
  retro: z.string().nullable().optional(),
});

// A typed date pins a launch-relative row to that date; leaving it blank
// keeps it following the launch date (Settings).
function pinDate<T extends Record<string, unknown>>(data: T, field: keyof T): T & { launchOffsetDays?: null } {
  const out: Record<string, unknown> = { ...data };
  if (out[field as string]) out.launchOffsetDays = null;
  else delete out[field as string];
  return out as T & { launchOffsetDays?: null };
}

export async function updatePhase(id: string, input: z.input<typeof PhaseUpdate>) {
  return updateById(incrementumPhases, "incrementum_phase", id, pinDate(PhaseUpdate.parse(input), "targetDate"));
}

/**
 * Advancing is a deliberate act (plan §1.2): only when every exit
 * criterion holds, and it requires a retro, which is also filed in
 * Experiments so the phase's lessons sit with the change log.
 */
export async function advancePhase(phaseId: string, retro: string) {
  if (!retro.trim()) throw new Error("Write a short retro before advancing.");
  const snapshot = await getIncrementumSnapshot();
  const current = snapshot.phases.current;
  if (!current || current.id !== phaseId) throw new Error("That isn't the active phase.");
  if (!current.allMet) throw new Error("Not every exit criterion is met yet.");
  const next = snapshot.phases.next;
  return withIncrementum(async (caller, tx) => {
    const now = new Date();
    await auditedUpdate(tx, incrementumPhases, eq(incrementumPhases.id, current.id), current.id, { status: "done", exitedAt: now, retro, updatedBy: caller.userId }, { caller, entityType: "incrementum_phase" });
    await auditedInsert(tx, incrementumExperiments, { type: "retro", title: `Phase ${current.number} · ${current.name} retro`, body: retro, startedAt: now.toISOString().slice(0, 10), ...actor(caller) }, { caller, entityType: "incrementum_experiment" });
    if (next) {
      await auditedUpdate(tx, incrementumPhases, eq(incrementumPhases.id, next.id), next.id, { status: "active", enteredAt: now, updatedBy: caller.userId }, { caller, entityType: "incrementum_phase" });
    }
    return next?.id ?? null;
  });
}

export const CriterionInput = z.object({
  phaseId: z.string().uuid(),
  label: z.string().min(1),
  metricKey,
  comparator: z.enum(["gte", "lte"]),
  target: z.string().nullable(),
});

export async function createCriterion(input: z.input<typeof CriterionInput>) {
  const data = CriterionInput.parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumPhaseCriteria, { ...data, target: numOrNull(data.target), sortOrder: 999, ...actor(caller) }, { caller, entityType: "incrementum_phase_criterion" })
  );
}

export async function updateCriterion(id: string, input: { target?: string | null; label?: string; comparator?: "gte" | "lte" }) {
  const values: Record<string, unknown> = {};
  if (input.label !== undefined) values.label = input.label;
  if (input.comparator !== undefined) values.comparator = input.comparator;
  if (input.target !== undefined) values.target = numOrNull(input.target);
  return updateById(incrementumPhaseCriteria, "incrementum_phase_criterion", id, values);
}

export async function setCriterionManualDone(id: string, done: boolean) {
  return updateById(incrementumPhaseCriteria, "incrementum_phase_criterion", id, { manualDoneAt: done ? new Date() : null });
}

export async function deleteCriterion(id: string) {
  return softDeleteById(incrementumPhaseCriteria, "incrementum_phase_criterion", id);
}

export async function createMilestone(input: { phaseId: string | null; title: string; dueDate: string | null }) {
  const data = z.object({ phaseId: z.string().uuid().nullable(), title: z.string().min(1), dueDate: isoDate }).parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumMilestones, { ...data, sortOrder: 999, ...actor(caller) }, { caller, entityType: "incrementum_milestone" })
  );
}

export async function setMilestoneDone(id: string, done: boolean) {
  return updateById(incrementumMilestones, "incrementum_milestone", id, { doneAt: done ? new Date() : null });
}

export async function updateMilestone(id: string, input: { title?: string; dueDate?: string | null }) {
  return updateById(incrementumMilestones, "incrementum_milestone", id, pinDate(z.object({ title: z.string().min(1).optional(), dueDate: isoDate.optional() }).parse(input), "dueDate"));
}

export async function deleteMilestone(id: string) {
  return softDeleteById(incrementumMilestones, "incrementum_milestone", id);
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export const GoalInput = z.object({
  title: z.string().min(1),
  metricKey,
  comparator: z.enum(["gte", "lte"]),
  target: z.string().nullable(),
  periodStart: isoDate,
  periodEnd: isoDate,
  phaseId: z.string().uuid().nullable(),
});

export async function createGoal(input: z.input<typeof GoalInput>) {
  const data = GoalInput.parse(input);
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumGoals, { ...data, target: numOrNull(data.target), sortOrder: 999, ...actor(caller) }, { caller, entityType: "incrementum_goal" })
  );
}

export async function updateGoal(id: string, input: Partial<z.input<typeof GoalInput>>) {
  const data = GoalInput.partial().parse(input);
  const values: Record<string, unknown> = pinDate({ ...data }, "periodEnd");
  if (data.target !== undefined) values.target = numOrNull(data.target);
  if (!data.periodStart) delete values.periodStart;
  return updateById(incrementumGoals, "incrementum_goal", id, values);
}

export async function setGoalManualDone(id: string, done: boolean) {
  return updateById(incrementumGoals, "incrementum_goal", id, { manualDoneAt: done ? new Date() : null });
}

export async function deleteGoal(id: string) {
  return softDeleteById(incrementumGoals, "incrementum_goal", id);
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------
export const ExperimentInput = z.object({
  type: z.enum(EXPERIMENT_TYPES),
  title: z.string().min(1),
  body: z.string().nullable(),
  metricKey,
  passLine: z.string().nullable(),
  killLine: z.string().nullable(),
  startedAt: isoDate,
  endsAt: isoDate,
});

export async function createExperiment(input: z.input<typeof ExperimentInput>) {
  const data = ExperimentInput.parse(input);
  return withIncrementum(async (caller, tx) => auditedInsert(tx, incrementumExperiments, { ...data, ...actor(caller) }, { caller, entityType: "incrementum_experiment" }));
}

export async function recordExperimentResult(id: string, input: { result: string | null; verdict: string | null }) {
  const data = z.object({ result: z.string().nullable(), verdict: z.enum(EXPERIMENT_VERDICTS).nullable() }).parse(input);
  return updateById(incrementumExperiments, "incrementum_experiment", id, data);
}

export async function deleteExperiment(id: string) {
  return softDeleteById(incrementumExperiments, "incrementum_experiment", id);
}

// ---------------------------------------------------------------------------
// Weekly review (plan §8.1)
// ---------------------------------------------------------------------------
/**
 * Saves this week's review and turns each action line into a main-list
 * Incrementum task (so it shows in the Master Task View), due Friday.
 */
export async function completeWeeklyReview(input: { notes: string | null; wins: string | null; actions: string[] }) {
  const actions = input.actions.map((a) => a.trim()).filter(Boolean).slice(0, 5);
  const weekOf = mondayOf(new Date());
  const friday = new Date(`${weekOf}T00:00:00Z`);
  friday.setUTCDate(friday.getUTCDate() + 4);
  const fridayIso = friday.toISOString().slice(0, 10);
  const createdTaskTitles: string[] = [];
  for (const a of actions) {
    await createIncrementumTask({ title: a, dueDate: fridayIso, listId: null });
    createdTaskTitles.push(a);
  }
  return withIncrementum(async (caller, tx) => {
    const [existing] = await tx
      .select()
      .from(incrementumWeeklyReviews)
      .where(and(eq(incrementumWeeklyReviews.weekOf, weekOf), isNull(incrementumWeeklyReviews.deletedAt)))
      .limit(1);
    // Updating this week's review adds to the actions already committed.
    const values = { notes: input.notes, wins: input.wins, actions: [...(existing?.actions ?? []), ...createdTaskTitles], completedAt: new Date() };
    if (existing) {
      return auditedUpdate(tx, incrementumWeeklyReviews, eq(incrementumWeeklyReviews.id, existing.id), existing.id, { ...values, updatedBy: caller.userId }, { caller, entityType: "incrementum_weekly_review" });
    }
    return auditedInsert(tx, incrementumWeeklyReviews, { weekOf, ...values, ...actor(caller) }, { caller, entityType: "incrementum_weekly_review" });
  });
}

// ---------------------------------------------------------------------------
// Playbooks
// ---------------------------------------------------------------------------
export async function createPlaybook(input: { title: string; serviceId: string | null; body: string }) {
  const data = z.object({ title: z.string().min(1), serviceId: z.string().uuid().nullable(), body: z.string() }).parse(input);
  return withIncrementum(async (caller, tx) => auditedInsert(tx, incrementumPlaybooks, { ...data, ...actor(caller) }, { caller, entityType: "incrementum_playbook" }));
}

/** Each save bumps the version; audit_log keeps every previous body. */
export async function updatePlaybook(id: string, input: { title: string; body: string; serviceId: string | null }) {
  const data = z.object({ title: z.string().min(1), body: z.string(), serviceId: z.string().uuid().nullable() }).parse(input);
  return withIncrementum(async (caller, tx) => {
    const [row] = await tx.select().from(incrementumPlaybooks).where(eq(incrementumPlaybooks.id, id)).limit(1);
    if (!row) throw new Error("Playbook not found");
    const changed = row.body !== data.body || row.title !== data.title;
    return auditedUpdate(tx, incrementumPlaybooks, eq(incrementumPlaybooks.id, id), id, { ...data, version: changed ? row.version + 1 : row.version, updatedBy: caller.userId }, { caller, entityType: "incrementum_playbook" });
  });
}

export async function listPlaybooks() {
  return withIncrementum(async (_c, tx) =>
    tx.select().from(incrementumPlaybooks).where(isNull(incrementumPlaybooks.deletedAt)).orderBy(asc(incrementumPlaybooks.title))
  );
}

export async function getPlaybook(id: string) {
  return withIncrementum(async (_c, tx) => {
    const [row] = await tx.select().from(incrementumPlaybooks).where(and(eq(incrementumPlaybooks.id, id), isNull(incrementumPlaybooks.deletedAt))).limit(1);
    return row ?? null;
  });
}

export async function deletePlaybook(id: string) {
  return softDeleteById(incrementumPlaybooks, "incrementum_playbook", id);
}

// ---------------------------------------------------------------------------
// Ad figures (manual monthly entry, plan §7.10)
// ---------------------------------------------------------------------------
export async function upsertAdMonth(input: { month: string; spend: string | null; clicks: number; impressions: number; notes: string | null }) {
  const data = z
    .object({ month: z.string().regex(/^\d{4}-\d{2}$/), spend: z.string().nullable(), clicks: z.coerce.number().int().min(0), impressions: z.coerce.number().int().min(0), notes: z.string().nullable() })
    .parse(input);
  const month = `${data.month}-01`;
  return withIncrementum(async (caller, tx) => {
    const [existing] = await tx.select().from(incrementumAdMonths).where(and(eq(incrementumAdMonths.month, month), isNull(incrementumAdMonths.deletedAt))).limit(1);
    const values = { spend: numOrNull(data.spend) ?? "0", clicks: data.clicks, impressions: data.impressions, notes: data.notes };
    if (existing) {
      return auditedUpdate(tx, incrementumAdMonths, eq(incrementumAdMonths.id, existing.id), existing.id, { ...values, updatedBy: caller.userId }, { caller, entityType: "incrementum_ad_month" });
    }
    return auditedInsert(tx, incrementumAdMonths, { month, ...values, ...actor(caller) }, { caller, entityType: "incrementum_ad_month" });
  });
}

// ---------------------------------------------------------------------------
// Hours (Max's own from day one — plan §1.1's "is Max out of delivery?")
// ---------------------------------------------------------------------------
export async function logHours(input: { engagementId: string | null; workDate: string; hours: string; note: string | null }) {
  const data = z.object({ engagementId: z.string().uuid().nullable(), workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), hours: z.string(), note: z.string().nullable() }).parse(input);
  const hours = numOrNull(data.hours);
  if (hours === null || Number(hours) <= 0) throw new Error("Enter the hours as a number.");
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumHours, { ...data, hours, userId: caller.userId, ...actor(caller) }, { caller, entityType: "incrementum_hours" })
  );
}

export async function deleteHours(id: string) {
  return softDeleteById(incrementumHours, "incrementum_hours", id);
}

export async function listRecentHours(limit = 30) {
  return withIncrementum(async (_c, tx) =>
    tx.select().from(incrementumHours).where(isNull(incrementumHours.deletedAt)).orderBy(desc(incrementumHours.workDate)).limit(limit)
  );
}

// ---------------------------------------------------------------------------
// Home layout (per user, DB-backed so it follows Max across devices)
// ---------------------------------------------------------------------------
export async function getHomeLayout() {
  return withIncrementum(async (caller, tx) => {
    const [row] = await tx.select().from(incrementumHomeLayouts).where(and(eq(incrementumHomeLayouts.userId, caller.userId), isNull(incrementumHomeLayouts.deletedAt))).limit(1);
    return row?.widgets ?? null;
  });
}

export async function saveHomeLayout(widgets: { order: string[]; hidden: string[] } | null) {
  const valid = (k: string): k is HomeSectionKey => k in HOME_SECTIONS;
  return withIncrementum(async (caller, tx) => {
    const [row] = await tx.select().from(incrementumHomeLayouts).where(eq(incrementumHomeLayouts.userId, caller.userId)).limit(1);
    const clean = widgets ? { order: widgets.order.filter(valid), hidden: widgets.hidden.filter(valid) } : null;
    if (!row) {
      if (!clean) return null;
      return auditedInsert(tx, incrementumHomeLayouts, { userId: caller.userId, widgets: clean, ...actor(caller) }, { caller, entityType: "incrementum_home_layout" });
    }
    return auditedUpdate(
      tx,
      incrementumHomeLayouts,
      eq(incrementumHomeLayouts.id, row.id),
      row.id,
      clean ? { widgets: clean, deletedAt: null, updatedBy: caller.userId } : { deletedAt: new Date(), updatedBy: caller.userId },
      { caller, entityType: "incrementum_home_layout" }
    );
  });
}

// ---------------------------------------------------------------------------
// Recommended next moves — dismiss with a note
// ---------------------------------------------------------------------------
export async function dismissNextMove(moveKey: string, note: string | null) {
  return withIncrementum(async (caller, tx) =>
    auditedInsert(tx, incrementumNextMoveDismissals, { moveKey, note: nullable(note), ...actor(caller) }, { caller, entityType: "incrementum_next_move_dismissal" })
  );
}

