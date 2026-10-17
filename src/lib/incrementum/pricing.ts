// Services & Pricing maths (docs/Project-Incrementum-Plan.md §7.1). Pure —
// shared by the DAL, the UI and tests/lib/incrementum.test.ts.
import type { QuoteBasis } from "./registry";

export function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Picks the contractor quote a service's price is built on. */
export function pickQuote(basis: QuoteBasis, benchQuotes: number[], expectedQuote: number | null): number | null {
  const quotes = benchQuotes.filter((q) => Number.isFinite(q) && q > 0);
  if (basis === "manual" || quotes.length === 0) return expectedQuote;
  if (basis === "highest") return Math.max(...quotes);
  if (basis === "lowest") return Math.min(...quotes);
  return round2(quotes.reduce((a, b) => a + b, 0) / quotes.length);
}

export type PriceBreakdown = {
  quote: number | null;
  quoteSource: "bench" | "expected" | "none";
  markupPct: number;
  costPlusPrice: number | null;
  cataloguePrice: number | null;
  sellPrice: number | null;
  priceSource: "manual" | "cost_plus" | "catalogue_floor" | "catalogue" | "none";
  profit: number | null;
  marginPct: number | null;
};

/**
 * sell price = manual override, else quote × (1 + markup), raised to the
 * catalogue price when the catalogue floor is on. Falls back to the
 * catalogue price when there's no quote at all, so a service never shows a
 * blank price just because nobody has quoted it yet.
 */
export function computeServicePrice(input: {
  basis: QuoteBasis;
  benchQuotes: number[];
  expectedQuote: number | null;
  markupPct: number;
  catalogueFloor: boolean;
  cataloguePrice: number | null;
  manualPrice: number | null;
}): PriceBreakdown {
  const benchUsable = input.basis !== "manual" && input.benchQuotes.some((q) => q > 0);
  const quote = pickQuote(input.basis, input.benchQuotes, input.expectedQuote);
  const quoteSource: PriceBreakdown["quoteSource"] = quote === null ? "none" : benchUsable ? "bench" : "expected";
  const costPlusPrice = quote === null ? null : round2(quote * (1 + input.markupPct / 100));

  let sellPrice: number | null;
  let priceSource: PriceBreakdown["priceSource"];
  if (input.manualPrice !== null) {
    sellPrice = input.manualPrice;
    priceSource = "manual";
  } else if (costPlusPrice !== null) {
    if (input.catalogueFloor && input.cataloguePrice !== null && input.cataloguePrice > costPlusPrice) {
      sellPrice = input.cataloguePrice;
      priceSource = "catalogue_floor";
    } else {
      sellPrice = costPlusPrice;
      priceSource = "cost_plus";
    }
  } else if (input.cataloguePrice !== null) {
    sellPrice = input.cataloguePrice;
    priceSource = "catalogue";
  } else {
    sellPrice = null;
    priceSource = "none";
  }

  const profit = sellPrice !== null && quote !== null ? round2(sellPrice - quote) : null;
  const marginPct = profit !== null && sellPrice ? round2((profit / sellPrice) * 100) : null;
  return { quote, quoteSource, markupPct: input.markupPct, costPlusPrice, cataloguePrice: input.cataloguePrice, sellPrice, priceSource, profit, marginPct };
}

/** Bundle discounts from gh_pricing_framework_v5.md §7. */
export function recurringBundleDiscountPct(items: number): number {
  if (items >= 7) return 15;
  if (items >= 4) return 12;
  if (items >= 2) return 8;
  return 0;
}
export function setupBundleDiscountPct(items: number): number {
  if (items >= 4) return 10;
  if (items >= 2) return 5;
  return 0;
}

export type PackageLine = {
  kind: "recurring" | "setup";
  sellPrice: number | null;
  quote: number | null;
  waived: boolean;
};

export type PackageTotals = {
  recurringSubtotal: number;
  recurringDiscountPct: number;
  monthlyPrice: number;
  monthlyCost: number;
  monthlyProfit: number;
  marginPct: number | null;
  markupPct: number | null;
  setupSubtotal: number;
  setupDiscountPct: number;
  setupPrice: number;
  setupCost: number;
  waivedValue: number;
  missingPrices: number;
};

/**
 * Package price = sum of its services' current sell prices with the
 * framework's bundle discount applied. Waived setup items count toward
 * "waivedValue" (shown as a closing incentive) but not the price.
 */
export function computePackageTotals(lines: PackageLine[]): PackageTotals {
  const recurring = lines.filter((l) => l.kind === "recurring");
  const setup = lines.filter((l) => l.kind === "setup" && !l.waived);
  const waivedValue = round2(
    lines.filter((l) => l.kind === "setup" && l.waived).reduce((a, l) => a + (l.sellPrice ?? 0), 0)
  );
  const missingPrices = lines.filter((l) => l.sellPrice === null).length;

  const recurringSubtotal = round2(recurring.reduce((a, l) => a + (l.sellPrice ?? 0), 0));
  const recurringDiscountPct = recurringBundleDiscountPct(recurring.length);
  const monthlyPrice = round2(recurringSubtotal * (1 - recurringDiscountPct / 100));
  const monthlyCost = round2(recurring.reduce((a, l) => a + (l.quote ?? 0), 0));
  const monthlyProfit = round2(monthlyPrice - monthlyCost);

  const setupSubtotal = round2(setup.reduce((a, l) => a + (l.sellPrice ?? 0), 0));
  const setupDiscountPct = setupBundleDiscountPct(setup.length);
  const setupPrice = round2(setupSubtotal * (1 - setupDiscountPct / 100));
  const setupCost = round2(setup.reduce((a, l) => a + (l.quote ?? 0), 0));

  return {
    recurringSubtotal,
    recurringDiscountPct,
    monthlyPrice,
    monthlyCost,
    monthlyProfit,
    marginPct: monthlyPrice > 0 ? round2((monthlyProfit / monthlyPrice) * 100) : null,
    markupPct: monthlyCost > 0 ? round2((monthlyProfit / monthlyCost) * 100) : null,
    setupSubtotal,
    setupDiscountPct,
    setupPrice,
    setupCost,
    waivedValue,
    missingPrices,
  };
}

/** How many clients at a given profit each it takes to reach a monthly target. */
export function clientsForTarget(target: number, profitPerClient: number): number | null {
  if (profitPerClient <= 0) return null;
  return Math.ceil(target / profitPerClient);
}
