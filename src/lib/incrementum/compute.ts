// The Incrementum "brain": turns the raw rows loaded by
// dal/incrementum/snapshot.ts into every derived number the space shows —
// metrics, service prices, package totals, launch readiness, phase
// progress, goal pace, capacity, deadlines, needs-attention and the
// Recommended next moves. Pure (no DB, no server-only) so the rules are
// unit-testable and one load per request feeds every widget.
import type {
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
  incrementumNeeds,
  incrementumContractorRoles,
  tasks,
  serviceItems,
} from "@/lib/db/schema";
import {
  BENCH_STAGES,
  QUALIFIED_LEAD_STAGES,
  METRICS,
  isMetricKey,
  type MetricKey,
  type QuoteBasis,
  type ContractorStage,
  QUOTE_BASES,
} from "./registry";
import { computePackageTotals, computeServicePrice, recurringBundleDiscountPct, setupBundleDiscountPct, toNum, type PackageTotals, type PriceBreakdown } from "./pricing";
import {
  criterionMet,
  goalStatus,
  meets,
  monthsBetween,
  progressFraction,
  reviewStreak,
  serviceCapacity,
  contractorsNeeded,
  recruitByDate,
  mondayOf,
  type GoalStatus,
  type ServiceCapacity,
} from "./evaluate";
import { money } from "./format";

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];

export type IncrementumState = {
  today: string; // ISO date, Pacific/Auckland
  now: Date;
  settings: Row<typeof incrementumSettings>;
  services: Row<typeof incrementumServices>[];
  catalogue: Pick<Row<typeof serviceItems>, "id" | "moduleCode" | "deliverable" | "isRecurring" | "currentMonthlyPrice" | "currentSetupPrice" | "priceText">[];
  roles: Row<typeof incrementumContractorRoles>[];
  contractorServices: Row<typeof incrementumContractorServices>[];
  profiles: (Row<typeof incrementumContractorProfiles> & { name: string; specialty: string | null })[];
  packages: Row<typeof incrementumPackages>[];
  packageServices: Row<typeof incrementumPackageServices>[];
  leads: Row<typeof incrementumLeads>[];
  engagements: (Row<typeof incrementumEngagements> & { clientName: string | null })[];
  engagementContractors: Row<typeof incrementumEngagementContractors>[];
  cycles: Row<typeof incrementumEngagementCycles>[];
  adMonths: Row<typeof incrementumAdMonths>[];
  hours: Row<typeof incrementumHours>[];
  adminUserIds: string[];
  reviews: Row<typeof incrementumWeeklyReviews>[];
  launchItems: Row<typeof incrementumLaunchItems>[];
  phases: Row<typeof incrementumPhases>[];
  criteria: Row<typeof incrementumPhaseCriteria>[];
  milestones: Row<typeof incrementumMilestones>[];
  goals: Row<typeof incrementumGoals>[];
  experiments: Row<typeof incrementumExperiments>[];
  taskLists: Row<typeof incrementumTaskLists>[];
  tasks: Pick<Row<typeof tasks>, "id" | "title" | "status" | "dueDate" | "priority" | "incrementumListId" | "assignedTo" | "createdAt">[];
  needs: Row<typeof incrementumNeeds>[];
  /** db/sql/031 applied (contractor_* views exist) — gates contractor onboarding. */
  contractorLockdownApplied?: boolean;
  dismissedMoves: string[];
};

/**
 * Launch-relative dates (phases' targets, milestones, goals with a
 * launchOffsetDays) resolve to launch date + offset once Max sets the
 * launch date in Settings, and stay null ("TBD") until then, so nothing is
 * pinned to a guessed go-live day.
 */
export function resolveLaunchDates(state: IncrementumState): IncrementumState {
  const launch = state.settings.launchDate;
  const at = (offset: number) => (launch ? addDaysIso(launch, offset) : null);
  return {
    ...state,
    phases: state.phases.map((p) => (p.launchOffsetDays !== null && p.launchOffsetDays !== undefined ? { ...p, targetDate: at(p.launchOffsetDays) } : p)),
    milestones: state.milestones.map((m) => (m.launchOffsetDays !== null && m.launchOffsetDays !== undefined ? { ...m, dueDate: at(m.launchOffsetDays) } : m)),
    goals: state.goals.map((g) =>
      g.launchOffsetDays !== null && g.launchOffsetDays !== undefined ? { ...g, periodStart: g.periodStart ?? launch, periodEnd: at(g.launchOffsetDays) } : g
    ),
  };
}

/** True when a row's date waits on the launch date being set. */
export function awaitingLaunch(state: IncrementumState, row: { launchOffsetDays: number | null }): boolean {
  return row.launchOffsetDays !== null && !state.settings.launchDate;
}

const n = (v: string | number | null | undefined) => toNum(v) ?? 0;
const isBench = (stage: string) => BENCH_STAGES.includes(stage as ContractorStage);
const monthStartIso = (iso: string) => `${iso.slice(0, 7)}-01`;

