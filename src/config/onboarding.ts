// Single source of truth for the starter task list a new client gets
// (Phase 5 brief §2) — same "one place, not scattered across the UI"
// pattern as STAGE_TASK_RULES in config/pipeline.ts. Replaced 2026-08-28
// with Max's own admin onboarding checklist (Open-Work-Brief.md §4.6) —
// this is that checklist, not a separate feature: "the wizard's own steps
// replace ONBOARDING_TASK_TEMPLATE" was the earlier assumption, but Max
// settled it this session ("Checklist IS the replacement") — the
// client-facing wizard (src/components/onboardingWizard/) never touches
// task generation; this array is the only thing that does.
//
// "Run website SEO growth auditor" has no automation behind it anywhere in
// this app (grepped, nothing) — it's a plain task title like every other
// item here until Max decides whether that's a manual process to track or
// a real capability to build.
export const ONBOARDING_TASK_TEMPLATE: { title: string; dueInDays: number }[] = [
  { title: "Add MSA to client portal", dueInDays: 2 },
  { title: "Connect invoice/Xero contact to client portal", dueInDays: 3 },
  { title: "Client Portal: Fill in current tasks", dueInDays: 3 },
  { title: "Client Portal: Fill credentials", dueInDays: 3 },
  { title: "Client Portal: Occupy Roadmap", dueInDays: 5 },
  { title: "Client Portal: add any current/discussed strategies", dueInDays: 5 },
  { title: "Client Portal: fill toolstack", dueInDays: 5 },
  { title: "Client Portal: add meeting summaries", dueInDays: 7 },
  { title: "Setup Looker Studio and connect to client portal", dueInDays: 7 },
  { title: "Run website SEO growth auditor, and add to client portal", dueInDays: 10 },
];

// Pre-fills the admin's review/edit step before an onboarding-wizard invite
// actually sends (Open-Work-Brief.md §4, §9.2 — "invite email gets a review/
// edit step before sending, not automatic the instant onboardClient()
// runs"). Plain constants, not a DB-backed emailTemplates row: this is a
// one-off admin-composed message, not a reusable campaign template (§2.9's
// "no visual template builder" posture). The link itself is appended
// separately by sendOnboardingInvite — never part of this editable body.
export function defaultOnboardingInviteEmail(clientName: string): { subject: string; body: string } {
  return {
    subject: `Welcome to Gray Horizon, ${clientName}`,
    body: `<p>Hi ${clientName},</p><p>We're excited to have you on board. Click below to set up access to your Gray Horizon client portal.</p>`,
  };
}
