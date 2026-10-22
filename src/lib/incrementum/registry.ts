// Project Incrementum app-layer registries (docs/Project-Incrementum-Plan.md).
// Stage/status/metric/widget lists live here rather than as pgEnums, same
// reasoning as INTERNAL_LIST_KEYS in dal/tasks.ts: they're expected to
// change, and a code change shouldn't need a migration. Pure module — no
// server-only imports — so it's shared by the DAL, the UI and the tests.

export const INCREMENTUM_LIST_KEY = "project_incrementum" as const;

// ---------------------------------------------------------------------------
// Contractors (plan §7.4)
// ---------------------------------------------------------------------------
export const CONTRACTOR_STAGES = [
  "sourced",
  "contacted",
  "meeting_booked",
  "vetting",
  "confirmed",
  "onboarded",
] as const;
export const CONTRACTOR_OFF_RAMPS = ["paused", "not_a_fit"] as const;
export const ALL_CONTRACTOR_STAGES = [...CONTRACTOR_STAGES, ...CONTRACTOR_OFF_RAMPS] as const;
export type ContractorStage = (typeof ALL_CONTRACTOR_STAGES)[number];
export const CONTRACTOR_STAGE_LABELS: Record<ContractorStage, string> = {
  sourced: "Sourced",
  contacted: "Contacted",
  meeting_booked: "Meeting booked",
  vetting: "Vetting",
  confirmed: "Confirmed",
  onboarded: "Onboarded",
  paused: "Paused",
  not_a_fit: "Not a fit",
};
/** Stages that count as "on the bench" — can be given work. */
export const BENCH_STAGES: ContractorStage[] = ["confirmed", "onboarded"];

// ---------------------------------------------------------------------------
// Leads (plan §7.2)
// ---------------------------------------------------------------------------
export const LEAD_STAGES = ["new", "contacted", "qualified", "call_booked", "proposal", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  call_booked: "Call booked",
  proposal: "Proposal sent",
  won: "Won",
  lost: "Lost",
};
/** Stages at or past "qualified" — what the month-2 checkpoint counts. */
export const QUALIFIED_LEAD_STAGES: LeadStage[] = ["qualified", "call_booked", "proposal", "won"];
export const LEAD_SOURCES = ["google_ads", "meta_ads", "website", "outreach", "referral", "manual"] as const;
export const LEAD_SOURCE_LABELS: Record<(typeof LEAD_SOURCES)[number], string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  website: "Website",
  outreach: "Outreach",
  referral: "Referral",
  manual: "Manual",
};

// ---------------------------------------------------------------------------
// Launch checklist (plan §6)
// ---------------------------------------------------------------------------
export const LAUNCH_GATES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "P"] as const;
export type LaunchGate = (typeof LAUNCH_GATES)[number];
export const LAUNCH_GATE_LABELS: Record<LaunchGate, string> = {
  A: "Offer & pricing",
  B: "Legal, finance & admin",
  C: "Contractors",
  D: "Delivery system",
  E: "Landing page & sales",
  F: "Tracking & measurement",
  G: "Pilot client",
  H: "Google Ads build",
  I: "Go-live",
  P: "Post-launch milestones",
};
export const LAUNCH_ITEM_STATUSES = ["not_started", "in_progress", "done", "na", "blocked"] as const;
export type LaunchItemStatus = (typeof LAUNCH_ITEM_STATUSES)[number];
export const LAUNCH_ITEM_STATUS_LABELS: Record<LaunchItemStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
  na: "N/A",
  blocked: "Blocked",
};

// ---------------------------------------------------------------------------
// Engagements
// ---------------------------------------------------------------------------
export const ENGAGEMENT_STATUSES = ["active", "paused", "ended"] as const;
// Business size (Max, 2026-10-21): small businesses get the simple,
// low-headache offer (reviews and exposure); medium and large get the full
// packages and VIP priority. Contractors tick which sizes they'll work with.
export const BUSINESS_SIZES = ["small", "medium", "large"] as const;
export type BusinessSize = (typeof BUSINESS_SIZES)[number];
export const BUSINESS_SIZE_LABELS: Record<BusinessSize, string> = {
  small: "Small business",
  medium: "Medium business",
  large: "Large business",
};

export const ENGAGEMENT_HEALTH = ["good", "watch", "at_risk"] as const;
export const ENGAGEMENT_HEALTH_LABELS: Record<(typeof ENGAGEMENT_HEALTH)[number], string> = {
  good: "Healthy",
  watch: "Watch",
  at_risk: "At risk",
};
export const ENGAGEMENT_MODULES = [
  "tasks",
  "approvals",
  "reporting",
  "hours",
  "payouts",
  "credentials",
  "portal_visibility",
] as const;
export const ENGAGEMENT_MODULE_LABELS: Record<(typeof ENGAGEMENT_MODULES)[number], string> = {
  tasks: "Tasks",
  approvals: "Approvals",
  reporting: "Monthly reporting",
  hours: "Hours logging",
  payouts: "Payouts",
  credentials: "Credentials",
  portal_visibility: "Visible in client portal",
};

