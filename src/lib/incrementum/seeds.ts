// First-run seed data for Project Incrementum, transcribed from
// docs/Project-Incrementum-Plan.md (§1.1 proof criteria, §1.2 phases, §6
// launch checklist, §7.1.1 launch offer). Inserted once by
// ensureIncrementumSeeded() (dal/incrementum/seed.ts); everything is
// editable in the app afterwards. Every number here is a draft from the
// plan, not a decision — the UI says so where it matters.
import type { LaunchGate, MetricKey } from "./registry";

export type LaunchSeed = {
  gate: LaunchGate;
  title: string;
  detail?: string;
  critical?: boolean;
  metricKey?: MetricKey;
  metricTarget?: number;
};

export const LAUNCH_SEED: LaunchSeed[] = [
  // Gate A — Offer & pricing
  { gate: "A", title: "Pick one first service to launch with", detail: "Plan §7.1.1 recommends the Foundation package (Google Ads + Website Management)." },
  { gate: "A", title: "Define the package", detail: "Inclusions, exclusions, monthly deliverables, reporting cadence, response times." },
  { gate: "A", title: "Market check: 3–5 NZ competitor prices recorded", detail: "Record them on the service in Services & Pricing." },
  { gate: "A", title: "Pricing rule set for each launch service", detail: "Markup % on the contractor quote (default 33%), catalogue floor on or off. Check the result against the market check." },
  { gate: "A", title: "GST basis decided and stated everywhere", detail: "GST-inclusive or exclusive. The pricing framework is exclusive." },
  { gate: "A", title: "Package profit per client at or above the pass line", detail: "Services & Pricing shows profit per client live. Pass line (§1.1): ≥ $700/month." },
  { gate: "A", title: "Minimum term and notice period set", detail: "Framework default: 3-month minimum, 30 days' notice." },
  { gate: "A", title: "Setup fee / first-month-in-advance decided" },
  { gate: "A", title: "Client pays ad spend directly to Google", detail: "Their card on their account, managed through the GH manager account. Gray Horizon never fronts ad spend." },
  { gate: "A", title: "Decide on a risk-reversal (e.g. first-90-days commitment)", critical: false },
  { gate: "A", title: "Offer one-pager written", detail: "Used for the landing page, proposals and contractor briefs." },
  { gate: "A", title: "Apexus preset created for the offer", critical: false },
  // The $20k stretch (Change-Plan-20k-Stretch.md §5, 2026-10-24): not launch-critical.
  { gate: "A", title: "SEO add-on priced from 2–3 SEO contacts' quotes", detail: "Then deliverables, same format as the email add-on (Package-Deliverables.md).", critical: false },
  { gate: "A", title: "12-month Partner term option and its incentive", detail: "A waived setup line, or one month at 50%.", critical: false },
  { gate: "A", title: "Referral offer defined", detail: "One month's management fee credit (or ~$250) per referred client who signs (Referral-Programme.md).", critical: false },
  { gate: "A", title: "Web build → retainer offer written", detail: "What's offered at launch, at what price (Web-Build-To-Retainer.md).", critical: false },

  // Gate B — Legal, finance & admin
  { gate: "B", title: "Client MSA/SOW updated for the retainer", detail: "Minimum term, advance billing, late-payment terms, client pays ad spend, liability cap, cancellation and notice." },
  { gate: "B", title: "Contractor agreement drafted", detail: "Pay-when-paid, non-solicit, confidentiality, IP assignment, client data handling (Privacy Act 2020), notice period, independence, quality and rework, termination." },
  { gate: "B", title: "Lawyer review of both agreements" },
  { gate: "B", title: "GST status confirmed with accountant", detail: "Registered or should be? How GST-registered vs unregistered contractors are handled." },
  { gate: "B", title: "Professional indemnity insurance in place" },
  { gate: "B", title: "Xero: retainer invoice template, repeating invoices, reminders on" },
  { gate: "B", title: "Xero tracking category \"Incrementum\" set up", detail: "So the scheme has its own P&L." },
  { gate: "B", title: "Payment method to cut late payment (direct debit / card on file)", critical: false },
  { gate: "B", title: "Privacy policy updated", detail: "Lead form data, contractors processing client data." },
  { gate: "B", title: "Contractor payment process defined", detail: "How they invoice GH and when they're paid after the client pays (e.g. within 5 working days)." },
  { gate: "B", title: "MSA/SOW: 12-month term, referral credit, account-manager wording", critical: false },
  { gate: "B", title: "Contractor agreement covers the SEO role", critical: false },

  // Gate C — Contractors
  { gate: "C", title: "Written contractor profile", detail: "Skills, portfolio standard, time-zone overlap, rate band." },
  { gate: "C", title: "≥ 15 candidates sourced", metricKey: "contractors_sourced", metricTarget: 15 },
  { gate: "C", title: "Screening call script + scorecard" },
  { gate: "C", title: "Paid test task + marking rubric" },
  { gate: "C", title: "≥ 3 confirmed contractors", metricKey: "contractors_confirmed", metricTarget: 3 },
  { gate: "C", title: "≥ 1 backup on the launch service (bench ≥ 2)", metricKey: "bench_top_service", metricTarget: 2 },
  { gate: "C", title: "Agreements signed by every confirmed contractor", metricKey: "confirmed_with_agreements", metricTarget: 3 },
  { gate: "C", title: "Rates and capacity recorded on every confirmed profile", detail: "Services & pricing section of each contractor profile." },
  { gate: "C", title: "Contractor welcome pack written", detail: "Playbooks tab: brand rules, client comms rules (clients go through GH only), tools, QA standard, how payment works." },
  { gate: "C", title: "Contractor access is safe", detail: "db/sql/031 applied: contractor logins only reach their own /work workspace. Ticks itself once it's in.", metricKey: "contractor_lockdown_applied", metricTarget: 1 },
  { gate: "C", title: "Contractors onboarded to GrayPortal", metricKey: "contractors_onboarded", metricTarget: 1, critical: false },
  { gate: "C", title: "2 more contractors vetted and warm (stretch)", detail: "Beyond the 3 confirmed. Pipeline at Vetting or later.", critical: false },
  { gate: "C", title: "SEO contractor from Max's contacts in the pipeline", critical: false },
  { gate: "C", title: "Screening favours people who can take 6–8 accounts, or small teams", critical: false },

  // Gate D — Delivery system
  { gate: "D", title: "Service playbook written", detail: "Onboarding steps, month-1 setup, monthly routine, QA checklist." },
  { gate: "D", title: "Engagement template set for the launch offer" },
  { gate: "D", title: "First-90-days plan template" },
  { gate: "D", title: "Monthly client report template" },
  { gate: "D", title: "Approval step agreed (contractor → Max → client)" },
  { gate: "D", title: "Gray Horizon Google Ads manager account (MCC) created", detail: "Client accounts linked under it; contractors get user access, never client logins." },
  { gate: "D", title: "GA4 / Tag Manager access model the same way" },
  { gate: "D", title: "Credentials live in the Vault only" },
  { gate: "D", title: "Client onboarding wizard configured for this offer", critical: false },
  { gate: "D", title: "Contractor handover plan written", detail: "What happens if the main contractor misses deadlines or leaves." },
  { gate: "D", title: "Playbooks written so a backup or account manager can run them from day one", critical: false },
  { gate: "D", title: "Month-3 referral ask in the engagement routine", critical: false },
  { gate: "D", title: "Web build handover includes the retainer offer", critical: false },

  // Gate E — Landing page & sales
  { gate: "E", title: "Dedicated landing page live", detail: "Headline, \"from $X/month\", what's included, named proof, call button + short form above the fold (27ADS §6)." },
  { gate: "E", title: "27ADS site audit issues fixed", detail: "Gatekeeping language, phone in header, reply-time promise, copyright year, NZDT." },
  { gate: "E", title: "≥ 1 named testimonial or case study" },
  { gate: "E", title: "Booking link for discovery calls" },
  { gate: "E", title: "Lead form → Incrementum Leads tested end to end", detail: "POST to /api/incrementum/leads." },
  { gate: "E", title: "A test lead arrived with gclid / UTM tags", metricKey: "tracked_leads", metricTarget: 1 },
  { gate: "E", title: "Instant new-lead alert + acknowledgement email working" },
  { gate: "E", title: "Response target set", detail: "Settings → response target (default 60 minutes)." },
  { gate: "E", title: "Discovery call script + qualification criteria" },
  { gate: "E", title: "Proposal → e-sign → deposit invoice flow tested" },
  { gate: "E", title: "Website-design section or page for the second ad group", critical: false },
  { gate: "E", title: "Referral offer in the onboarding and month-3 emails", critical: false },

  // Gate F — Tracking & measurement
  { gate: "F", title: "Google Ads conversion actions set up", detail: "Form submit, calls from ads, calls from site, booked calls." },
  { gate: "F", title: "GA4 + Tag Manager on the landing page, test conversions firing" },
  { gate: "F", title: "Call tracking (Google forwarding number) on" },
  { gate: "F", title: "Offline conversion upload process (gclid → won)", critical: false },
  { gate: "F", title: "27ADS benchmarks noted in Analytics" },
  { gate: "F", title: "Pass/kill lines confirmed in Experiments" },
  { gate: "F", title: "Base and stretch set (Goals)", detail: "Base $10k / Stretch $20k monthly profit by 31 Dec 2027 (Settings)." },
  { gate: "F", title: "Search-volume ceiling recorded", detail: "Monthly NZ searches × CPC for the chosen keywords (Settings → Search ceiling). Decides when extra money goes to Meta.", critical: false },

  // Gate G — Pilot client
  { gate: "G", title: "Outreach target list (≥ 30 businesses, Partner-sized first)" },
  { gate: "G", title: "Outreach sequence + call script", detail: "Outreach-Playbook.md." },
  { gate: "G", title: "Weekly outreach at ~20 businesses (from Nov 2026)", detail: "Each one entered as a lead, source Outreach.", metricKey: "outreach_week", metricTarget: 20, critical: false },
  { gate: "G", title: "First client signed through outreach", metricKey: "paying_clients", metricTarget: 1 },
  { gate: "G", title: "Full loop run once", detail: "Sell → onboard → contractor delivers → Max approves → report → invoice → client pays → contractor paid.", metricKey: "pilot_loop_complete", metricTarget: 1 },
  { gate: "G", title: "Pilot retro written; playbook and offer updated" },

  // Gate H — Google Ads build (27ADS §5)
  { gate: "H", title: "Keyword Planner: NZ cost per click checked", detail: "> $10 → reconsider Meta first." },
  { gate: "H", title: "One standard Search campaign at ~$25–33/day", detail: "Paced runway: ~$700–1,000/month for 2–3 months (Ad-Budget-Ladder.md)." },
  { gate: "H", title: "\"Include Google Display Network\" OFF" },
  { gate: "H", title: "\"Include Google search partners\" OFF" },
  { gate: "H", title: "Ad groups: ads management + website design", detail: "Plus one more if Keyword Planner supports it." },
  { gate: "H", title: "Long-tail keywords first", detail: "e.g. \"google ads for tradies Auckland\": cheaper, better intent." },
  { gate: "H", title: "Phrase and exact match only" },
  { gate: "H", title: "Negative keywords loaded", detail: "free, cheap, DIY, template, course, jobs, salary, tutorial" },
  { gate: "H", title: "Location targeting set (local region to start)" },
  { gate: "H", title: "Bidding: Maximise Clicks with a max CPC cap" },
  { gate: "H", title: "RSAs with a \"from $X/month\" headline" },
  { gate: "H", title: "Call + sitelink assets added" },
  { gate: "H", title: "Ad schedule matched to lead-response hours" },
  { gate: "H", title: "Billing set up on the GH account; budget alert on" },
  { gate: "H", title: "No Performance Max, Display, Demand Gen or YouTube" },

  // Gate I — Go-live
  { gate: "I", title: "Lead-response blocks in the calendar for the first 2 weeks" },
  { gate: "I", title: "Monday weekly review scheduled" },
  { gate: "I", title: "Spend tracking ready (Analytics → monthly ad figures)" },
  { gate: "I", title: "Launch date recorded in Settings", detail: "Switches Incrementum Home to live mode." },

  // Post-launch milestones (not counted in launch readiness)
  { gate: "P", title: "Week 1: search terms reviewed, negatives added, conversions firing", critical: false },
  { gate: "P", title: "Weeks 2–4: weekly optimisation, every change logged in Experiments", critical: false },
  { gate: "P", title: "Month-2 checkpoint passed ($800 spent)", detail: "≥ 4 leads, ≥ 2 qualified, landing conversion ≥ 3%. Fires at $800 spent, not on a date.", metricKey: "month2_checkpoint_passed", metricTarget: 1, critical: false },
  { gate: "P", title: "Month-2 checkpoint: ≥ 4 leads", metricKey: "leads_total", metricTarget: 4, critical: false },
  { gate: "P", title: "Month-2 checkpoint: ≥ 2 qualified leads", metricKey: "qualified_leads", metricTarget: 2, critical: false },
  { gate: "P", title: "Month-2 checkpoint: landing conversion ≥ 3%", metricKey: "landing_conversion", metricTarget: 3, critical: false },
  { gate: "P", title: "15–30 conversions → switch to Maximise Conversions", critical: false },
  { gate: "P", title: "First paid-ad client signed", metricKey: "ads_clients", metricTarget: 1, critical: false },
  { gate: "P", title: "Month 3: first client still active", metricKey: "max_months_retained", metricTarget: 3, critical: false },
];

