import { describe, expect, it } from "vitest";
import {
  resolveLaunchDates,
  computeNeed,
  quoteTotals,
  roleGroups,
  roleCandidates,
  previewRole,
  computeServices,
  computePackages,
  computeMetrics,
  computeLaunch,
  computePhases,
  computeGoals,
  computeCapacity,
  computeNextMoves,
  computeAttention,
  type IncrementumState,
} from "@/lib/incrementum/compute";
import { LAUNCH_SEED, PHASE_SEED, GOAL_SEED } from "@/lib/incrementum/seeds";

// A day-one state shaped like ensureIncrementumSeeded()'s output, so the
// whole compute layer can be checked without a database.
const t0 = new Date("2026-10-18T09:00:00Z");
const base = { createdAt: t0, updatedAt: t0, deletedAt: null, createdBy: null, updatedBy: null };
let n = 0;
const id = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;

function dayOne(): IncrementumState {
  const phases = PHASE_SEED.map((p) => ({
    ...base,
    id: id(),
    number: p.number,
    name: p.name,
    purpose: p.purpose,
    adBudget: p.adBudget,
    services: p.services,
    clientMin: p.clientMin,
    clientMax: p.clientMax,
    contractorTarget: p.contractorTarget,
    targetDate: null,
    launchOffsetDays: p.launchOffsetDays,
    enteredAt: p.number === 0 ? t0 : null,
    exitedAt: null,
    status: p.number === 0 ? "active" : "upcoming",
    retro: null,
  }));
  const criteria = PHASE_SEED.flatMap((p, pi) =>
    p.criteria.map((c, i) => ({ ...base, id: id(), phaseId: phases[pi].id, label: c.label, metricKey: c.metricKey ?? null, comparator: c.comparator ?? "gte", target: c.target !== undefined ? String(c.target) : null, manualDoneAt: null, sortOrder: i }))
  );
  const serviceId = id();
  const packageId = id();
  return {
    today: "2026-10-18",
    now: t0,
    settings: {
      ...base,
      id: id(),
      key: "singleton",
      defaultMarkupPct: "33",
      freedomTarget: "10000",
      freedomGold: "15000",
      freedomDiamond: "20000",
      adBudgetTotal: "2000",
      responseTargetMinutes: 60,
      defaultSlotsPerContractor: "4",
      defaultRecruitDays: 21,
      minBench: 2,
      lowSlotsWarn: 1,
      launchDate: null,
      homeModeOverride: null,
      contractorAccessReviewedAt: null,
      seededAt: t0,
    },
    services: [
      {
        ...base,
        id: serviceId,
        serviceItemId: "ga-google-ads-mgmt",
        name: "Google Ads Management",
        billing: "monthly",
        quoteBasis: "highest",
        expectedQuote: "500",
        markupPct: null,
        catalogueFloor: false,
        manualPrice: null,
        usuallyWaived: false,
        gstBasis: "exclusive",
        ranges: null,
        competitorNotes: null,
        notes: null,
        tags: ["google-ads"],
        roleId: null as string | null,
        status: "active",
        sortOrder: 0,
      },
    ],
    catalogue: [{ id: "ga-google-ads-mgmt", moduleCode: "GA", deliverable: "Google Ads Management (R)", isRecurring: true, currentMonthlyPrice: "950.00", currentSetupPrice: null, priceText: null }],
    roles: [],
    contractorServices: [],
    profiles: [],
    packages: [{ ...base, id: packageId, name: "Foundation", description: null, inclusions: null, exclusions: null, deliverables: null, minTermMonths: 3, noticeDays: 30, landingUrl: null, manualMonthlyPrice: null, manualSetupPrice: null, status: "draft", sortOrder: 0 }],
    packageServices: [{ ...base, id: id(), packageId, serviceId, kind: "recurring", waived: false }],
    leads: [],
    engagements: [],
    engagementContractors: [],
    cycles: [],
    adMonths: [],
    hours: [],
    adminUserIds: [],
    reviews: [],
    launchItems: LAUNCH_SEED.map((l, i) => ({
      ...base,
      id: id(),
      gate: l.gate,
      title: l.title,
      detail: l.detail ?? null,
      status: "not_started",
      critical: l.critical ?? true,
      dueDate: null,
      notes: null,
      evidenceUrl: null,
      naReason: null,
      metricKey: l.metricKey ?? null,
      metricTarget: l.metricTarget !== undefined ? String(l.metricTarget) : null,
      taskId: null,
      sortOrder: i,
    })),
    phases,
    criteria,
    milestones: [],
    goals: GOAL_SEED.map((g, i) => ({
      ...base,
      id: id(),
      title: g.title,
      metricKey: g.metricKey ?? null,
      comparator: g.comparator ?? "gte",
      target: g.target !== undefined ? String(g.target) : null,
      periodStart: g.periodStart ?? null,
      periodEnd: g.periodEnd ?? null,
      launchOffsetDays: g.launchOffsetDays ?? null,
      manualDoneAt: null,
      phaseId: null,
      isFreedom: g.isFreedom ?? false,
      sortOrder: i,
    })),
    experiments: [],
    taskLists: [],
    tasks: [],
    needs: [],
    dismissedMoves: [],
  } as IncrementumState;
}

