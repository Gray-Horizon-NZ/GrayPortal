import { describe, it, expect } from "vitest";
import { coreLineup } from "@/lib/incrementum/core-lineup";
import type { PackageView, ServiceView } from "@/lib/incrementum/compute";

// Services › Core (22 Nov 2026) must list exactly what Incrementum sells:
// packages that aren't retired, add-ons, and one-offs, never the cost side.

const svc = (id: string, over: Partial<ServiceView> = {}) =>
  ({ id, name: id, billing: "monthly", isAddon: false, status: "active", ranges: null, cataloguePriceText: null, price: { sellPrice: 100, quote: 40 }, ...over }) as unknown as ServiceView;

const pkg = (id: string, status: string, recurring: string[], setup: string[] = []) =>
  ({
    id,
    name: id,
    status,
    description: null,
    inclusions: null,
    exclusions: null,
    deliverables: null,
    minTermMonths: 3,
    noticeDays: 30,
    lines: [
      ...recurring.map((s) => ({ id: `${id}-${s}`, serviceId: s, name: s, kind: "recurring", waived: false, sellPrice: 100, quote: 40 })),
      ...setup.map((s) => ({ id: `${id}-${s}`, serviceId: s, name: s, kind: "setup", waived: false, sellPrice: 100, quote: 40 })),
    ],
    totals: { monthlyPrice: 966, setupPrice: 450, missingPrices: 0 },
  }) as unknown as PackageView;

describe("coreLineup", () => {
  const services = [
    svc("ads"),
    svc("care"),
    svc("creative"), // monthly, in no package → add-on
    svc("email", { isAddon: true }),
    svc("tracking", { billing: "one_off" }),
    svc("build", { billing: "range", ranges: [{ label: "<5 pages", min: 1800, max: 2500 }] }),
    svc("old", { status: "retired" }),
  ];
  const packages = [pkg("draft-one", "draft", ["ads"]), pkg("essentials", "live", ["ads", "care"], ["tracking"]), pkg("gone", "retired", ["creative"])];
  const core = coreLineup(packages, services);

  it("lists live packages first and drops retired ones", () => {
    expect(core.packages.map((p) => p.id)).toEqual(["essentials", "draft-one"]);
    expect(core.packages[0]).toMatchObject({ monthlyPrice: 966, setupPrice: 450, monthly: ["ads", "care"], setup: [{ name: "tracking", waived: false }] });
  });

  it("treats add-ons and monthly services outside every package as add-ons", () => {
    expect(core.addOns.map((s) => s.id)).toEqual(["creative", "email"]);
  });

  it("lists one-off and range services as one-offs, skipping retired services", () => {
    expect(core.oneOffs.map((s) => s.id)).toEqual(["tracking", "build"]);
    expect(core.oneOffs[1].ranges).toEqual([{ label: "<5 pages", min: 1800, max: 2500 }]);
  });

  it("never exposes contractor quotes", () => {
    expect(JSON.stringify(core)).not.toContain("quote");
  });
});
