import { describe, expect, it } from "vitest";
import {
  annualIncomeTax,
  annualAccEarnerLevy,
  estimateMonthlySetAside,
  estimateMonthlySetAsideFromYtd,
  nzTaxYearStart,
} from "@/lib/nzTax";

describe("annualIncomeTax", () => {
  it("taxes income within the bottom bracket at that bracket's rate", () => {
    expect(annualIncomeTax(10_000)).toBeCloseTo(1_050, 2);
  });

  it("blends brackets once income crosses a threshold", () => {
    // $15,600 @ 10.5% + $4,400 @ 17.5%
    expect(annualIncomeTax(20_000)).toBeCloseTo(15_600 * 0.105 + 4_400 * 0.175, 2);
  });

  it("clamps negative income to zero tax", () => {
    expect(annualIncomeTax(-500)).toBe(0);
  });
});

describe("annualAccEarnerLevy", () => {
  it("applies the flat rate below the cap", () => {
    expect(annualAccEarnerLevy(50_000)).toBeCloseTo(50_000 * 0.0175, 2);
  });

  it("caps liable earnings at the maximum", () => {
    expect(annualAccEarnerLevy(500_000)).toBeCloseTo(156_641 * 0.0175, 2);
  });
});

describe("estimateMonthlySetAside", () => {
  it("comes in well under a flat 17.5% for modest steady monthly income", () => {
    // $2,200 gross minus $213 fully-deductible monthly costs -> $1,987 taxable
    const result = estimateMonthlySetAside(1_987);
    expect(result.totalNzd).toBeLessThan(1_987 * 0.175);
    expect(result.totalNzd).toBeCloseTo(291.5, 0);
  });

  it("returns zero for zero taxable income", () => {
    const result = estimateMonthlySetAside(0);
    expect(result.totalNzd).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });
});

describe("estimateMonthlySetAsideFromYtd", () => {
  it("taxes income directly (no ×12 annualization) when nothing's been earned yet this year", () => {
    const result = estimateMonthlySetAsideFromYtd(1_987, 0);
    expect(result.totalNzd).toBeCloseTo(annualIncomeTax(1_987) + annualAccEarnerLevy(1_987), 6);
  });

  it("sums to the true annual tax bill across a full year of equal monthly payments (telescoping)", () => {
    let cumulative = 0;
    let totalSetAside = 0;
    for (let month = 0; month < 12; month++) {
      const result = estimateMonthlySetAsideFromYtd(1_987, cumulative);
      totalSetAside += result.totalNzd;
      cumulative += 1_987;
    }
    const fullYearBill = annualIncomeTax(1_987 * 12) + annualAccEarnerLevy(1_987 * 12);
    expect(totalSetAside).toBeCloseTo(fullYearBill, 6);
  });

  it("taxes this month's income at a higher marginal rate once YTD income already crossed a bracket", () => {
    // Already at $53,500 YTD (top of the 17.5% bracket) — the next dollar is 30%.
    const result = estimateMonthlySetAsideFromYtd(1_000, 53_500);
    expect(result.effectiveRate).toBeGreaterThan(0.3);
    expect(result.effectiveRate).toBeLessThan(0.35); // 30% income tax + 1.75% ACC
  });

  it("combines income from multiple sources (e.g. Gray Horizon + Spider-Fawcett) into one cumulative figure", () => {
    const combined = estimateMonthlySetAsideFromYtd(1_000, 40_000 + 20_000);
    const singleSource = estimateMonthlySetAsideFromYtd(1_000, 60_000);
    expect(combined.totalNzd).toBeCloseTo(singleSource.totalNzd, 6);
  });
});

describe("nzTaxYearStart", () => {
  it("returns 1 April of the same year for a date after 1 April", () => {
    expect(nzTaxYearStart(new Date(Date.UTC(2026, 8, 3))).toISOString().slice(0, 10)).toBe("2026-04-01");
  });

  it("returns 1 April of the previous year for a date before 1 April", () => {
    expect(nzTaxYearStart(new Date(Date.UTC(2026, 1, 15))).toISOString().slice(0, 10)).toBe("2025-04-01");
  });
});
