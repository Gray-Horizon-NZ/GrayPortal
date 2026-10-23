import "server-only";
import { inArray } from "drizzle-orm";
import {
  incrementumSettings,
  incrementumLaunchItems,
  incrementumPhases,
  incrementumPhaseCriteria,
  incrementumMilestones,
  incrementumGoals,
  incrementumTaskLists,
  incrementumServices,
  incrementumPackages,
  incrementumPackageServices,
  incrementumExperiments,
  incrementumPlaybooks,
  serviceItems,
} from "@/lib/db/schema";
import type { Caller, Tx } from "../session";
import {
  LAUNCH_SEED,
  PHASE_SEED,
  GOAL_SEED,
  TASK_LIST_SEED,
  SERVICE_SEED,
  PACKAGE_SEED,
  EXPERIMENT_SEED,
  PLAYBOOK_TEMPLATE,
  WELCOME_PACK_TEMPLATE,
} from "@/lib/incrementum/seeds";

/**
 * First-run seed (launch checklist, growth phases, goals, task sub-lists,
 * launch services/packages, proof tests, playbook templates), transcribed
 * from docs/Project-Incrementum-Plan.md. Keyed off the settings singleton:
 * the INSERT … ON CONFLICT DO NOTHING on its unique key is what makes this
 * safe under concurrent first loads — a second transaction blocks on the
 * conflict until the first commits, then inserts nothing and skips seeding.
 * Runs once; everything it creates is editable afterwards. Plain inserts
 * (no per-row audit rows): this is a one-time system bootstrap, not a user
 * edit, same reasoning as scripts/seed.mjs.
 */
