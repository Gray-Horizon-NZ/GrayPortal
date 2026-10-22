import { listServiceModules, listServiceItems } from "@/lib/dal/pricing";
import { StoreData } from "@/terminal/store";
import { Pricing } from "@/terminal/screens/Catalog";

const n = (v: string | null) => (v == null || v === "" ? null : Number(v));

// Structured copy of gh_pricing_framework_v5.md (re-run scripts/import-
// pricing.mjs after the source changes), rendered by the terminal concept's
// Pricing screen.
export default async function PricingPage() {
  const [modules, items] = await Promise.all([listServiceModules(), listServiceItems()]);
  return (
    <StoreData
      data={{
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
        })),
      }}
    >
      <Pricing />
    </StoreData>
  );
}