export type PhaseSeed = {
  number: number;
  name: string;
  purpose: string;
  adBudget: string;
  services: string;
  clientMin: number;
  clientMax: number | null;
  contractorTarget: number;
  /** Days after the launch date (ads live). Null = no target date. */
  launchOffsetDays: number | null;
  criteria: { label: string; metricKey?: MetricKey; comparator?: "gte" | "lte"; target?: number }[];
  /** Pre-launch milestones carry absolute dates; launch-dependent ones carry an offset. */
  milestones: { title: string; dueDate?: string; launchOffsetDays?: number }[];
};

export const PHASE_SEED: PhaseSeed[] = [
  {
    number: 0,
    name: "Foundations",
    purpose: "Get set up: everything in the Launch checklist.",
    adBudget: "$0",
    services: "1",
    clientMin: 0,
    clientMax: 1,
    contractorTarget: 3,
    launchOffsetDays: 0,
    criteria: [
      { label: "Launch-critical checklist items done or N/A", metricKey: "launch_readiness_pct", target: 100 },
      { label: "≥ 3 confirmed contractors", metricKey: "contractors_confirmed", target: 3 },
      { label: "≥ 1 backup on the launch service", metricKey: "bench_top_service", target: 2 },
      { label: "Agreements signed by confirmed contractors", metricKey: "confirmed_with_agreements", target: 3 },
      { label: "Pilot loop completed once", metricKey: "pilot_loop_complete", target: 1 },
      { label: "A test lead arrived with tracking", metricKey: "tracked_leads", target: 1 },
    ],
    milestones: [
      { title: "Launch offer + price decided", dueDate: "2026-11-15" },
      { title: "3 contractors confirmed", dueDate: "2026-12-15" },
      { title: "Pilot client signed through outreach", dueDate: "2026-12-20" },
      { title: "Google Search ads live", launchOffsetDays: 0 },
    ],
  },
  {
    number: 1,
    name: "Prove",
    purpose: "Show that ads → clients → contractor delivery → profit works at all.",
    adBudget: "~$700–1,000/mo paced runway ($2k)",
    services: "1",
    clientMin: 1,
    clientMax: 3,
    contractorTarget: 3,
    launchOffsetDays: 170,
    criteria: [
      { label: "≥ 2 paying clients", metricKey: "paying_clients", target: 2 },
      { label: "≥ 1 client from ads", metricKey: "ads_clients", target: 1 },
      { label: "≥ 1 client retained 3 months (break-even)", metricKey: "max_months_retained", target: 3 },
      { label: "Avg profit per client at the pass line in each tier ($700 Partner · $450 Essentials)", metricKey: "tiers_below_pass_line", comparator: "lte", target: 0 },
      { label: "Month-2 checkpoint passed ($800 spent)", metricKey: "month2_checkpoint_passed", target: 1 },
      { label: "Max's hours ≤ 3 per client per month", metricKey: "max_hours_per_client", comparator: "lte", target: 3 },
      { label: "Landing page conversion ≥ 3%", metricKey: "landing_conversion", target: 3 },
      { label: "Close rate ≥ 10%", metricKey: "close_rate", target: 10 },
      { label: "Every contractor paid within 5 working days of the client (tick by hand)" },
      { label: "Phase 1 retro written (Experiments)" },
    ],
    milestones: [
      { title: "Month-2 checkpoint ($800 spent)" },
      { title: "First paid-ad client signed" },
      { title: "Break-even: one client retained 3 months" },
    ],
  },
  {
    number: 2,
    name: "Repeat",
    purpose: "Show it works reliably: retention, on-time delivery, Max out of delivery.",
    adBudget: "Reinvestment rule (25% retainer + 50% one-off profit)",
    services: "1",
    clientMin: 4,
    clientMax: 8,
    contractorTarget: 4,
    launchOffsetDays: 350,
    criteria: [
      { label: "≥ 6 active clients (held 4 weeks)", metricKey: "active_clients", target: 6 },
      { label: "No more than 1 client lost in 90 days", metricKey: "clients_lost_90d", comparator: "lte", target: 1 },
      { label: "Average stay trending toward 6+ months", metricKey: "avg_months_retained", target: 4 },
      { label: "On-time delivery ≥ 90%", metricKey: "delivered_on_time_pct", target: 90 },
      { label: "Monthly profit ≥ $5,000 (50% of the base)", metricKey: "monthly_profit", target: 5000 },
      { label: "Bench OK on every live service", metricKey: "bench_weakest_live", target: 2 },
      { label: "Weekly review streak ≥ 8", metricKey: "weekly_review_streak", target: 8 },
      { label: "Backup contractor has taken over an account successfully" },
      { label: "Second service chosen and its offer drafted" },
    ],
    milestones: [{ title: "Ad budget set from the reinvestment rule" }, { title: "4th contractor confirmed" }],
  },
  {
    number: 3,
    name: "Expand",
    purpose: "Add the second service; referrals as a second channel.",
    adBudget: "Reinvestment rule",
    services: "2",
    clientMin: 9,
    clientMax: 15,
    contractorTarget: 7,
    launchOffsetDays: 530,
    criteria: [
      { label: "≥ 12 active clients across 2 services", metricKey: "active_clients", target: 12 },
      { label: "Monthly profit ≥ $10,000, the base (2 consecutive months)", metricKey: "monthly_profit", target: 10000 },
      { label: "Bench OK on both services", metricKey: "bench_weakest_live", target: 2 },
      { label: "Second service has ≥ 3 clients and margin at or above the floor" },
      { label: "Account manager role written up and costed" },
    ],
    milestones: [{ title: "Second-service launch checklist (Gates A–F) complete" }],
  },
  {
    number: 4,
    name: "Delegate",
    purpose: "Max runs the business, not the accounts. Base reached; stretch in sight.",
    adBudget: "Reinvestment rule (~10–15% past ~15 clients)",
    services: "2–3",
    clientMin: 15,
    clientMax: null,
    contractorTarget: 10,
    launchOffsetDays: null,
    criteria: [],
    milestones: [{ title: "Base: $10k/month profit" }, { title: "Stretch: $20k/month profit" }],
  },
];

