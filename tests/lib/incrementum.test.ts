import { describe, expect, it } from "vitest";
import {
  computePackageTotals,
  computeServicePrice,
  pickQuote,
  recurringBundleDiscountPct,
  setupBundleDiscountPct,
  clientsForTarget,
} from "@/lib/incrementum/pricing";
import {
  contractorsNeeded,
  criterionMet,
  goalStatus,
  meets,
  mondayOf,
  recruitByDate,
  reviewStreak,
  serviceCapacity,
} from "@/lib/incrementum/evaluate";
import { LAUNCH_SEED, PHASE_SEED, GOAL_SEED } from "@/lib/incrementum/seeds";
import { isMetricKey } from "@/lib/incrementum/registry";

describe("pricing", () => {
  it("picks the quote by basis, falling back to the expected quote", () => {
    expect(pickQuote("highest", [400, 600], 500)).toBe(600);
    expect(pickQuote("lowest", [400, 600], 500)).toBe(400);
    expect(pickQuote("average", [400, 600], 500)).toBe(500);
    expect(pickQuote("manual", [400, 600], 450)).toBe(450);
    expect(pickQuote("highest", [], 450)).toBe(450);
  });

  it("applies a 33% markup on the quote", () => {
    const p = computeServicePrice({ basis: "highest", benchQuotes: [650], expectedQuote: null, markupPct: 33, catalogueFloor: false, cataloguePrice: 1426, manualPrice: null });
    expect(p.sellPrice).toBe(864.5);
    expect(p.priceSource).toBe("cost_plus");
    expect(p.profit).toBe(214.5);
  });

  it("raises to the catalogue price when the floor is on", () => {
    const p = computeServicePrice({ basis: "highest", benchQuotes: [650], expectedQuote: null, markupPct: 33, catalogueFloor: true, cataloguePrice: 1426, manualPrice: null });
    expect(p.sellPrice).toBe(1426);
    expect(p.priceSource).toBe("catalogue_floor");
    expect(p.profit).toBe(776);
  });

  it("manual override wins, and no quote falls back to catalogue", () => {
    expect(computeServicePrice({ basis: "highest", benchQuotes: [650], expectedQuote: null, markupPct: 33, catalogueFloor: true, cataloguePrice: 1426, manualPrice: 999 }).sellPrice).toBe(999);
    const none = computeServicePrice({ basis: "highest", benchQuotes: [], expectedQuote: null, markupPct: 33, catalogueFloor: false, cataloguePrice: 900, manualPrice: null });
    expect(none.sellPrice).toBe(900);
    expect(none.priceSource).toBe("catalogue");
    expect(none.profit).toBeNull();
  });

  it("uses the framework bundle discounts", () => {
    expect([1, 2, 3, 4, 6, 7].map(recurringBundleDiscountPct)).toEqual([0, 8, 8, 12, 12, 15]);
    expect([1, 2, 3, 4].map(setupBundleDiscountPct)).toEqual([0, 5, 5, 10]);
  });

  it("totals a package and excludes waived setup items from price", () => {
    const t = computePackageTotals([
      { kind: "recurring", sellPrice: 950, quote: 500, waived: false },
      { kind: "recurring", sellPrice: 600, quote: 225, waived: false },
      { kind: "setup", sellPrice: 500, quote: 250, waived: false },
      { kind: "setup", sellPrice: 600, quote: 150, waived: true },
    ]);
    expect(t.monthlyPrice).toBe(1426);
    expect(t.monthlyProfit).toBe(701);
    expect(t.setupPrice).toBe(500);
    expect(t.waivedValue).toBe(600);
  });

  it("works out clients needed for a target", () => {
    expect(clientsForTarget(10000, 776)).toBe(13);
    expect(clientsForTarget(10000, 0)).toBeNull();
  });
});

