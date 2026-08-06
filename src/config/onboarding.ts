// Single source of truth for the starter task list a new client gets
// (Phase 5 brief §2) — same "one place, not scattered across the UI"
// pattern as STAGE_TASK_RULES in config/pipeline.ts.
export const ONBOARDING_TASK_TEMPLATE: { title: string; dueInDays: number }[] = [
  { title: "Kickoff call", dueInDays: 2 },
  { title: "Gather brand assets and access", dueInDays: 3 },
  { title: "Confirm client portal access", dueInDays: 5 },
];
