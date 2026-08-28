// The real GrayScale product catalogue — discovered 2026-08-28 while
// fact-checking a discount figure for the onboarding wizard's GrayScale
// step, pulled from the live marketing site's own structured data
// (OS/website/grayhorizon-website/grayscale/index.html). Single source of
// truth for the client portal's request widget: both the chip grid it
// renders and the DAL's validation of a submitted request (never trust a
// client-submitted product list against anything looser than this).
export const GRAYSCALE_PRODUCTS: { name: string; category: string }[] = [
  { name: "Osseus", category: "Platform" },
  { name: "Fidelis", category: "Growth & Revenue" },
  { name: "Apexus", category: "Growth & Revenue" },
  { name: "Aurum", category: "Growth & Revenue" },
  { name: "Meridian", category: "Growth & Revenue" },
  { name: "Stratum", category: "AI & Intelligence" },
  { name: "Memoria", category: "AI & Intelligence" },
  { name: "Tempus", category: "Operations" },
  { name: "Solus", category: "Operations" },
];

export const GRAYSCALE_PRODUCT_NAMES = GRAYSCALE_PRODUCTS.map((p) => p.name);
