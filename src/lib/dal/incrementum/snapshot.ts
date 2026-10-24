import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { syncLaunchTasks } from "./launchTasks";
import {
  incrementumSettings,
  incrementumServices,
  incrementumContractorServices,
  incrementumContractorProfiles,
  incrementumPackages,
  incrementumPackageServices,
  incrementumLeads,
  incrementumEngagements,
  incrementumEngagementContractors,
  incrementumEngagementCycles,
  incrementumAdMonths,
  incrementumHours,
  incrementumWeeklyReviews,
  incrementumLaunchItems,
  incrementumPhases,
  incrementumPhaseCriteria,
  incrementumMilestones,
  incrementumGoals,
  incrementumExperiments,
  incrementumTaskLists,
  incrementumNextMoveDismissals,
  incrementumNeeds,
  incrementumContractorRoles,
  incrementumStageEvents,
  contractors,
  clients,
  tasks,
  users,
  serviceItems,
} from "@/lib/db/schema";
import { withIncrementum } from "./core";
import { INCREMENTUM_LIST_KEY } from "@/lib/incrementum/registry";
import { todayNz } from "@/lib/incrementum/format";
import {
  computeServices,
  computePackages,
  computeMetrics,
  computeLaunch,
  computePhases,
  computeGoals,
  computeCapacity,
  computeDeadlines,
  computeAttention,
  computeNextMoves,
  computePath,
  resolveLaunchDates,
  type IncrementumState,
} from "@/lib/incrementum/compute";

/**
 * One read of everything Incrementum shows, in one admin-scoped
 * transaction, then the pure compute layer (src/lib/incrementum/compute.ts)
 * derives every number from it. Wrapped in React `cache` so every widget
 * and page section in a single request shares the same load — the data is
 * small (a solo agency's contractors/leads/engagements), so loading it
 * whole is cheaper and simpler than a query per widget.
 */