export type GoalSeed = {
  title: string;
  metricKey?: MetricKey;
  comparator?: "gte" | "lte";
  target?: number;
  periodStart?: string;
  periodEnd?: string;
  /** Launch-relative: period ends launch + N days (starts at launch unless periodStart is set). */
  launchOffsetDays?: number;
  isFreedom?: boolean;
  isStretch?: boolean;
  phaseNumber?: number;
};

const BY = "2027-12-31";
const FROM = "2026-10-24";

export const GOAL_SEED: GoalSeed[] = [
  { title: "Base: $10k/month profit from Incrementum", metricKey: "monthly_profit", target: 10000, periodStart: FROM, periodEnd: BY, isFreedom: true },
  { title: "Stretch: $20k/month profit from Incrementum", metricKey: "monthly_profit", target: 20000, periodStart: FROM, periodEnd: BY, isFreedom: true, isStretch: true },
  // Quarterly milestones (plan §1.1): active clients at the end of each quarter.
  { title: "Base: 2 active clients by end of March 2027", metricKey: "active_clients", target: 2, periodStart: FROM, periodEnd: "2027-03-31" },
  { title: "Base: 4 active clients by end of June 2027", metricKey: "active_clients", target: 4, periodStart: FROM, periodEnd: "2027-06-30" },
  { title: "Base: 8 active clients by end of September 2027", metricKey: "active_clients", target: 8, periodStart: FROM, periodEnd: "2027-09-30" },
  { title: "Base: 14 active clients by end of 2027", metricKey: "active_clients", target: 14, periodStart: FROM, periodEnd: BY },
  { title: "Stretch: 3 active clients by end of March 2027", metricKey: "active_clients", target: 3, periodStart: FROM, periodEnd: "2027-03-31", isStretch: true },
  { title: "Stretch: 7 active clients by end of June 2027", metricKey: "active_clients", target: 7, periodStart: FROM, periodEnd: "2027-06-30", isStretch: true },
  { title: "Stretch: 14 active clients by end of September 2027", metricKey: "active_clients", target: 14, periodStart: FROM, periodEnd: "2027-09-30", isStretch: true },
  { title: "Stretch: 25 active clients by end of 2027", metricKey: "active_clients", target: 25, periodStart: FROM, periodEnd: BY, isStretch: true },
  // Effort at the stretch pace (in Max's control, so these do raise "off pace").
  { title: "Outreach: 20 businesses a week", metricKey: "outreach_week", target: 20 },
  { title: "Add-on attach rate ≥ 50%", metricKey: "addon_attach_pct", target: 50, periodStart: "2027-03-01", periodEnd: BY },
  { title: "Clients from referrals ≥ 20%", metricKey: "referral_share_pct", target: 20, periodStart: "2027-03-01", periodEnd: BY },
  { title: "Average stay ≥ 12 months", metricKey: "avg_months_retained", target: 12, periodStart: "2027-03-01", periodEnd: BY },
  { title: "3 confirmed contractors incl. a backup", metricKey: "contractors_confirmed", target: 3, periodStart: "2026-10-18", periodEnd: "2026-12-15", phaseNumber: 0 },
  { title: "First client through outreach before ads", metricKey: "paying_clients", target: 1, periodStart: "2026-10-18", launchOffsetDays: 0, phaseNumber: 0 },
  { title: "Month-2 checkpoint ($800 spent): ≥ 2 qualified leads", metricKey: "qualified_leads", target: 2, launchOffsetDays: 60, phaseNumber: 1 },
  { title: "Break-even on the $2k ad runway", metricKey: "cumulative_profit_vs_spend", target: 0, launchOffsetDays: 170, phaseNumber: 1 },
];

