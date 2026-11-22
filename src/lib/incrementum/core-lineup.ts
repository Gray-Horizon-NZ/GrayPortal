import type { PackageView, ServiceView } from "./compute";

// The Core service line-up (Max, 22 Nov 2026): the only marketing services
// Gray Horizon offers new clients, and what goes on the website. It is
// Project Incrementum's price list, read live, so Services › Core and the
// MCP tool `list_core_services` always match Incrementum › Services.
// The original catalogue (service_items) is the Private list: signed
// clients and internal use only.
//
// - packages: every package that isn't retired (live first, then drafts).
// - addOns: services flagged as add-ons, plus monthly services that aren't
//   inside any package (e.g. Ad Creative Design), since those can only be
//   sold on top of one.
// - oneOffs: one-off and range services (setup lines and ways in).
// Sell prices only: contractor quotes and margins stay in Incrementum.

export type CoreLineup = ReturnType<typeof coreLineup>;

export function coreLineup(packages: PackageView[], services: ServiceView[]) {
  const offers = packages
    .filter((p) => p.status !== "retired")
    .sort((a, b) => Number(b.status === "live") - Number(a.status === "live"));
  const inPackage = new Set(offers.flatMap((p) => p.lines.filter((l) => l.kind === "recurring").map((l) => l.serviceId)));
  const active = services.filter((s) => s.status === "active");

  const extra = (s: ServiceView) => ({
    id: s.id,
    name: s.name,
    billing: s.billing,
    price: s.price.sellPrice,
    ranges: (s.ranges ?? []).map((r) => ({ label: r.label, min: r.min, max: r.max })),
    priceText: s.cataloguePriceText ?? "",
  });

  return {
    packages: offers.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      description: p.description ?? "",
      inclusions: p.inclusions ?? "",
      exclusions: p.exclusions ?? "",
      deliverables: p.deliverables ?? "",
      monthlyPrice: p.totals.monthlyPrice,
      setupPrice: p.totals.setupPrice,
      minTermMonths: p.minTermMonths,
      noticeDays: p.noticeDays,
      monthly: p.lines.filter((l) => l.kind === "recurring").map((l) => l.name),
      setup: p.lines.filter((l) => l.kind === "setup").map((l) => ({ name: l.name, waived: l.waived })),
      missingPrices: p.totals.missingPrices,
    })),
    addOns: active.filter((s) => s.isAddon || (s.billing === "monthly" && !inPackage.has(s.id))).map(extra),
    oneOffs: active.filter((s) => !s.isAddon && s.billing !== "monthly").map(extra),
  };
}
