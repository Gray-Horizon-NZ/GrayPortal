// Single source of truth for pipeline stages and the task each stage change
// auto-creates (brief §7.2/§7.3 — configurable in one place, not scattered
// across the UI). db/schema.ts derives its pgEnum from STAGES so the database
// enforces the same list.

export const STAGES = [
  "Identified",
  "Contacted",
  "Meeting booked",
  "Pitch delivered",
  "Proposal out",
  "Won",
  "Lost",
  "Dormant",
] as const;

export type Stage = (typeof STAGES)[number];

export const CLOSED_STAGES: readonly Stage[] = ["Won", "Lost", "Dormant"];

export function isClosedStage(stage: Stage): boolean {
  return CLOSED_STAGES.includes(stage);
}

// The task auto-created when a deal moves into a given stage. `null` means
// no automatic task for that stage (e.g. terminal stages).
export const STAGE_TASK_RULES: Record<Stage, { title: string; dueInDays: number } | null> = {
  Identified: { title: "Make first contact", dueInDays: 2 },
  Contacted: { title: "Follow up to book a meeting", dueInDays: 5 },
  "Meeting booked": { title: "Prepare for meeting", dueInDays: 1 },
  "Pitch delivered": { title: "Follow up on pitch", dueInDays: 3 },
  "Proposal out": { title: "Follow up on proposal", dueInDays: 5 },
  Won: null,
  Lost: null,
  Dormant: null,
};