export async function ensureIncrementumSeeded(tx: Tx, caller: Caller): Promise<void> {
  const created = await tx
    .insert(incrementumSettings)
    .values({ key: "singleton", seededAt: new Date(), createdBy: caller.userId, updatedBy: caller.userId })
    .onConflictDoNothing({ target: incrementumSettings.key })
    .returning({ id: incrementumSettings.id });
  if (created.length === 0) return;

  const by = { createdBy: caller.userId, updatedBy: caller.userId };

  // Launch checklist
  await tx.insert(incrementumLaunchItems).values(
    LAUNCH_SEED.map((item, i) => ({
      gate: item.gate,
      title: item.title,
      detail: item.detail ?? null,
      critical: item.critical ?? true,
      metricKey: item.metricKey ?? null,
      metricTarget: item.metricTarget !== undefined ? String(item.metricTarget) : null,
      sortOrder: i,
      ...by,
    }))
  );

  // Growth phases + criteria + milestones
  const phaseIdByNumber = new Map<number, string>();
  for (const p of PHASE_SEED) {
    const [phase] = await tx
      .insert(incrementumPhases)
      .values({
        number: p.number,
        name: p.name,
        purpose: p.purpose,
        adBudget: p.adBudget,
        services: p.services,
        clientMin: p.clientMin,
        clientMax: p.clientMax,
        contractorTarget: p.contractorTarget,
        launchOffsetDays: p.launchOffsetDays,
        status: p.number === 0 ? "active" : "upcoming",
        enteredAt: p.number === 0 ? new Date() : null,
        ...by,
      })
      .returning({ id: incrementumPhases.id });
    phaseIdByNumber.set(p.number, phase.id);
    if (p.criteria.length) {
      await tx.insert(incrementumPhaseCriteria).values(
        p.criteria.map((c, i) => ({
          phaseId: phase.id,
          label: c.label,
          metricKey: c.metricKey ?? null,
          comparator: c.comparator ?? "gte",
          target: c.target !== undefined ? String(c.target) : null,
          sortOrder: i,
          ...by,
        }))
      );
    }
    if (p.milestones.length) {
      await tx.insert(incrementumMilestones).values(
        p.milestones.map((m, i) => ({ phaseId: phase.id, title: m.title, dueDate: m.dueDate ?? null, launchOffsetDays: m.launchOffsetDays ?? null, sortOrder: i, ...by }))
      );
    }
  }

  // Goals
  await tx.insert(incrementumGoals).values(
    GOAL_SEED.map((g, i) => ({
      title: g.title,
      metricKey: g.metricKey ?? null,
      comparator: g.comparator ?? "gte",
      target: g.target !== undefined ? String(g.target) : null,
      periodStart: g.periodStart ?? null,
      periodEnd: g.periodEnd ?? null,
      launchOffsetDays: g.launchOffsetDays ?? null,
      isFreedom: g.isFreedom ?? false,
      isStretch: g.isStretch ?? false,
      phaseId: g.phaseNumber !== undefined ? (phaseIdByNumber.get(g.phaseNumber) ?? null) : null,
      sortOrder: i,
      ...by,
    }))
  );

  // Task sub-lists
  await tx.insert(incrementumTaskLists).values(TASK_LIST_SEED.map((name, i) => ({ name, sortOrder: i, ...by })));

  // Services — only link catalogue ids that actually exist (FK), else leave unlinked.
  const wantedIds = SERVICE_SEED.map((s) => s.serviceItemId).filter((x): x is string => !!x);
  const existing = wantedIds.length
    ? await tx.select({ id: serviceItems.id }).from(serviceItems).where(inArray(serviceItems.id, wantedIds))
    : [];
  const existingIds = new Set(existing.map((r) => r.id));
  const serviceIdByKey = new Map<string, string>();
  for (const [i, s] of SERVICE_SEED.entries()) {
    const [row] = await tx
      .insert(incrementumServices)
      .values({
        serviceItemId: s.serviceItemId && existingIds.has(s.serviceItemId) ? s.serviceItemId : null,
        name: s.name,
        billing: s.billing,
        expectedQuote: s.expectedQuote !== null ? String(s.expectedQuote) : null,
        usuallyWaived: s.usuallyWaived ?? false,
        ranges: s.ranges ?? null,
        tags: s.tags ?? null,
        notes: s.notes ?? null,
        sortOrder: i,
        ...by,
      })
      .returning({ id: incrementumServices.id });
    serviceIdByKey.set(s.key, row.id);
  }

  // Packages
  for (const [i, p] of PACKAGE_SEED.entries()) {
    const [pkg] = await tx
      .insert(incrementumPackages)
      .values({ name: p.name, description: p.description, status: p.status, sortOrder: i, ...by })
      .returning({ id: incrementumPackages.id });
    const lines = [
      ...p.recurring.map((key) => ({ key, kind: "recurring", waived: false })),
      ...p.setup.map((s) => ({ key: s.key, kind: "setup", waived: s.waived ?? false })),
    ].filter((l) => serviceIdByKey.has(l.key));
    if (lines.length) {
      await tx.insert(incrementumPackageServices).values(
        lines.map((l) => ({ packageId: pkg.id, serviceId: serviceIdByKey.get(l.key)!, kind: l.kind, waived: l.waived, ...by }))
      );
    }
  }

  // Proof tests (plan §1.1)
  await tx.insert(incrementumExperiments).values(
    EXPERIMENT_SEED.map((e) => ({ type: "test", title: e.title, body: e.body, metricKey: e.metricKey, passLine: e.passLine, killLine: e.killLine, ...by }))
  );

  // Playbook templates — empty structure for the launch services + the welcome pack.
  await tx.insert(incrementumPlaybooks).values([
    { serviceId: serviceIdByKey.get("google_ads") ?? null, title: "Google Ads Management playbook", body: PLAYBOOK_TEMPLATE, ...by },
    { serviceId: serviceIdByKey.get("website_mgmt") ?? null, title: "Website Management playbook", body: PLAYBOOK_TEMPLATE, ...by },
    { serviceId: null, title: "Contractor welcome pack", body: WELCOME_PACK_TEMPLATE, ...by },
  ]);
}
