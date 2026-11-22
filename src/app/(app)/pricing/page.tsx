import { listServiceModules, listServiceItems, listServiceUsage } from "@/lib/dal/pricing";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { coreLineup } from "@/lib/incrementum/core-lineup";
import { StoreData } from "@/terminal/store";
import { Pricing } from "@/terminal/screens/Catalog";

const n = (v: string | null) => (v == null || v === "" ? null : Number(v));

// Services, in two lists (Max, 22 Nov 2026):
// - Core: what Gray Horizon offers new clients, and later the website. Only
//   Project Incrementum's packages, add-ons and one-offs, read live from
//   Incrementum › Services (edited there, priced there).
// - Private: the original catalogue, a structured copy of
//   gh_pricing_framework_v5.md (re-run scripts/import-pricing.mjs after the
//   source changes). Kept for signed clients and internal use only.
export default async function PricingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const [modules, items, usage, inc] = await Promise.all([
    listServiceModules(),
    listServiceItems(),
    listServiceUsage(),
    // Private must still load if Incrementum can't.
    getIncrementumSnapshot().catch((err) => {
      console.error("Services: Incrementum snapshot failed", err);
      return null;
    }),
  ]);

  const usedBy: Record<string, string[]> = {};
  for (const u of usage) {
    const names = (usedBy[u.serviceItemId] ??= []);
    const label = u.status === "paused" ? `${u.clientName.trim()} (paused)` : u.clientName.trim();
    if (!names.includes(label)) names.push(label);
  }

  const core = inc ? coreLineup(inc.packages, inc.services) : { packages: [], addOns: [], oneOffs: [] };
  const coreOffers = core.packages.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    description: p.description,
    monthly: p.monthlyPrice,
    setup: p.setupPrice,
    minTerm: p.minTermMonths,
    noticeDays: p.noticeDays,
    monthlyLines: p.monthly,
    setupLines: p.setup.map((l) => (l.waived ? `${l.name} (waived)` : l.name)),
    missingPrices: p.missingPrices,
  }));
  const toExtra = (kind: "addon" | "oneoff") => (s: (typeof core.addOns)[number]) => ({
    id: s.id,
    name: s.name,
    kind,
    billing: s.billing,
    price: s.price,
    ranges: s.ranges,
    text: s.priceText,
  });
  const coreExtras = [...core.addOns.map(toExtra("addon")), ...core.oneOffs.map(toExtra("oneoff"))];

  return (
    <StoreData
      data={{
        servicesView: sp.view === "private" ? "private" : "core",
        coreReady: inc != null,
        coreOffers,
        coreExtras,
        pricingModules: modules.map((m) => ({ code: m.code, name: m.name, focus: m.focus ?? "" })),
        priceItems: items.map((it) => ({
          id: it.id,
          mod: it.moduleCode,
          name: it.deliverable,
          billingType: it.billingType,
          recurring: it.isRecurring,
          setup: n(it.currentSetupPrice),
          monthly: n(it.currentMonthlyPrice),
          sSetup: n(it.suggestedSetupPrice),
          sMonthly: n(it.suggestedMonthlyPrice),
          text: it.priceText ?? "",
          notes: it.notes ?? "",
          usedBy: usedBy[it.id] ?? [],
        })),
      }}
    >
      <Pricing />
    </StoreData>
  );
}