describe("evaluation", () => {
  it("compares gte/lte", () => {
    expect(meets(3, "gte", 3)).toBe(true);
    expect(meets(3.5, "lte", 3)).toBe(false);
    expect(meets(null, "gte", 0)).toBe(false);
  });

  it("treats a criterion with no metric as manual", () => {
    expect(criterionMet({ metricKey: null, comparator: "gte", target: null, manualDoneAt: null }, {})).toBe(false);
    expect(criterionMet({ metricKey: null, comparator: "gte", target: null, manualDoneAt: new Date() }, {})).toBe(true);
    expect(criterionMet({ metricKey: "active_clients", comparator: "gte", target: 6, manualDoneAt: null }, { active_clients: 6 })).toBe(true);
  });

  it("reports goal pace", () => {
    const today = new Date("2026-11-15T12:00:00Z");
    const behind = goalStatus({ value: 0, comparator: "gte", target: 3, periodStart: "2026-10-18", periodEnd: "2026-12-15", manualDone: false, isManual: false, today });
    expect(behind.status).toBe("at_risk");
    const ahead = goalStatus({ value: 2, comparator: "gte", target: 3, periodStart: "2026-10-18", periodEnd: "2026-12-15", manualDone: false, isManual: false, today });
    expect(ahead.status).toBe("on_track");
    const missed = goalStatus({ value: 1, comparator: "gte", target: 3, periodStart: "2026-10-18", periodEnd: "2026-11-01", manualDone: false, isManual: false, today });
    expect(missed.status).toBe("missed");
  });

  it("computes capacity and contractors needed", () => {
    const c = serviceCapacity({
      serviceId: "s",
      serviceName: "Google Ads",
      benchContractors: [
        { contractorId: "a", capacitySlots: 5 },
        { contractorId: "b", capacitySlots: null },
      ],
      slotsUsed: 6,
      defaultSlotsPerContractor: 4,
      minBench: 2,
    });
    expect(c.slotsTotal).toBe(9);
    expect(c.slotsFree).toBe(3);
    expect(c.benchOk).toBe(true);
    expect(contractorsNeeded(8, 1, 4, 2)).toBe(2);
    expect(contractorsNeeded(1, 1, 4, 2)).toBe(2);
    expect(contractorsNeeded(15, 1, 4, 2)).toBe(4);
    expect(recruitByDate("2027-02-15", 21)).toBe("2027-01-25");
  });

  it("counts weekly review streaks", () => {
    const today = new Date("2026-11-18T09:00:00Z"); // Wednesday
    expect(mondayOf(today)).toBe("2026-11-16");
    expect(reviewStreak(["2026-11-16", "2026-11-09", "2026-11-02"], today)).toBe(3);
    expect(reviewStreak(["2026-11-09", "2026-11-02"], today)).toBe(2);
    expect(reviewStreak(["2026-11-02"], today)).toBe(0);
  });
});

describe("seeds", () => {
  it("only reference real metric keys", () => {
    for (const item of LAUNCH_SEED) if (item.metricKey) expect(isMetricKey(item.metricKey)).toBe(true);
    for (const p of PHASE_SEED) for (const c of p.criteria) if (c.metricKey) expect(isMetricKey(c.metricKey)).toBe(true);
    for (const g of GOAL_SEED) if (g.metricKey) expect(isMetricKey(g.metricKey)).toBe(true);
  });

  it("numbers phases 0–4 in order", () => {
    expect(PHASE_SEED.map((p) => p.number)).toEqual([0, 1, 2, 3, 4]);
  });
});

import { aucklandLocalToUtc } from "@/lib/incrementum/format";
describe("time zones", () => {
  it("converts Auckland wall-clock time with daylight saving", () => {
    expect(aucklandLocalToUtc("2027-01-11T09:30:00").toISOString()).toBe("2027-01-10T20:30:00.000Z"); // NZDT +13
    expect(aucklandLocalToUtc("2027-06-15T09:30:00").toISOString()).toBe("2027-06-14T21:30:00.000Z"); // NZST +12
  });
});