export const TASK_LIST_SEED = ["Recruiting", "Offer & pricing", "Landing page", "Contracts & legal", "Ads setup"];

/** Catalogue-linked services. Expected quotes are planning guesses (plan §7.1.1). */
export type ServiceSeed = {
  key: string;
  serviceItemId: string | null;
  name: string;
  billing: "monthly" | "one_off" | "range";
  expectedQuote: number | null;
  usuallyWaived?: boolean;
  /** Which catalogue price column is this service's catalogue price. */
  cataloguePriceField?: "monthly" | "setup";
  ranges?: { label: string; min: number | null; max: number | null }[];
  tags?: string[];
  notes?: string;
};

const GUESS_NOTE = "Expected quote is a planning guess (2026-10-17). Replace it with real contractor quotes.";

export const SERVICE_SEED: ServiceSeed[] = [
  { key: "google_ads", tags: ["google-ads", "ppc", "paid-search"], serviceItemId: "ga-google-ads-mgmt", name: "Google Ads Management", billing: "monthly", expectedQuote: 500, cataloguePriceField: "monthly", notes: GUESS_NOTE },
  { key: "website_mgmt", tags: ["website", "web-maintenance"], serviceItemId: "ga-website-mgmt", name: "Website Management", billing: "monthly", expectedQuote: 225, cataloguePriceField: "monthly", notes: GUESS_NOTE },
  { key: "meta_ads", tags: ["meta-ads", "facebook", "instagram", "paid-social"], serviceItemId: "ga-meta-ads-mgmt", name: "Meta Ads Management", billing: "monthly", expectedQuote: 500, cataloguePriceField: "monthly", notes: GUESS_NOTE },
  { key: "newsletter", tags: ["email-marketing", "newsletter"], serviceItemId: "ga-newsletter-infra", name: "Newsletter Infrastructure", billing: "monthly", expectedQuote: 250, cataloguePriceField: "monthly", notes: GUESS_NOTE },
  { key: "ad_creative", tags: ["design", "ad-creative"], serviceItemId: "ga-ad-creative-design", name: "Ad Creative Design", billing: "monthly", expectedQuote: 325, cataloguePriceField: "monthly", notes: GUESS_NOTE },
  { key: "dashboard", tags: ["tracking", "reporting", "looker"], serviceItemId: "gs-tracking-dashboard", name: "Tracking & Reporting Dashboard", billing: "monthly", expectedQuote: 75, cataloguePriceField: "monthly", notes: GUESS_NOTE },
  { key: "dashboard_setup", tags: ["tracking", "reporting", "looker"], serviceItemId: "gs-tracking-dashboard", name: "Tracking & Reporting Dashboard setup", billing: "one_off", expectedQuote: 150, usuallyWaived: true, cataloguePriceField: "setup", notes: "Usually complimentary (Max, 2026-10-17). " + GUESS_NOTE },
  { key: "tracking_infra", tags: ["tracking", "ga4", "tag-manager"], serviceItemId: "gs-tracking-infra", name: "Tracking & Data Infrastructure", billing: "one_off", expectedQuote: 250, cataloguePriceField: "setup", notes: GUESS_NOTE },
  { key: "landing_page", tags: ["landing-page", "web-design", "cro"], serviceItemId: "ga-landing-page", name: "Landing Page Architecture", billing: "one_off", expectedQuote: 450, cataloguePriceField: "setup", notes: GUESS_NOTE },
  {
    key: "website_build",
    serviceItemId: null,
    name: "Website build",
    billing: "range",
    expectedQuote: null,
    tags: ["website", "web-design", "web-dev"],
    ranges: [
      { label: "Single page", min: 900, max: 1200 },
      { label: "< 5 pages", min: 1800, max: 2500 },
      { label: "< 10 pages", min: 3200, max: 4500 },
      { label: "< 19 pages", min: 5500, max: 7500 },
      { label: "20+ pages", min: 8500, max: null },
    ],
    notes: "Priced by page count (catalogue ga-webdev-* tiers). Apply contractor quote + markup per job.",
  },
];

