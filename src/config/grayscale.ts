// The real GrayScale product catalogue — discovered 2026-08-28 while
// fact-checking a discount figure for the onboarding wizard's GrayScale
// step, pulled from the live marketing site's own structured data
// (OS/website/grayhorizon-website/grayscale/index.html). Single source of
// truth for the client portal's request widget: the chip grid it renders,
// the per-product hover description, and the DAL's validation of a
// submitted request (never trust a client-submitted product list against
// anything looser than this). `description` is copied verbatim from that
// page's own JSON-LD product descriptions, not paraphrased.
export const GRAYSCALE_PRODUCTS: { name: string; category: string; description: string }[] = [
  {
    name: "Osseus",
    category: "Platform",
    description:
      "A simple CRM that becomes a motherboard the moment you connect it — client records, sales pipeline, and your team, the shared foundation every GrayScale tool plugs into.",
  },
  {
    name: "Fidelis",
    category: "Growth & Revenue",
    description: "FMA-compliant advisor onboarding, with the paperwork built into the flow instead of bolted on after.",
  },
  {
    name: "Apexus",
    category: "Growth & Revenue",
    description: "A proposal a prospect can say yes to on the spot — live quote calculator and e-signature built in.",
  },
  {
    name: "Aurum",
    category: "Growth & Revenue",
    description: "AI lead scoring that tells you which leads are worth calling before you spend a minute on them.",
  },
  {
    name: "Meridian",
    category: "Growth & Revenue",
    description: "Live, boardroom-ready revenue and growth dashboards, no manual reporting cycle.",
  },
  {
    name: "Stratum",
    category: "AI & Intelligence",
    description: "Contracts, invoices and briefs turned into structured data, with a human-review step, not blind automation.",
  },
  {
    name: "Memoria",
    category: "AI & Intelligence",
    description: "A searchable AI memory of everything your business knows, built from your own documents.",
  },
  {
    name: "Tempus",
    category: "Operations",
    description: "Bookings, scheduling and resourcing for a service business, in one system instead of six.",
  },
  {
    name: "Solus",
    category: "Operations",
    description: "Every client gets their own branded portal for files, approvals and status, without you building one.",
  },
];

export const GRAYSCALE_PRODUCT_NAMES = GRAYSCALE_PRODUCTS.map((p) => p.name);