describe("compute on day one", () => {
  const state = dayOne();
  const services = computeServices(state);
  const packages = computePackages(state, services);
  const metrics = computeMetrics(state, services, packages);
  const phases = computePhases(state, metrics);
  const goals = computeGoals(state, metrics);

  it("prices the service at expected quote + 33%", () => {
    expect(services[0].price.sellPrice).toBe(665);
    expect(services[0].price.quoteSource).toBe("expected");
    expect(packages[0].totals.monthlyPrice).toBe(665);
  });

  it("starts at 0% launch readiness with Phase 0 active and nothing met", () => {
    expect(metrics.launch_readiness_pct).toBe(0);
    expect(computeLaunch(state, metrics).criticalTotal).toBeGreaterThan(50);
    expect(phases.current?.number).toBe(0);
    expect(phases.current?.allMet).toBe(false);
    expect(phases.next?.number).toBe(1);
  });

  it("doesn't count break-even (or any goal) as hit before anything happens", () => {
    expect(metrics.cumulative_profit_vs_spend).toBeNull();
    expect(goals.filter((g) => g.status === "hit")).toEqual([]);
  });

  it("flags the missing backup contractor and the weekly review", () => {
    const capacity = computeCapacity(state, services, packages, phases.next);
    expect(capacity[0].benchOk).toBe(false);
    const moves = computeNextMoves(state, metrics, phases, capacity);
    expect(moves.some((m) => m.key.startsWith("bench-"))).toBe(true);
    expect(computeAttention(state, goals).some((a) => a.key.startsWith("review-"))).toBe(true);
  });

  it("raises a sell price to the catalogue when the floor is on", () => {
    const floored = dayOne();
    floored.services[0].catalogueFloor = true;
    expect(computeServices(floored)[0].price.sellPrice).toBe(950);
  });
});

describe("launch-relative dates", () => {
  it("stay TBD until a launch date is set, then resolve", () => {
    const st = dayOne();
    const pending = resolveLaunchDates(st);
    expect(pending.phases.find((p) => p.number === 0)?.targetDate).toBeNull();
    expect(pending.goals.find((g) => g.title.startsWith("Month-2"))?.periodEnd).toBeNull();
    st.settings.launchDate = "2027-01-20";
    const live = resolveLaunchDates(st);
    expect(live.phases.find((p) => p.number === 0)?.targetDate).toBe("2027-01-20");
    expect(live.goals.find((g) => g.title.startsWith("Month-2"))?.periodEnd).toBe("2027-03-21");
    expect(live.goals.find((g) => g.title.startsWith("Month-2"))?.periodStart).toBe("2027-01-20");
  });
});