export const PACKAGE_SEED: {
  name: string;
  description: string;
  status: "draft" | "live";
  recurring: string[];
  setup: { key: string; waived?: boolean }[];
}[] = [
  {
    name: "Foundation",
    description: "Launch offer (plan §7.1.1): Google Ads Management + Website Management, delivered by contractors.",
    status: "draft",
    recurring: ["google_ads", "website_mgmt"],
    setup: [{ key: "tracking_infra" }, { key: "landing_page" }, { key: "dashboard_setup", waived: true }],
  },
  {
    name: "Growth",
    description: "Step-up offer: Foundation + Meta Ads + Newsletter, for clients who suit Meta.",
    status: "draft",
    recurring: ["google_ads", "meta_ads", "website_mgmt", "newsletter"],
    setup: [{ key: "tracking_infra" }, { key: "landing_page" }, { key: "dashboard_setup", waived: true }],
  },
];

export const EXPERIMENT_SEED: { title: string; body: string; metricKey: MetricKey; passLine: string; killLine: string }[] = [
  { title: "Do ads bring leads?", body: "Month-2 checkpoint (~$800 spent).", metricKey: "qualified_leads", passLine: "≥ 4 leads, ≥ 2 qualified, landing conversion ≥ 3%", killLine: "< 2 leads or conversion < 2% → pause, fix offer/page" },
  { title: "Do leads buy?", body: "Close rate on qualified paid leads.", metricKey: "close_rate", passLine: "≥ 10%", killLine: "< 5% after 15+ qualified leads" },
  { title: "Is it worth it per client?", body: "Average profit per Partner client per month.", metricKey: "avg_profit_partner", passLine: "≥ $700/month", killLine: "< $400/month" },
  { title: "Is Essentials worth it?", body: "Average profit per Essentials client per month (added 2026-10-24).", metricKey: "avg_profit_essentials", passLine: "≥ $450/month", killLine: "< $300/month" },
  { title: "Do clients stay?", body: "Average months retained.", metricKey: "avg_months_retained", passLine: "≥ 6 months", killLine: "Clients leaving before month 3" },
  { title: "Is Max out of delivery?", body: "Max's hours per client per month.", metricKey: "max_hours_per_client", passLine: "≤ 3 hours", killLine: "> 6 hours" },
  { title: "Is it paying back?", body: "Cumulative profit vs ad spend.", metricKey: "cumulative_profit_vs_spend", passLine: "Break-even (1 client × 3 months)", killLine: "No client by end of month 4" },
];

export const PLAYBOOK_TEMPLATE = `## Client onboarding
-

## Access setup
- Client account linked under the Gray Horizon manager account (MCC)
- Contractor added as a user (never the client's own login)
- Credentials stored in the Vault

## Month-1 setup
-

## Monthly routine
-

## QA checklist (before anything reaches the client)
-

## Monthly report outline
-

## Handover notes (for a backup contractor)
-
`;

export const WELCOME_PACK_TEMPLATE = `## Welcome to the Gray Horizon Team

## How we work with clients
- Clients deal with Gray Horizon only. All client communication goes through Max or your @grayhorizon.nz alias.
- Never share personal contact details with a client.

## Brand rules
-

## Tools and access
-

## Quality standard
- Work goes to Max for approval before it reaches the client.

## How payment works
- You invoice Gray Horizon monthly.
- You're paid within 5 working days of the client paying.
`;