export const getIncrementumSnapshot = cache(async () => {
  // Launch items in the current gate become tasks before anything is read.
  await syncLaunchTasks().catch((err) => console.error("Incrementum launch → tasks sync failed", err));
  const state = await withIncrementum(async (_caller, tx) => {
    const notDeleted = isNull;
    const [settings] = await tx.select().from(incrementumSettings).where(eq(incrementumSettings.key, "singleton")).limit(1);
    const [
      services,
      catalogue,
      contractorServices,
      profileRows,
      packages,
      packageServices,
      leads,
      engagementRows,
      engagementContractors,
      cycles,
      adMonths,
      hours,
      admins,
      reviews,
      launchItems,
      phases,
      criteria,
      milestones,
      goals,
      experiments,
      taskLists,
      taskRows,
      dismissals,
      needs,
      roles,
      packageEvents,
    ] = await Promise.all([
      tx.select().from(incrementumServices).where(notDeleted(incrementumServices.deletedAt)).orderBy(asc(incrementumServices.sortOrder), asc(incrementumServices.createdAt)),
      tx
        .select({
          id: serviceItems.id,
          moduleCode: serviceItems.moduleCode,
          deliverable: serviceItems.deliverable,
          isRecurring: serviceItems.isRecurring,
          currentMonthlyPrice: serviceItems.currentMonthlyPrice,
          currentSetupPrice: serviceItems.currentSetupPrice,
          priceText: serviceItems.priceText,
        })
        .from(serviceItems)
        .where(notDeleted(serviceItems.deletedAt)),
      tx.select().from(incrementumContractorServices).where(notDeleted(incrementumContractorServices.deletedAt)),
      tx
        .select({ profile: incrementumContractorProfiles, name: contractors.name, specialty: contractors.specialty })
        .from(incrementumContractorProfiles)
        .innerJoin(contractors, eq(incrementumContractorProfiles.contractorId, contractors.id))
        .where(and(notDeleted(incrementumContractorProfiles.deletedAt), notDeleted(contractors.deletedAt))),
      tx.select().from(incrementumPackages).where(notDeleted(incrementumPackages.deletedAt)),
      tx.select().from(incrementumPackageServices).where(notDeleted(incrementumPackageServices.deletedAt)),
      tx.select().from(incrementumLeads).where(notDeleted(incrementumLeads.deletedAt)).orderBy(desc(incrementumLeads.receivedAt)),
      tx
        .select({ engagement: incrementumEngagements, clientName: clients.name })
        .from(incrementumEngagements)
        .leftJoin(clients, eq(incrementumEngagements.clientId, clients.id))
        .where(notDeleted(incrementumEngagements.deletedAt)),
      tx.select().from(incrementumEngagementContractors).where(notDeleted(incrementumEngagementContractors.deletedAt)),
      tx.select().from(incrementumEngagementCycles).where(notDeleted(incrementumEngagementCycles.deletedAt)).orderBy(desc(incrementumEngagementCycles.month)),
      tx.select().from(incrementumAdMonths).where(notDeleted(incrementumAdMonths.deletedAt)).orderBy(asc(incrementumAdMonths.month)),
      tx.select().from(incrementumHours).where(notDeleted(incrementumHours.deletedAt)),
      tx.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), notDeleted(users.deletedAt))),
      tx.select().from(incrementumWeeklyReviews).where(notDeleted(incrementumWeeklyReviews.deletedAt)).orderBy(desc(incrementumWeeklyReviews.weekOf)),
      tx.select().from(incrementumLaunchItems).where(notDeleted(incrementumLaunchItems.deletedAt)),
      tx.select().from(incrementumPhases).where(notDeleted(incrementumPhases.deletedAt)),
      tx.select().from(incrementumPhaseCriteria).where(notDeleted(incrementumPhaseCriteria.deletedAt)),
      tx.select().from(incrementumMilestones).where(notDeleted(incrementumMilestones.deletedAt)),
      tx.select().from(incrementumGoals).where(notDeleted(incrementumGoals.deletedAt)),
      tx.select().from(incrementumExperiments).where(notDeleted(incrementumExperiments.deletedAt)).orderBy(desc(incrementumExperiments.createdAt)),
      tx.select().from(incrementumTaskLists).where(notDeleted(incrementumTaskLists.deletedAt)).orderBy(asc(incrementumTaskLists.sortOrder)),
      tx
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          dueDate: tasks.dueDate,
          priority: tasks.priority,
          incrementumListId: tasks.incrementumListId,
          assignedTo: tasks.assignedTo,
          createdAt: tasks.createdAt,
        })
        .from(tasks)
        .where(and(eq(tasks.internalList, INCREMENTUM_LIST_KEY), notDeleted(tasks.deletedAt)))
        .orderBy(desc(tasks.createdAt)),
      tx.select({ moveKey: incrementumNextMoveDismissals.moveKey }).from(incrementumNextMoveDismissals).where(notDeleted(incrementumNextMoveDismissals.deletedAt)),
      tx.select().from(incrementumNeeds).where(notDeleted(incrementumNeeds.deletedAt)).orderBy(asc(incrementumNeeds.sortOrder), asc(incrementumNeeds.createdAt)),
      tx.select().from(incrementumContractorRoles).where(notDeleted(incrementumContractorRoles.deletedAt)).orderBy(asc(incrementumContractorRoles.sortOrder)),
      tx
        .select({ entityId: incrementumStageEvents.entityId, fromStage: incrementumStageEvents.fromStage, toStage: incrementumStageEvents.toStage })
        .from(incrementumStageEvents)
        .where(and(eq(incrementumStageEvents.entityType, "engagement_package"), notDeleted(incrementumStageEvents.deletedAt))),
    ]);

    // Is db/sql/031 (contractor lockdown + views) applied? Onboarding a
    // contractor login is only allowed once it is.
    const lockdown = await tx.execute(sql`select to_regclass('public.contractor_me') is not null as ok`);
    const contractorLockdownApplied = Boolean((lockdown as unknown as { rows: { ok: boolean }[] }).rows[0]?.ok);

    const s: IncrementumState = {
      today: todayNz(),
      now: new Date(),
      settings,
      services,
      catalogue,
      roles,
      contractorServices,
      profiles: profileRows.map((r) => ({ ...r.profile, name: r.name, specialty: r.specialty })),
      packages,
      packageServices,
      leads,
      engagements: engagementRows.map((r) => ({ ...r.engagement, clientName: r.clientName })),
      engagementContractors,
      cycles,
      adMonths,
      hours,
      adminUserIds: admins.map((a) => a.id),
      reviews,
      launchItems,
      phases,
      criteria,
      milestones,
      goals,
      experiments,
      taskLists,
      tasks: taskRows,
      needs,
      contractorLockdownApplied,
      dismissedMoves: dismissals.map((d) => d.moveKey),
      packageEvents,
    };
    return resolveLaunchDates(s);
  });

  const services = computeServices(state);
  const packages = computePackages(state, services);
  const metrics = computeMetrics(state, services, packages);
  const launch = computeLaunch(state, metrics);
  const phases = computePhases(state, metrics);
  const goals = computeGoals(state, metrics);
  const capacity = computeCapacity(state, services, packages, phases.next);
  const deadlines = computeDeadlines(state, launch, goals, capacity);
  const attention = computeAttention(state, goals);
  const path = { base: computePath(state, metrics, "base"), stretch: computePath(state, metrics, "stretch") };
  // The biggest lever is measured against the stretch pace: effort aims there.
  const nextMoves = computeNextMoves(state, metrics, phases, capacity, path.stretch);
  const mode: "pre" | "live" =
    state.settings.homeModeOverride === "pre" || state.settings.homeModeOverride === "live"
      ? state.settings.homeModeOverride
      : state.settings.launchDate && state.settings.launchDate <= state.today
        ? "live"
        : "pre";

  return { state, services, packages, metrics, launch, phases, goals, capacity, deadlines, attention, nextMoves, path, mode };
});

export type IncrementumSnapshot = Awaited<ReturnType<typeof getIncrementumSnapshot>>;