describe("quote builder", () => {
  const st = dayOne();
  const roleId = id();
  st.roles = [{ ...base, id: roleId, name: "Ads specialist", sortOrder: 0 }];
  st.services[0].roleId = roleId;
  const services = computeServices(st);
  const svc = st.services[0];
  const contractorId = "11111111-1111-1111-1111-111111111111";
  const benId = "22222222-2222-2222-2222-222222222222";
  const profile = { ...base, specialty: null, stage: "confirmed", stageChangedAt: t0, businessName: null, email: null, phone: null, location: null, portfolioUrl: null, source: null, skills: null, roleIds: null, worksWithSizes: null as string[] | null, gstRegistered: null, paymentTerms: null, qualityRating: null, photoUrl: null, publicTitle: null, bio: null, payWhenPaidAcceptedAt: null, nonSolicitSignedAt: null, noticePeriodDays: null, agreementUrl: null, offRampReason: null, notes: null };
  st.profiles = [
    { ...profile, id: id(), contractorId, name: "Ana", skills: ["shopify"], qualityRating: 4 },
    { ...profile, id: id(), contractorId: benId, name: "Ben", roleIds: [roleId] },
  ] as never;
  st.contractorServices = [{ ...base, id: id(), contractorId, serviceId: svc.id, rateType: "monthly", rate: "600", capacitySlots: "5", notes: null }] as never;
  st.catalogue.push({ id: "gs-brand-guideline", moduleCode: "P2", deliverable: "Brand Guideline", isRecurring: false, currentMonthlyPrice: null, currentSetupPrice: "650.00", priceText: null });
  const need = {
    ...base,
    id: id(),
    leadId: null,
    engagementId: null,
    serviceId: svc.id,
    serviceItemId: null,
    roleId: null,
    packageId: null,
    kind: null,
    waived: false,
    title: null,
    tags: null,
    quantity: "1",
    contractorId: null,
    contractorRate: null,
    markupPct: null,
    sellPrice: null,
    notes: null,
    sortOrder: 0,
  };

  it("prices an unassigned need from the service", () => {
    const v = computeNeed(st, services, need as never);
    expect(v.rateSource).toBe("service");
    expect(v.price).toBe(665);
  });

  it("prices an assigned need from the contractor's rate, and overrides win", () => {
    const assigned = computeNeed(st, services, { ...need, contractorId, contractorRate: "600" } as never);
    expect(assigned.price).toBe(798);
    expect(assigned.profit).toBe(198);
    const overridden = computeNeed(st, services, { ...need, contractorId, contractorRate: "600", sellPrice: "1200", quantity: "2" } as never);
    expect(overridden.price).toBe(2400);
    expect(overridden.cost).toBe(1200);
    expect(quoteTotals([assigned, overridden]).monthlyPrice).toBe(3198);
  });

  it("groups lines by role and lists who can take each role", () => {
    const offList = computeNeed(st, services, { ...need, id: id(), serviceId: null, serviceItemId: "gs-brand-guideline", kind: "setup", sellPrice: "650" } as never);
    expect(offList.billing).toBe("one_off");
    expect(offList.price).toBe(650);
    const groups = roleGroups(st, [computeNeed(st, services, need as never), offList]);
    expect(groups.map((g) => [g.roleName, g.lines.length])).toEqual([
      ["Ads specialist", 1],
      ["No contractor role", 1],
    ]);
    const c = roleCandidates(st, groups[0]);
    // Ben ticked the role (no quote yet) so he leads; Ana only quoted the service.
    expect(c.map((x) => x.name)).toEqual(["Ben", "Ana"]);
    expect(c[0].missingQuotes).toBe(1);
    expect(c[1].monthlyRate).toBe(600);
    expect(c[1].jobs).toBe(0);
  });

  it("previews the profile's price and profit for each contractor before adding them", () => {
    const [group] = roleGroups(st, [computeNeed(st, services, need as never)]);
    // Ana quoted $600 → 600 × 1.33; Ben hasn't quoted → the service's $500 expected quote.
    const ana = previewRole(st, services, [need as never], group, contractorId);
    expect(ana.totals.monthlyPrice).toBe(798);
    expect(ana.totals.monthlyProfit).toBe(198);
    expect(ana.roleMonthlyProfit).toBe(198);
    const ben = previewRole(st, services, [need as never], group, benId);
    expect(ben.totals.monthlyPrice).toBe(665);
    expect(ben.totals.monthlyProfit).toBe(165);
    expect(ben.totals.markupPct).toBe(33);
  });

  it("only matches contractors who take jobs the client's size (none ticked = any size)", () => {
    const sized = { ...st, profiles: st.profiles.map((p) => (p.name === "Ben" ? { ...p, worksWithSizes: ["medium", "large"] } : p)) };
    const [group] = roleGroups(sized, [computeNeed(sized, services, need as never)]);
    const small = roleCandidates(sized, group, "small");
    expect(small.find((c) => c.name === "Ben")?.sizeMatch).toBe(false);
    expect(small.find((c) => c.name === "Ana")?.sizeMatch).toBe(true);
    expect(roleCandidates(sized, group, "large").every((c) => c.sizeMatch)).toBe(true);
  });

  it("keeps a package's bundle discount, and a waived setup costs but isn't charged", () => {
    const pkg = st.packages[0].id;
    const a = computeNeed(st, services, { ...need, id: id(), packageId: pkg, kind: "recurring" } as never);
    const b = computeNeed(st, services, { ...need, id: id(), packageId: pkg, kind: "recurring" } as never);
    const setup = computeNeed(st, services, { ...need, id: id(), packageId: pkg, kind: "setup", waived: true } as never);
    const t = quoteTotals([a, b, setup]);
    expect(t.monthlySubtotal).toBe(1330);
    expect(t.monthlyDiscount).toBe(106.4); // 8% for 2 recurring lines
    expect(t.monthlyPrice).toBe(1223.6);
    expect(t.oneOffPrice).toBe(0);
    expect(t.oneOffCost).toBe(500);
    expect(t.waivedValue).toBe(665);
  });
});