// ---------------------------------------------------------------------------
// Metrics — every automatic launch item, phase criterion and goal reads one
// of these keys. Values are computed in dal/incrementum/metrics.ts.
// ---------------------------------------------------------------------------
export type MetricUnit = "count" | "currency" | "percent" | "hours" | "minutes" | "months";
export type MetricDef = { label: string; unit: MetricUnit; description: string };

export const METRICS = {
  contractors_sourced: { label: "Contractors in pipeline", unit: "count", description: "Every contractor profile not marked Not a fit." },
  contractors_confirmed: { label: "Confirmed contractors", unit: "count", description: "Contractors at Confirmed or Onboarded." },
  contractors_onboarded: { label: "Onboarded contractors", unit: "count", description: "Contractors with a GrayPortal login (Gray Horizon Team)." },
  confirmed_with_agreements: { label: "Confirmed with agreements signed", unit: "count", description: "Confirmed/Onboarded contractors with pay-when-paid and non-solicit both recorded." },
  bench_top_service: { label: "Deepest bench (one service)", unit: "count", description: "The most confirmed contractors on any single service." },
  bench_weakest_live: { label: "Weakest bench (live services)", unit: "count", description: "The fewest confirmed contractors on any service sold in a live package." },
  active_clients: { label: "Active clients", unit: "count", description: "Clients with an active engagement." },
  paying_clients: { label: "Paying clients", unit: "count", description: "Active clients with at least one month invoiced (payments aren't tracked)." },
  ads_clients: { label: "Clients from ads", unit: "count", description: "Active clients whose lead came from Google or Meta ads." },
  max_months_retained: { label: "Longest client stay", unit: "months", description: "Longest an engagement has run (active or ended)." },
  avg_months_retained: { label: "Average client stay", unit: "months", description: "Average engagement length so far." },
  clients_lost_90d: { label: "Clients lost (90 days)", unit: "count", description: "Engagements ended in the last 90 days." },
  mrr: { label: "Monthly revenue (MRR)", unit: "currency", description: "Signed monthly price of every active client, added up." },
  monthly_contractor_cost: { label: "Monthly contractor cost", unit: "currency", description: "Monthly cost of every contractor on active engagements." },
  monthly_profit: { label: "Monthly profit", unit: "currency", description: "MRR − contractor costs − this month's ad spend." },
  avg_profit_per_client: { label: "Avg profit per client", unit: "currency", description: "(MRR − contractor costs) ÷ active clients." },
  avg_margin_pct: { label: "Avg margin", unit: "percent", description: "(MRR − contractor costs) ÷ MRR." },
  cumulative_profit_vs_spend: { label: "Profit vs ad spend (to date)", unit: "currency", description: "Signed price − contractor payouts on every invoiced month − all ad spend. ≥ 0 means break-even." },
  leads_total: { label: "Leads (all time)", unit: "count", description: "Every Incrementum lead." },
  leads_this_month: { label: "Leads this month", unit: "count", description: "Leads received this calendar month." },
  qualified_leads: { label: "Qualified leads", unit: "count", description: "Leads that reached Qualified or beyond." },
  leads_unanswered: { label: "Unanswered leads", unit: "count", description: "Leads with no first response yet." },
  ad_spend_total: { label: "Ad spend (to date)", unit: "currency", description: "Sum of monthly ad spend entered in Analytics." },
  ad_clicks_total: { label: "Ad clicks (to date)", unit: "count", description: "Sum of monthly ad clicks entered in Analytics." },
  cost_per_lead: { label: "Cost per lead", unit: "currency", description: "Ad spend ÷ leads from ads." },
  close_rate: { label: "Close rate", unit: "percent", description: "Won ÷ qualified leads." },
  landing_conversion: { label: "Landing page conversion", unit: "percent", description: "Leads from ads ÷ ad clicks." },
  avg_response_minutes: { label: "Avg first response", unit: "minutes", description: "Average time from a lead arriving to first contact." },
  max_hours_per_client: { label: "Max's hours per client / month", unit: "hours", description: "Max's logged hours over the last 60 days ÷ 2 ÷ active clients." },
  delivered_on_time_pct: { label: "Delivery on time", unit: "percent", description: "Monthly cycles delivered by the end of their month." },
  weekly_review_streak: { label: "Weekly review streak", unit: "count", description: "Consecutive weeks with a completed review." },
  launch_readiness_pct: { label: "Launch readiness", unit: "percent", description: "Launch-critical items done or N/A (Gates A–I)." },
  pilot_loop_complete: { label: "Full loops completed", unit: "count", description: "Months that went all the way: delivered, approved, report sent, invoiced." },
  tracked_leads: { label: "Leads with ad tracking", unit: "count", description: "Leads that arrived with a gclid or UTM tags." },
  contractor_lockdown_applied: { label: "Contractor lockdown applied", unit: "count", description: "1 once db/sql/031 is in: contractor logins only reach their own workspace." },
} as const satisfies Record<string, MetricDef>;
export type MetricKey = keyof typeof METRICS;
export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];
export function isMetricKey(key: string | null | undefined): key is MetricKey {
  return !!key && key in METRICS;
}

