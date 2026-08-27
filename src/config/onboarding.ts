// Single source of truth for the starter task list a new client gets
// (Phase 5 brief §2) — same "one place, not scattered across the UI"
// pattern as STAGE_TASK_RULES in config/pipeline.ts.
export const ONBOARDING_TASK_TEMPLATE: { title: string; dueInDays: number }[] = [
  { title: "Kickoff call", dueInDays: 2 },
  { title: "Gather brand assets and access", dueInDays: 3 },
  { title: "Confirm client portal access", dueInDays: 5 },
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