function monthEndIso(monthIso: string): string {
  const d = new Date(`${monthIso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Services & packages
// ---------------------------------------------------------------------------
export type ServiceView = Row<typeof incrementumServices> & {
  catalogueName: string | null;
  cataloguePriceText: string | null;
  benchQuotes: { contractorId: string; name: string; rate: number; rateType: string }[];
  price: PriceBreakdown;
  effectiveMarkupPct: number;
};

export function computeServices(state: IncrementumState): ServiceView[] {
  const defaultMarkup = n(state.settings.defaultMarkupPct);
  const profileByContractor = new Map(state.profiles.map((p) => [p.contractorId, p]));
  const catalogueById = new Map(state.catalogue.map((c) => [c.id, c]));
  return state.services
    .filter((s) => !s.deletedAt)
    .map((s) => {
      const cat = s.serviceItemId ? catalogueById.get(s.serviceItemId) : undefined;
      const cataloguePrice = cat ? toNum(s.billing === "monthly" ? cat.currentMonthlyPrice : cat.currentSetupPrice) : null;
      const benchQuotes = state.contractorServices
        .filter((cs) => cs.serviceId === s.id && !cs.deletedAt && cs.rate !== null)
        .map((cs) => ({ cs, profile: profileByContractor.get(cs.contractorId) }))
        .filter(({ profile }) => profile && !profile.deletedAt && isBench(profile.stage))
        .map(({ cs, profile }) => ({ contractorId: cs.contractorId, name: profile!.name, rate: n(cs.rate), rateType: cs.rateType }));
      const markup = toNum(s.markupPct) ?? defaultMarkup;
      const basis = (QUOTE_BASES as readonly string[]).includes(s.quoteBasis) ? (s.quoteBasis as QuoteBasis) : "highest";
      const price = computeServicePrice({
        basis,
        benchQuotes: benchQuotes.filter((q) => q.rateType === (s.billing === "monthly" ? "monthly" : q.rateType)).map((q) => q.rate),
        expectedQuote: toNum(s.expectedQuote),
        markupPct: markup,
        catalogueFloor: s.catalogueFloor,
        cataloguePrice,
        manualPrice: toNum(s.manualPrice),
      });
      return {
        ...s,
        catalogueName: cat?.deliverable ?? null,
        cataloguePriceText: cat?.priceText ?? null,
        benchQuotes,
        price,
        effectiveMarkupPct: markup,
      };
    });
}

export type PackageView = Row<typeof incrementumPackages> & {
  lines: { id: string; serviceId: string; name: string; kind: "recurring" | "setup"; waived: boolean; sellPrice: number | null; quote: number | null }[];
  totals: PackageTotals;
  calculated: PackageTotals;
  priceOverridden: boolean;
};

export function computePackages(state: IncrementumState, services: ServiceView[]): PackageView[] {
  const serviceById = new Map(services.map((s) => [s.id, s]));
  return state.packages
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => {
      const lines = state.packageServices
        .filter((ps) => ps.packageId === p.id && !ps.deletedAt && serviceById.has(ps.serviceId))
        .map((ps) => {
          const s = serviceById.get(ps.serviceId)!;
          return {
            id: ps.id,
            serviceId: ps.serviceId,
            name: s.name,
            kind: (ps.kind === "setup" ? "setup" : "recurring") as "recurring" | "setup",
            waived: ps.waived,
            sellPrice: s.price.sellPrice,
            quote: s.price.quote,
          };
        });
      const calc = computePackageTotals(lines);
      // Hand-set package prices win over the calculated ones (every price is adjustable).
      const manualMonthly = toNum(p.manualMonthlyPrice);
      const manualSetup = toNum(p.manualSetupPrice);
      const monthlyPrice = manualMonthly ?? calc.monthlyPrice;
      const monthlyProfit = Math.round((monthlyPrice - calc.monthlyCost) * 100) / 100;
      const totals: PackageTotals = {
        ...calc,
        monthlyPrice,
        monthlyProfit,
        marginPct: monthlyPrice > 0 ? Math.round((monthlyProfit / monthlyPrice) * 10000) / 100 : null,
        markupPct: calc.monthlyCost > 0 ? Math.round((monthlyProfit / calc.monthlyCost) * 10000) / 100 : null,
        setupPrice: manualSetup ?? calc.setupPrice,
      };
      return { ...p, lines, totals, calculated: calc, priceOverridden: manualMonthly !== null || manualSetup !== null };
    });
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
export type Metrics = Record<MetricKey, number | null>;

export function computeMetrics(state: IncrementumState, services: ServiceView[], packages: PackageView[]): Metrics {
  const today = state.today;
  const profiles = state.profiles.filter((p) => !p.deletedAt);
  const bench = profiles.filter((p) => isBench(p.stage));
  const benchIds = new Set(bench.map((p) => p.contractorId));

  const benchByService = new Map<string, Set<string>>();
  for (const cs of state.contractorServices) {
    if (cs.deletedAt || !benchIds.has(cs.contractorId)) continue;
    if (!benchByService.has(cs.serviceId)) benchByService.set(cs.serviceId, new Set());
    benchByService.get(cs.serviceId)!.add(cs.contractorId);
  }
  const benchCounts = services.filter((s) => s.status === "active").map((s) => benchByService.get(s.id)?.size ?? 0);

  const engagements = state.engagements.filter((e) => !e.deletedAt);
  const active = engagements.filter((e) => e.status === "active");
  const activeIds = new Set(active.map((e) => e.id));

  // Live services: in a live package, else in a package an active engagement uses.
  const livePackageIds = new Set(
    packages.filter((p) => p.status === "live").map((p) => p.id).concat(active.map((e) => e.packageId).filter((x): x is string => !!x))
  );
  const liveServiceIds = new Set(
    packages.filter((p) => livePackageIds.has(p.id)).flatMap((p) => p.lines.filter((l) => l.kind === "recurring").map((l) => l.serviceId))
  );
  const liveBench = [...liveServiceIds].map((id) => benchByService.get(id)?.size ?? 0);

  const cycles = state.cycles.filter((c) => !c.deletedAt);
  const leads = state.leads.filter((l) => !l.deletedAt);
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const paidClients = new Set(
    active.filter((e) => cycles.some((c) => c.engagementId === e.id && c.clientPaidAt)).map((e) => e.clientId)
  );
  const adsClients = new Set(
    active
      .filter((e) => {
        const lead = e.leadId ? leadById.get(e.leadId) : undefined;
        return lead && (lead.source === "google_ads" || lead.source === "meta_ads");
      })
      .map((e) => e.clientId)
  );

  const stays = engagements
    .filter((e) => e.startDate)
    .map((e) => monthsBetween(e.startDate!, e.status === "ended" && e.endedAt ? e.endedAt : today));
  const ninetyAgo = addDaysIso(today, -90);
  const lost90 = engagements.filter((e) => e.status === "ended" && e.endedAt && e.endedAt >= ninetyAgo).length;

  const mrr = active.reduce((a, e) => a + n(e.monthlyPrice), 0);
  const contractorCost = state.engagementContractors
    .filter((ec) => !ec.deletedAt && activeIds.has(ec.engagementId))
    .reduce((a, ec) => a + n(ec.monthlyCost), 0);
  const adMonths = state.adMonths.filter((m) => !m.deletedAt);
  const thisMonthSpend = n(adMonths.find((m) => m.month === monthStartIso(today))?.spend);
  const spendTotal = adMonths.reduce((a, m) => a + n(m.spend), 0);
  const clicksTotal = adMonths.reduce((a, m) => a + (m.clicks ?? 0), 0);

  const activeClientCount = new Set(active.map((e) => e.clientId)).size;
  const grossProfit = mrr - contractorCost;

  const qualified = leads.filter((l) => QUALIFIED_LEAD_STAGES.includes(l.stage as never) || l.convertedClientId);
  const won = leads.filter((l) => l.stage === "won" || l.convertedClientId);
  const adsLeads = leads.filter((l) => l.source === "google_ads" || l.source === "meta_ads");
  const responded = leads.filter((l) => l.firstResponseAt);
  const responseMins = responded.map((l) => (new Date(l.firstResponseAt!).getTime() - new Date(l.receivedAt).getTime()) / 60_000);

  const sixtyAgo = addDaysIso(today, -60);
  const adminSet = new Set(state.adminUserIds);
  const maxHours = state.hours
    .filter((h) => !h.deletedAt && h.workDate >= sixtyAgo && h.userId && adminSet.has(h.userId))
    .reduce((a, h) => a + n(h.hours), 0);

  let payoutOnTime = 0;
  let payoutLate = 0;
  for (const c of cycles) {
    if (!c.payoutDueAt) continue;
    if (c.payoutPaidAt) {
      if (c.payoutPaidAt <= c.payoutDueAt) payoutOnTime++;
      else payoutLate++;
    } else if (c.payoutDueAt < today) payoutLate++;
  }
  let deliveredOnTime = 0;
  let deliveredDue = 0;
  for (const c of cycles) {
    const end = monthEndIso(c.month);
    if (end >= today) continue;
    deliveredDue++;
    if (c.deliveredAt && c.deliveredAt <= end) deliveredOnTime++;
  }

  const paidIn = cycles.filter((c) => c.clientPaidAt).reduce((a, c) => a + n(c.invoiceAmount), 0);
  const paidOut = cycles.filter((c) => c.payoutPaidAt).reduce((a, c) => a + n(c.payoutAmount), 0);

  const m: Metrics = {
    contractors_sourced: profiles.filter((p) => p.stage !== "not_a_fit").length,
    contractors_confirmed: bench.length,
    contractors_onboarded: profiles.filter((p) => p.stage === "onboarded").length,
    confirmed_with_agreements: bench.filter((p) => p.payWhenPaidAcceptedAt && p.nonSolicitSignedAt).length,
    bench_top_service: benchCounts.length ? Math.max(...benchCounts) : 0,
    bench_weakest_live: liveBench.length ? Math.min(...liveBench) : null,
    active_clients: activeClientCount,
    paying_clients: paidClients.size,
    ads_clients: adsClients.size,
    max_months_retained: stays.length ? Math.max(...stays) : 0,
    avg_months_retained: stays.length ? stays.reduce((a, b) => a + b, 0) / stays.length : null,
    clients_lost_90d: lost90,
    mrr,
    monthly_contractor_cost: contractorCost,
    monthly_profit: grossProfit - thisMonthSpend,
    avg_profit_per_client: activeClientCount ? grossProfit / activeClientCount : null,
    avg_margin_pct: mrr > 0 ? (grossProfit / mrr) * 100 : null,
    // Null until there's any spend or income — otherwise $0 − $0 would read
    // as "break-even reached" before the scheme has started.
    cumulative_profit_vs_spend: spendTotal === 0 && paidIn === 0 ? null : paidIn - paidOut - spendTotal,
    leads_total: leads.length,
    leads_this_month: leads.filter((l) => new Date(l.receivedAt).toISOString().slice(0, 7) === today.slice(0, 7)).length,
    qualified_leads: qualified.length,
    leads_unanswered: leads.filter((l) => !l.firstResponseAt && l.stage !== "won" && l.stage !== "lost").length,
    ad_spend_total: spendTotal,
    ad_clicks_total: clicksTotal,
    cost_per_lead: adsLeads.length ? spendTotal / adsLeads.length : null,
    close_rate: qualified.length ? (won.length / qualified.length) * 100 : null,
    landing_conversion: clicksTotal ? (adsLeads.length / clicksTotal) * 100 : null,
    avg_response_minutes: responseMins.length ? responseMins.reduce((a, b) => a + b, 0) / responseMins.length : null,
    max_hours_per_client: activeClientCount ? maxHours / 2 / activeClientCount : null,
    payouts_on_time_pct: payoutOnTime + payoutLate ? (payoutOnTime / (payoutOnTime + payoutLate)) * 100 : null,
    delivered_on_time_pct: deliveredDue ? (deliveredOnTime / deliveredDue) * 100 : null,
    weekly_review_streak: reviewStreak(
      state.reviews.filter((r) => !r.deletedAt && r.completedAt).map((r) => r.weekOf),
      new Date(`${today}T12:00:00Z`)
    ),
    launch_readiness_pct: null, // filled below — depends on the other metrics
    pilot_loop_complete: cycles.filter((c) => c.deliveredAt && c.approvedAt && c.clientPaidAt && c.payoutPaidAt).length,
    tracked_leads: leads.filter((l) => l.gclid || (l.utm && Object.keys(l.utm).length > 0)).length,
    contractor_lockdown_applied: state.contractorLockdownApplied ? 1 : 0,
  };
  m.launch_readiness_pct = computeLaunch(state, m).readinessPct;
  return m;
}

// ---------------------------------------------------------------------------
// Launch checklist
// ---------------------------------------------------------------------------
export type LaunchItemView = Row<typeof incrementumLaunchItems> & {
  auto: boolean;
  metricValue: number | null;
  effectiveStatus: string;
};

export function computeLaunch(state: IncrementumState, metrics: Metrics) {
  const items: LaunchItemView[] = state.launchItems
    .filter((i) => !i.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => {
      const auto = isMetricKey(i.metricKey);
      const metricValue = auto ? (metrics[i.metricKey as MetricKey] ?? null) : null;
      let effectiveStatus = i.status;
      if (auto && i.status !== "na") {
        effectiveStatus = meets(metricValue, "gte", toNum(i.metricTarget)) ? "done" : i.status === "done" ? "in_progress" : i.status;
      }
      return { ...i, auto, metricValue, effectiveStatus };
    });
  const counted = items.filter((i) => i.critical && i.gate !== "P");
  const complete = counted.filter((i) => i.effectiveStatus === "done" || i.effectiveStatus === "na").length;
  const readinessPct = counted.length ? Math.round((complete / counted.length) * 100) : 0;
  const byGate = new Map<string, { total: number; complete: number }>();
  for (const i of items) {
    const g = byGate.get(i.gate) ?? { total: 0, complete: 0 };
    g.total++;
    if (i.effectiveStatus === "done" || i.effectiveStatus === "na") g.complete++;
    byGate.set(i.gate, g);
  }
  const blockers = counted.filter((i) => i.effectiveStatus === "blocked").concat(
    counted.filter((i) => i.effectiveStatus !== "done" && i.effectiveStatus !== "na" && i.effectiveStatus !== "blocked")
  );
  return { items, readinessPct, byGate, nextBlockers: blockers.slice(0, 3), criticalTotal: counted.length, criticalComplete: complete };
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------
export type CriterionView = Row<typeof incrementumPhaseCriteria> & {
  met: boolean;
  value: number | null;
  progress: number;
};
export type PhaseView = Row<typeof incrementumPhases> & {
  criteria: CriterionView[];
  milestones: Row<typeof incrementumMilestones>[];
  metCount: number;
  allMet: boolean;
};

export function computePhases(state: IncrementumState, metrics: Metrics): { phases: PhaseView[]; current: PhaseView | null; next: PhaseView | null } {
  const phases = state.phases
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.number - b.number)
    .map((p) => {
      const criteria = state.criteria
        .filter((c) => c.phaseId === p.id && !c.deletedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => {
          const target = toNum(c.target);
          const value = isMetricKey(c.metricKey) ? metrics[c.metricKey] : null;
          const met = criterionMet({ metricKey: isMetricKey(c.metricKey) ? c.metricKey : null, comparator: c.comparator, target, manualDoneAt: c.manualDoneAt }, metrics);
          return { ...c, met, value, progress: c.metricKey ? progressFraction(value, c.comparator, target) : met ? 1 : 0 };
        });
      const milestones = state.milestones.filter((m) => m.phaseId === p.id && !m.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
      const metCount = criteria.filter((c) => c.met).length;
      return { ...p, criteria, milestones, metCount, allMet: criteria.length > 0 && metCount === criteria.length };
    });
  const current = phases.find((p) => p.status === "active") ?? phases.find((p) => p.status !== "done") ?? null;
  const next = current ? (phases.find((p) => p.number > current.number) ?? null) : null;
  return { phases, current, next };
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export type GoalView = Row<typeof incrementumGoals> & { value: number | null; progress: number; status: GoalStatus; pace: number | null };

export function computeGoals(state: IncrementumState, metrics: Metrics): GoalView[] {
  return state.goals
    .filter((g) => !g.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => {
      const auto = isMetricKey(g.metricKey);
      const value = auto ? metrics[g.metricKey as MetricKey] : null;
      const target = toNum(g.target);
      const { status, pace } = goalStatus({
        value,
        comparator: g.comparator,
        target,
        periodStart: g.periodStart,
        periodEnd: g.periodEnd,
        manualDone: Boolean(g.manualDoneAt),
        isManual: !auto,
        today: new Date(`${state.today}T12:00:00Z`),
      });
      return { ...g, value, progress: auto ? progressFraction(value, g.comparator, target) : g.manualDoneAt ? 1 : 0, status, pace };
    });
}

// ---------------------------------------------------------------------------
// Capacity
// ---------------------------------------------------------------------------
export type CapacityView = ServiceCapacity & { needed: number | null; gap: number | null; recruitBy: string | null; targetDate: string | null };

export function computeCapacity(state: IncrementumState, services: ServiceView[], packages: PackageView[], nextPhase: PhaseView | null): CapacityView[] {
  const slotsPer = n(state.settings.defaultSlotsPerContractor) || 4;
  const recruitDays = state.settings.defaultRecruitDays ?? 21;
  const profileByContractor = new Map(state.profiles.filter((p) => !p.deletedAt).map((p) => [p.contractorId, p]));
  const activeEng = new Map(state.engagements.filter((e) => !e.deletedAt && e.status === "active").map((e) => [e.id, e]));

  // Services worth showing: recurring services in any non-retired package, or with bench contractors.
  const packaged = new Set(packages.filter((p) => p.status !== "retired").flatMap((p) => p.lines.filter((l) => l.kind === "recurring").map((l) => l.serviceId)));
  return services
    .filter((s) => s.status === "active" && s.billing === "monthly")
    .filter((s) => packaged.has(s.id) || state.contractorServices.some((cs) => cs.serviceId === s.id && !cs.deletedAt))
    .map((s) => {
      const benchContractors = state.contractorServices
        .filter((cs) => cs.serviceId === s.id && !cs.deletedAt)
        .filter((cs) => {
          const p = profileByContractor.get(cs.contractorId);
          return p && isBench(p.stage);
        })
        .map((cs) => ({ contractorId: cs.contractorId, capacitySlots: toNum(cs.capacitySlots) }));
      const slotsUsed = state.engagementContractors
        .filter((ec) => !ec.deletedAt && ec.role === "main" && ec.serviceId === s.id && activeEng.has(ec.engagementId))
        .reduce((a, ec) => a + n(activeEng.get(ec.engagementId)!.slotWeight), 0);
      const cap = serviceCapacity({ serviceId: s.id, serviceName: s.name, benchContractors, slotsUsed, defaultSlotsPerContractor: slotsPer, minBench: 2 });
      const avgSlots = benchContractors.length ? cap.slotsTotal / benchContractors.length : slotsPer;
      const target = nextPhase?.clientMax ?? nextPhase?.clientMin ?? null;
      const needed = target !== null ? contractorsNeeded(target, 1, avgSlots, 2) : null;
      const targetDate = nextPhase?.targetDate ?? null;
      return {
        ...cap,
        needed,
        gap: needed !== null ? Math.max(0, needed - cap.confirmed) : null,
        recruitBy: targetDate ? recruitByDate(targetDate, recruitDays) : null,
        targetDate,
      };
    });
}

// ---------------------------------------------------------------------------
// Deadlines, needs attention, next moves
// ---------------------------------------------------------------------------
export type Deadline = { key: string; date: string; title: string; kind: "milestone" | "task" | "launch" | "goal" | "recruit"; href: string; overdue: boolean };

export function computeDeadlines(state: IncrementumState, launch: ReturnType<typeof computeLaunch>, goals: GoalView[], capacity: CapacityView[], horizonDays = 14): Deadline[] {
  const horizon = addDaysIso(state.today, horizonDays);
  const out: Deadline[] = [];
  for (const m of state.milestones) {
    if (m.deletedAt || m.doneAt || !m.dueDate) continue;
    out.push({ key: `m-${m.id}`, date: m.dueDate, title: m.title, kind: "milestone", href: "/incrementum/roadmap", overdue: m.dueDate < state.today });
  }
  for (const t of state.tasks) {
    if (t.status === "done" || !t.dueDate) continue;
    out.push({ key: `t-${t.id}`, date: t.dueDate, title: t.title, kind: "task", href: "/incrementum/tasks", overdue: t.dueDate < state.today });
  }
  for (const i of launch.items) {
    if (!i.dueDate || i.effectiveStatus === "done" || i.effectiveStatus === "na") continue;
    out.push({ key: `l-${i.id}`, date: i.dueDate, title: i.title, kind: "launch", href: "/incrementum/launch", overdue: i.dueDate < state.today });
  }
  for (const g of goals) {
    if (!g.periodEnd || g.status === "hit") continue;
    out.push({ key: `g-${g.id}`, date: g.periodEnd, title: g.title, kind: "goal", href: "/incrementum/goals", overdue: g.periodEnd < state.today });
  }
  for (const c of capacity) {
    if (!c.recruitBy || !c.gap) continue;
    out.push({ key: `r-${c.serviceId}`, date: c.recruitBy, title: `Start recruiting ${c.gap} for ${c.serviceName}`, kind: "recruit", href: "/incrementum/capacity", overdue: c.recruitBy < state.today });
  }
  return out.filter((d) => d.date <= horizon).sort((a, b) => a.date.localeCompare(b.date));
}

export type AttentionItem = { key: string; tone: "danger" | "warning" | "neutral"; title: string; detail?: string; href: string };

export function computeAttention(state: IncrementumState, goals: GoalView[]): AttentionItem[] {
  const out: AttentionItem[] = [];
  const target = state.settings.responseTargetMinutes ?? 60;
  for (const l of state.leads) {
    if (l.deletedAt || l.firstResponseAt || l.stage === "won" || l.stage === "lost") continue;
    const mins = Math.round((state.now.getTime() - new Date(l.receivedAt).getTime()) / 60_000);
    out.push({
      key: `lead-${l.id}`,
      tone: mins > target ? "danger" : "warning",
      title: `Reply to ${l.businessName}`,
      detail: mins > target ? `Waiting ${mins >= 120 ? `${Math.round(mins / 60)} h` : `${mins} min`} (target ${target} min)` : "New lead",
      href: `/incrementum/leads/${l.id}`,
    });
  }
  const engName = new Map(state.engagements.map((e) => [e.id, e.clientName ?? e.name]));
  for (const c of state.cycles) {
    if (c.deletedAt) continue;
    const name = engName.get(c.engagementId) ?? "Engagement";
    if (c.deliveredAt && !c.approvedAt) out.push({ key: `appr-${c.id}`, tone: "warning", title: `Approve ${name}'s deliverables`, href: `/incrementum/engagements/${c.engagementId}` });
    if (c.clientPaidAt && !c.payoutPaidAt) {
      const overdue = c.payoutDueAt && c.payoutDueAt < state.today;
      out.push({ key: `pay-${c.id}`, tone: overdue ? "danger" : "warning", title: `Pay contractor for ${name}`, detail: c.payoutDueAt ? `Due ${c.payoutDueAt}` : undefined, href: "/incrementum/payouts" });
    }
    if (c.invoicedAt && !c.clientPaidAt && c.invoicedAt < addDaysIso(state.today, -14)) {
      out.push({ key: `inv-${c.id}`, tone: "danger", title: `${name} invoice unpaid 14+ days`, detail: "Contractor payout on hold", href: "/incrementum/payouts" });
    }
  }
  for (const t of state.tasks) {
    if (t.status === "done" || !t.dueDate || t.dueDate >= state.today) continue;
    out.push({ key: `task-${t.id}`, tone: "danger", title: t.title, detail: `Overdue since ${t.dueDate}`, href: "/incrementum/tasks" });
  }
  const weekAgo = new Date(state.now.getTime() - 7 * 86_400_000);
  for (const p of state.profiles) {
    if (p.deletedAt || !["contacted", "meeting_booked", "vetting"].includes(p.stage)) continue;
    if (new Date(p.stageChangedAt) < weekAgo) out.push({ key: `ctr-${p.id}`, tone: "neutral", title: `Follow up ${p.name}`, detail: "No stage change in 7+ days", href: `/incrementum/contractors/${p.contractorId}` });
  }
  for (const g of goals) {
    if (g.status === "at_risk") out.push({ key: `goal-${g.id}`, tone: "warning", title: `Goal off pace: ${g.title}`, href: "/incrementum/goals" });
  }
  const monday = mondayOf(new Date(`${state.today}T12:00:00Z`));
  const reviewed = state.reviews.some((r) => !r.deletedAt && r.weekOf === monday && r.completedAt);
  if (!reviewed) out.push({ key: `review-${monday}`, tone: "neutral", title: "Weekly review due", href: "/incrementum/review" });
  const rank = { danger: 0, warning: 1, neutral: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export type NextMove = { key: string; title: string; detail?: string; href: string };

export function computeNextMoves(
  state: IncrementumState,
  metrics: Metrics,
  phases: ReturnType<typeof computePhases>,
  capacity: CapacityView[]
): NextMove[] {
  const out: NextMove[] = [];
  const { current, next } = phases;
  if (current && next && current.allMet) {
    out.push({
      key: `advance-${current.number}`,
      title: `All Phase ${current.number} criteria met. Advance to Phase ${next.number} · ${next.name}.`,
      detail: next.adBudget ? `Phase ${next.number} ad budget: ${next.adBudget}.` : undefined,
      href: "/incrementum/roadmap",
    });
  }
  for (const c of capacity) {
    if (!c.benchOk) {
      out.push({ key: `bench-${c.serviceId}`, title: `${c.serviceName} has no backup contractor yet.`, detail: `${c.confirmed} confirmed. Recruit at least ${2 - c.confirmed} more so a contractor leaving can't stall a client.`, href: "/incrementum/contractors" });
    } else if (c.slotsTotal > 0 && c.slotsFree <= 1) {
      out.push({ key: `full-${c.serviceId}`, title: `${c.serviceName} bench is nearly full.`, detail: `${c.slotsFree} slot${c.slotsFree === 1 ? "" : "s"} free. Start sourcing another contractor${c.recruitBy ? ` by ${c.recruitBy}` : ""}.`, href: "/incrementum/capacity" });
    }
  }
  for (const e of state.engagements) {
    if (e.deletedAt || e.status !== "active" || !e.startDate) continue;
    const months = monthsBetween(e.startDate, state.today);
    if (months >= 3 && e.health === "good") {
      out.push({ key: `referral-${e.id}`, title: `${e.clientName ?? e.name} is ${Math.floor(months)} months in and healthy. Ask for a referral.`, href: `/incrementum/engagements/${e.id}` });
    }
    const cost = state.engagementContractors.filter((ec) => ec.engagementId === e.id && !ec.deletedAt).reduce((a, ec) => a + n(ec.monthlyCost), 0);
    const profit = n(e.monthlyPrice) - cost;
    if (n(e.monthlyPrice) > 0 && profit < 400) {
      out.push({ key: `price-${e.id}`, title: `${e.clientName ?? e.name} makes ${money(profit)}/month, under the $400 kill line.`, detail: "Review the price at renewal or move it to a cheaper bench contractor.", href: `/incrementum/engagements/${e.id}` });
    }
  }
  const freedom = n(state.settings.freedomTarget);
  if (metrics.monthly_profit !== null && metrics.monthly_profit >= freedom + 5000) {
    out.push({ key: "account-manager", title: "Profit now covers an account manager (~$5k/month) and still clears your freedom number.", detail: "Consider hiring one (Phase 4).", href: "/incrementum/goals" });
  }
  if ((metrics.ad_spend_total ?? 0) >= 800) {
    const leadsLow = (metrics.leads_total ?? 0) < 2;
    const convLow = metrics.landing_conversion !== null && metrics.landing_conversion < 2;
    if (leadsLow || convLow) {
      out.push({ key: "kill-month2", title: "Month-2 kill line hit: pause ads and fix the offer or landing page.", detail: `${metrics.leads_total ?? 0} leads, conversion ${metrics.landing_conversion?.toFixed(1) ?? "—"}% after ${money(metrics.ad_spend_total)} spent.`, href: "/incrementum/experiments" });
    }
  }
  const dismissed = new Set(state.dismissedMoves);
  return out.filter((m) => !dismissed.has(m.key));
}

export function metricLabel(key: string | null): string {
  return isMetricKey(key) ? METRICS[key].label : "Manual";
}

// ---------------------------------------------------------------------------
// Client lines -> quote, grouped by contractor role (Max, 2026-10-21):
// a profile starts empty; packages, services or off-list catalogue items
// are added as lines; lines group by the role that delivers them, and one
// contractor is added per role.
// ---------------------------------------------------------------------------
export type NeedView = Row<typeof incrementumNeeds> & {
  service: ServiceView | null;
  catalogueItem: IncrementumState["catalogue"][number] | null;
  name: string;
  billing: "monthly" | "one_off";
  /** The line's own role, else its service's. */
  roleId: string | null;
  packageName: string | null;
  contractorName: string | null;
  rate: number | null; // per unit: the assigned contractor's rate, else the service's quote
  rateSource: "assigned" | "service" | "none";
  markup: number;
  unitPrice: number | null;
  listPrice: number | null; // unitPrice x quantity, before waiving
  price: number | null; // what the client pays: 0 when waived
  cost: number | null;
  profit: number | null;
  priceSource: "override" | "cost_plus" | "catalogue_floor" | "service" | "catalogue" | "none";
};

export function computeNeed(state: IncrementumState, services: ServiceView[], need: Row<typeof incrementumNeeds>): NeedView {
  const service = need.serviceId ? (services.find((s) => s.id === need.serviceId) ?? null) : null;
  const catalogueItem = need.serviceItemId ? (state.catalogue.find((c) => c.id === need.serviceItemId) ?? null) : null;
  const qty = toNum(need.quantity) ?? 1;
  const assignedRate = need.contractorId ? toNum(need.contractorRate) : null;
  const rate = assignedRate ?? service?.price.quote ?? null;
  const rateSource: NeedView["rateSource"] = assignedRate !== null ? "assigned" : rate !== null ? "service" : "none";
  const markup = toNum(need.markupPct) ?? service?.effectiveMarkupPct ?? (toNum(state.settings.defaultMarkupPct) ?? 33);
  const billing: NeedView["billing"] =
    need.kind === "recurring" ? "monthly" : need.kind === "setup" ? "one_off" : service ? (service.billing === "monthly" ? "monthly" : "one_off") : catalogueItem?.isRecurring ? "monthly" : "one_off";
  const override = toNum(need.sellPrice);
  let unitPrice: number | null = null;
  let priceSource: NeedView["priceSource"] = "none";
  if (override !== null) {
    unitPrice = override;
    priceSource = "override";
  } else if (!service && catalogueItem) {
    unitPrice = toNum(billing === "monthly" ? catalogueItem.currentMonthlyPrice : catalogueItem.currentSetupPrice) ?? toNum(catalogueItem.currentMonthlyPrice) ?? toNum(catalogueItem.currentSetupPrice);
    priceSource = unitPrice !== null ? "catalogue" : "none";
  } else if (rate !== null) {
    unitPrice = Math.round(rate * (1 + markup / 100) * 100) / 100;
    priceSource = "cost_plus";
    const floor = service?.catalogueFloor ? service.price.cataloguePrice : null;
    if (floor !== null && floor !== undefined && floor > unitPrice) {
      unitPrice = floor;
      priceSource = "catalogue_floor";
    }
  } else if (service && service.price.sellPrice !== null) {
    unitPrice = service.price.sellPrice;
    priceSource = "service";
  }
  const listPrice = unitPrice !== null ? Math.round(unitPrice * qty * 100) / 100 : null;
  const price = need.waived ? 0 : listPrice;
  // A waived line is still delivered, so the contractor is still paid.
  const cost = rate !== null ? Math.round(rate * qty * 100) / 100 : null;
  const contractorName = need.contractorId ? (state.profiles.find((p) => p.contractorId === need.contractorId)?.name ?? null) : null;
  return {
    ...need,
    service,
    catalogueItem,
    name: service?.name ?? catalogueItem?.deliverable ?? need.title ?? "Line",
    billing,
    roleId: need.roleId ?? service?.roleId ?? null,
    packageName: need.packageId ? (state.packages.find((p) => p.id === need.packageId)?.name ?? null) : null,
    contractorName,
    rate,
    rateSource,
    markup,
    unitPrice,
    listPrice,
    price,
    cost,
    profit: price !== null && cost !== null ? Math.round((price - cost) * 100) / 100 : null,
    priceSource,
  };
}

export type QuoteTotals = {
  monthlySubtotal: number;
  monthlyDiscount: number; // package bundle discounts on monthly lines
  monthlyPrice: number;
  monthlyCost: number;
  monthlyProfit: number;
  marginPct: number | null;
  oneOffSubtotal: number;
  oneOffDiscount: number;
  oneOffPrice: number;
  oneOffCost: number;
  waivedValue: number;
  unassigned: number;
  unpriced: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Lines copied in from a package keep that package's bundle discount
 * (8 / 12 / 15% recurring by count, 5 / 10% setup), worked out over the
 * lines still on the profile, so removing one recalculates it.
 */
function bundleDiscount(lines: NeedView[], pctFor: (count: number) => number): number {
  const byPackage = new Map<string, NeedView[]>();
  for (const l of lines) if (l.packageId && !l.waived) byPackage.set(l.packageId, [...(byPackage.get(l.packageId) ?? []), l]);
  let off = 0;
  for (const group of byPackage.values()) off += group.reduce((a, l) => a + (l.price ?? 0), 0) * (pctFor(group.length) / 100);
  return r2(off);
}

export function quoteTotals(needs: NeedView[]): QuoteTotals {
  const monthly = needs.filter((n) => n.billing === "monthly");
  const oneOff = needs.filter((n) => n.billing !== "monthly");
  const sum = (rows: NeedView[], k: "price" | "cost") => r2(rows.reduce((a, n) => a + (n[k] ?? 0), 0));
  const monthlySubtotal = sum(monthly, "price");
  const monthlyDiscount = bundleDiscount(monthly, recurringBundleDiscountPct);
  const monthlyPrice = r2(monthlySubtotal - monthlyDiscount);
  const monthlyCost = sum(monthly, "cost");
  const monthlyProfit = r2(monthlyPrice - monthlyCost);
  const oneOffSubtotal = sum(oneOff, "price");
  const oneOffDiscount = bundleDiscount(oneOff, setupBundleDiscountPct);
  return {
    monthlySubtotal,
    monthlyDiscount,
    monthlyPrice,
    monthlyCost,
    monthlyProfit,
    marginPct: monthlyPrice > 0 ? Math.round((monthlyProfit / monthlyPrice) * 1000) / 10 : null,
    oneOffSubtotal,
    oneOffDiscount,
    oneOffPrice: r2(oneOffSubtotal - oneOffDiscount),
    oneOffCost: sum(oneOff, "cost"),
    waivedValue: r2(needs.filter((n) => n.waived).reduce((a, n) => a + (n.listPrice ?? 0), 0)),
    unassigned: needs.filter((n) => !n.contractorId).length,
    unpriced: needs.filter((n) => n.price === null).length,
  };
}

export type RoleGroup = {
  roleId: string | null;
  roleName: string;
  lines: NeedView[];
  /** Set when every line in the group has the same contractor. */
  contractorId: string | null;
  contractorName: string | null;
  assignedCount: number;
};

/** A profile's lines grouped by contractor role, in Settings order; lines with no role last. */
export function roleGroups(state: IncrementumState, views: NeedView[]): RoleGroup[] {
  const roles = state.roles.filter((r) => !r.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const known = new Set(roles.map((r) => r.id));
  const groups: RoleGroup[] = [];
  const build = (roleId: string | null, roleName: string, lines: NeedView[]) => {
    if (!lines.length) return;
    const assigned = lines.filter((l) => l.contractorId);
    const ids = new Set(assigned.map((l) => l.contractorId));
    const single = ids.size === 1 && assigned.length === lines.length ? assigned[0] : null;
    groups.push({ roleId, roleName, lines, contractorId: single?.contractorId ?? null, contractorName: single?.contractorName ?? null, assignedCount: assigned.length });
  };
  for (const r of roles) build(r.id, r.name, views.filter((v) => v.roleId === r.id));
  build(null, "No contractor role", views.filter((v) => !v.roleId || !known.has(v.roleId)));
  return groups;
}

export type RoleCandidate = {
  contractorId: string;
  name: string;
  photoUrl: string | null;
  stage: string;
  onBench: boolean;
  quality: number | null;
  /** They cover this role (ticked on their profile), not just quoted one of its services. */
  roleMatch: boolean;
  lines: { needId: string; name: string; billing: NeedView["billing"]; rate: number | null }[];
  monthlyRate: number;
  oneOffRate: number;
  missingQuotes: number;
  /** Active clients they're on + open lead quotes they're assigned to. */
  jobs: number;
};

/**
 * Who can take a role on this profile: contractors who cover the role,
 * plus anyone who has quoted one of the group's services. Their price is
 * their quoted rate for each line (× quantity); a line they haven't quoted
 * counts as missing. Not-a-fit contractors are excluded. Bench first, then
 * role matches, then fewest gaps, then cheapest.
 */
export function roleCandidates(state: IncrementumState, group: RoleGroup): RoleCandidate[] {
  const activeEng = new Set(state.engagements.filter((e) => e.status === "active" && !e.deletedAt).map((e) => e.id));
  const openLeads = new Set(state.leads.filter((l) => !l.deletedAt && !l.convertedClientId && l.stage !== "lost").map((l) => l.id));
  const serviceIds = new Set(group.lines.map((l) => l.serviceId).filter(Boolean));
  const out: RoleCandidate[] = [];
  for (const p of state.profiles) {
    if (p.deletedAt || p.stage === "not_a_fit") continue;
    const quotes = state.contractorServices.filter((cs) => cs.contractorId === p.contractorId && !cs.deletedAt);
    const roleMatch = group.roleId !== null && (p.roleIds ?? []).includes(group.roleId);
    if (!roleMatch && !quotes.some((q) => serviceIds.has(q.serviceId))) continue;
    const lines = group.lines.map((l) => {
      const q = l.serviceId ? quotes.find((x) => x.serviceId === l.serviceId) : undefined;
      const rate = q ? toNum(q.rate) : null;
      return { needId: l.id, name: l.name, billing: l.billing, rate: rate !== null ? r2(rate * (toNum(l.quantity) ?? 1)) : null };
    });
    const engagements = new Set(state.engagementContractors.filter((ec) => !ec.deletedAt && ec.contractorId === p.contractorId && activeEng.has(ec.engagementId)).map((ec) => ec.engagementId));
    const leads = new Set(state.needs.filter((n) => !n.deletedAt && n.contractorId === p.contractorId && n.leadId && !n.engagementId && openLeads.has(n.leadId)).map((n) => n.leadId));
    out.push({
      contractorId: p.contractorId,
      name: p.name,
      photoUrl: p.photoUrl,
      stage: p.stage,
      onBench: isBench(p.stage),
      quality: p.qualityRating,
      roleMatch,
      lines,
      monthlyRate: r2(lines.filter((l) => l.billing === "monthly").reduce((a, l) => a + (l.rate ?? 0), 0)),
      oneOffRate: r2(lines.filter((l) => l.billing !== "monthly").reduce((a, l) => a + (l.rate ?? 0), 0)),
      missingQuotes: lines.filter((l) => l.rate === null).length,
      jobs: engagements.size + leads.size,
    });
  }
  return out.sort(
    (a, b) =>
      Number(b.onBench) - Number(a.onBench) ||
      Number(b.roleMatch) - Number(a.roleMatch) ||
      a.missingQuotes - b.missingQuotes ||
      a.monthlyRate + a.oneOffRate - (b.monthlyRate + b.oneOffRate)
  );
}