// ---------------------------------------------------------------------------
// Home widgets (plan §5)
// ---------------------------------------------------------------------------
export type WidgetMode = "pre" | "live";
export type WidgetDef = { label: string; span: number; preSpan?: number; modes: WidgetMode[] };
export const WIDGETS = {
  phase: { label: "Phase progress", span: 12, modes: ["pre", "live"] },
  next_moves: { label: "Recommended next moves", span: 12, modes: ["pre", "live"] },
  launch: { label: "Launch readiness", span: 4, preSpan: 8, modes: ["pre", "live"] },
  freedom: { label: "Freedom number", span: 8, preSpan: 12, modes: ["pre", "live"] },
  review: { label: "Weekly review", span: 4, modes: ["pre", "live"] },
  attention: { label: "Needs attention", span: 6, modes: ["pre", "live"] },
  goals: { label: "Goals pace", span: 6, modes: ["pre", "live"] },
  leads: { label: "Lead inbox", span: 4, modes: ["live"] },
  pipeline: { label: "Sales pipeline", span: 4, modes: ["live"] },
  payouts: { label: "Payouts", span: 4, modes: ["live"] },
  team: { label: "Gray Horizon Team", span: 12, modes: ["pre", "live"] },
  engagements: { label: "Engagement health", span: 8, modes: ["live"] },
  economics: { label: "Unit economics", span: 4, modes: ["live"] },
  capacity: { label: "Capacity", span: 6, modes: ["pre", "live"] },
  deadlines: { label: "Deadlines", span: 6, modes: ["pre", "live"] },
  tasks: { label: "Main task list", span: 6, modes: ["pre", "live"] },
  runway: { label: "Runway", span: 3, modes: ["live"] },
  experiments: { label: "Experiments", span: 3, modes: ["pre", "live"] },
  roadmap: { label: "Roadmap strip", span: 12, modes: ["pre", "live"] },
} as const satisfies Record<string, WidgetDef>;
export type WidgetKey = keyof typeof WIDGETS;
export const DEFAULT_WIDGET_ORDER: Record<WidgetMode, WidgetKey[]> = {
  pre: ["phase", "launch", "review", "next_moves", "attention", "tasks", "deadlines", "goals", "freedom", "team", "capacity", "experiments", "roadmap"],
  live: ["phase", "freedom", "review", "next_moves", "attention", "goals", "leads", "pipeline", "payouts", "team", "engagements", "economics", "capacity", "deadlines", "tasks", "runway", "experiments", "launch", "roadmap"],
};

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------
export const EXPERIMENT_TYPES = ["change", "test", "retro"] as const;
export const EXPERIMENT_TYPE_LABELS: Record<(typeof EXPERIMENT_TYPES)[number], string> = {
  change: "Change log",
  test: "Test",
  retro: "Retro",
};
export const EXPERIMENT_VERDICTS = ["pass", "fail", "inconclusive"] as const;

// ---------------------------------------------------------------------------
// Services & Pricing
// ---------------------------------------------------------------------------
export const SERVICE_BILLING = ["monthly", "one_off", "range"] as const;
export const SERVICE_BILLING_LABELS: Record<(typeof SERVICE_BILLING)[number], string> = {
  monthly: "Monthly",
  one_off: "One-off",
  range: "Range (by size)",
};
export const QUOTE_BASES = ["highest", "average", "lowest", "manual"] as const;
export type QuoteBasis = (typeof QUOTE_BASES)[number];
export const QUOTE_BASIS_LABELS: Record<QuoteBasis, string> = {
  highest: "Highest bench quote",
  average: "Average bench quote",
  lowest: "Lowest bench quote",
  manual: "Expected quote only",
};
export const CONTRACTOR_RATE_TYPES = ["monthly", "hourly", "project"] as const;
