import { NextResponse } from "next/server";
import { withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { listServiceModules, listServiceItems } from "@/lib/dal/pricing";
import { listGrayscaleProducts } from "@/lib/dal/grayscaleProducts";

/**
 * Feeds the Apexus quote-builder tool (public/apexus/quote-builder.html,
 * loaded in an iframe from /apexus) with the live pricing catalogue and
 * GrayScale product list, so it's no longer quoting off a hardcoded data
 * block baked into that file. Same-origin fetch from inside the iframe
 * carries the admin's session cookie automatically, so this is gated the
 * same way any other admin page in this app is — no separate token.
 *
 * "Current" is the default rate to quote (see /pricing's own note) — this
 * always prefers currentSetupPrice/currentMonthlyPrice over Suggested.
 */

const WEBDEV_TIER_IDS = [
  { id: "ga-webdev-single", label: "Single-page site" },
  { id: "ga-webdev-small", label: "<5 pages" },
  { id: "ga-webdev-medium", label: "<10 pages" },
  { id: "ga-webdev-large", label: "<19 pages" },
  { id: "ga-webdev-custom", label: "20+ pages" },
] as const;
const WEBDEV_CLOUDFLARE_ID = "ga-webdev-cloudflare";
const CREATIVE_IDS = ["ga-creative-content-arch", "ga-ad-creative-design"];

type Item = Awaited<ReturnType<typeof listServiceItems>>[number];

function num(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Best-effort low-bound extraction for a "$X – $Y" (or "$X-$Y") range
// stored only as free text (priceText) — used when an item has no clean
// numeric current/suggested price, so it still resolves to *something*
// quotable rather than disappearing from the builder entirely.
function rangeLow(text: string | null): number | null {
  if (!text) return null;
  const m = text.match(/\$?([\d,]+(?:\.\d+)?)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function toLineItem(item: Item) {
  let setup = num(item.currentSetupPrice);
  let monthly = num(item.currentMonthlyPrice);
  if (setup === null && monthly === null) {
    setup = rangeLow(item.priceText);
  }
  return { id: item.id, name: item.deliverable, setup, monthly, r: item.isRecurring };
}

export async function GET() {
  return withCaller(async (caller) => {
    assertRole(caller, "admin");

    const [modules, allItems, grayscaleProducts] = await Promise.all([
      listServiceModules(),
      listServiceItems(),
      listGrayscaleProducts(),
    ]);
    void modules; // not needed beyond confirming the catalogue loaded — module grouping is done by code below

    const excludedFromGa = new Set<string>([...CREATIVE_IDS, ...WEBDEV_TIER_IDS.map((t) => t.id), WEBDEV_CLOUDFLARE_ID]);

    const gs = allItems.filter((it) => it.moduleCode === "GS").map(toLineItem);
    const ga = allItems.filter((it) => it.moduleCode === "GA" && !excludedFromGa.has(it.id)).map(toLineItem);
    const ao = allItems.filter((it) => it.moduleCode === "AO").map(toLineItem);
    const part2 = allItems.filter((it) => it.moduleCode === "P2").map(toLineItem);

    const creative = CREATIVE_IDS.map((id) => {
      const item = allItems.find((it) => it.id === id);
      if (!item) return null;
      const suppliedMonthly = num(item.currentMonthlyPrice) ?? 0;
      const scratchMatch = item.notes?.match(/from scratch:\s*\$?([\d,]+(?:\.\d+)?)/i);
      const scratchMonthly = scratchMatch ? Number(scratchMatch[1].replace(/,/g, "")) : suppliedMonthly;
      return { id: item.id, name: item.deliverable.replace(/\s*\(R\)$/, ""), suppliedMonthly, scratchMonthly };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    const webdev = [
      { id: "wd0", label: "— none —", min: 0, max: 0, note: "" },
      ...WEBDEV_TIER_IDS.map((t) => {
        const item = allItems.find((it) => it.id === t.id);
        const text = item?.priceText ?? "";
        const rangeMatch = text.match(/\$?([\d,]+(?:\.\d+)?)\s*[–-]\s*\$?([\d,]+(?:\.\d+)?)/);
        const min = rangeMatch ? Number(rangeMatch[1].replace(/,/g, "")) : rangeLow(text) ?? 0;
        const max = rangeMatch ? Number(rangeMatch[2].replace(/,/g, "")) : null;
        return { id: t.id, label: t.label, min, max, note: text ? `Suggested ${text}` : "" };
      }),
    ];
    const cloudflareItem = allItems.find((it) => it.id === WEBDEV_CLOUDFLARE_ID);

    const grayscale = grayscaleProducts.map((p) => ({
      name: p.name,
      monthly: num(p.monthlyPriceNzd),
    }));

    return NextResponse.json({ gs, ga, creative, webdev, cloudflareNote: cloudflareItem?.deliverable ?? null, ao, part2, grayscale });
  });
}
