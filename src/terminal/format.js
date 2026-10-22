// Formatters and derived figures from the terminal concept's data.js, kept
// verbatim so the ported screens compute exactly what the concept did. The
// mock records are gone — screens get real data through the store
// (./store.jsx). Constants here are the real ones (stages, task lists,
// portal features), not the concept's samples.

// Today in Auckland, as YYYY-MM-DD — identical on the server and in the
// browser, so server-rendered dates never disagree with hydrated ones.
export const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());

export const GST_THRESHOLD = 60000;

export const serviceMonthly = (s) => (s.status === "active" ? s.monthly * (1 - (s.discount || 0) / 100) : 0);
export const clientMrr = (c) => c.services.reduce((a, s) => a + serviceMonthly(s), 0) * (1 - (c.overallDiscount || 0) / 100);
export const clientSetupTotal = (c) => c.services.reduce((a, s) => a + (s.setup || 0), 0);

// ─── Pipeline ────────────────────────────────────────────────────────────
export const STAGES = ["Identified", "Contacted", "Meeting booked", "Pitch delivered", "Proposal out", "Won", "Lost", "Dormant"];
export const OPEN_STAGES = STAGES.slice(0, 5);
// Default close probability per stage for the weighted pipeline figure,
// used when a deal has no close probability of its own set.
export const STAGE_PROB = { Identified: 0.05, Contacted: 0.1, "Meeting booked": 0.25, "Pitch delivered": 0.4, "Proposal out": 0.6 };

// ─── Tasks ───────────────────────────────────────────────────────────────
// The real internal lists (src/lib/dal/tasks.ts INTERNAL_LIST_LABELS).
export const INTERNAL_LISTS = [
  { id: "gray_horizon", label: "Gray Horizon" },
  { id: "gray_horizon_focus", label: "Gray Horizon - Focus" },
  { id: "project_incrementum", label: "Project Incrementum" },
];

// ─── Client profile ──────────────────────────────────────────────────────
export const ONBOARDING_DOCUMENT_NAMES = ["Welcome Document", "Project Brief", "Delivery Guide", "Thank You Document"];
export const REFERRAL_STATUSES = ["submitted", "contacted", "converted", "discount_applied", "declined"];

// ─── Formatting ──────────────────────────────────────────────────────────
export const money = (n, dp = 0) =>
  "$" + Number(n || 0).toLocaleString("en-NZ", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const short = (n) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : money(n));
export const fmtDate = (iso, opts = { day: "numeric", month: "short" }) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-NZ", opts) : "—";
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
