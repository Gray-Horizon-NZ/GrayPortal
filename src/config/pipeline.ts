// Single source of truth for pipeline stages and the task each stage change
// auto-creates (brief §7.2/§7.3 — configurable in one place, not scattered
// across the UI). db/schema.ts derives its pgEnum from STAGES so the database
// enforces the same list; the Terminal screens (src/terminal/format.js) read
// the same lists from here.
//
// P1 (BUILD-PLAN, 21 Nov 2026): two pipelines. Services (ads, websites,
// retainers) keeps the original stages. Software (Osseus, modules, Vigil)
// sells differently: a demo and a walkthrough before the proposal, and the
// deal carries on after the sale through Signed → Setting up → Live.
// Building only after Signed, never on spec.

export const PIPELINE_KEYS = ["services", "software"] as const;
export type PipelineKey = (typeof PIPELINE_KEYS)[number];

// Every stage either pipeline uses, in enum order. The first eight are the
// original enum values; the rest were appended by migration 0044 (Postgres
// only appends enum values, so this order is fixed now).
export const STAGES = [
  "Identified",
  "Contacted",
  "Meeting booked",
  "Pitch delivered",
  "Proposal out",
  "Won",
  "Lost",
  "Dormant",
  "Inquired",
  "Discovery call",
  "Demo sent",
  "Walkthrough",
  "Signed",
  "Setting up",
  "Live",
] as const;

export type Stage = (typeof STAGES)[number];

export type PipelineDef = {
  key: PipelineKey;
  label: string;
  /** Before the sale: these count toward the open and weighted pipeline. */
  open: readonly Stage[];
  /** The stage that means "they said yes" (win rate, won-by-month, the services welcome email). */
  win: Stage;
  /** After the win, still being worked (software only): Signed, Setting up. */
  after: readonly Stage[];
  /** The order Advance walks through: open, then win, then after, then done. */
  flow: readonly Stage[];
  /** Finished: no Advance, no overdue next action. */
  closed: readonly Stage[];
  /** Default close probability per open stage, when a deal has none of its own. */
  prob: Partial<Record<Stage, number>>;
  /** What a new deal in this pipeline starts at. */
  first: Stage;
};

export const PIPELINES: Record<PipelineKey, PipelineDef> = {
  services: {
    key: "services",
    label: "Services",
    open: ["Identified", "Contacted", "Meeting booked", "Pitch delivered", "Proposal out"],
    win: "Won",
    after: [],
    flow: ["Identified", "Contacted", "Meeting booked", "Pitch delivered", "Proposal out", "Won"],
    closed: ["Won", "Lost", "Dormant"],
    prob: { Identified: 0.05, Contacted: 0.1, "Meeting booked": 0.25, "Pitch delivered": 0.4, "Proposal out": 0.6 },
    first: "Identified",
  },
  software: {
    key: "software",
    label: "Software",
    open: ["Inquired", "Contacted", "Discovery call", "Demo sent", "Walkthrough", "Proposal out"],
    win: "Signed",
    after: ["Signed", "Setting up"],
    flow: ["Inquired", "Contacted", "Discovery call", "Demo sent", "Walkthrough", "Proposal out", "Signed", "Setting up", "Live"],
    closed: ["Live", "Lost", "Dormant"],
    prob: { Inquired: 0.05, Contacted: 0.1, "Discovery call": 0.2, "Demo sent": 0.3, Walkthrough: 0.45, "Proposal out": 0.6 },
    first: "Inquired",
  },
};

export function pipelineOf(key: string | null | undefined): PipelineDef {
  return PIPELINES[key === "software" ? "software" : "services"];
}

/** Every stage a deal in this pipeline can sit at, Lost and Dormant included. */
export function stagesOf(key: string | null | undefined): Stage[] {
  const p = pipelineOf(key);
  return [...new Set<Stage>([...p.flow, ...p.closed])];
}

export function stageInPipeline(key: string | null | undefined, stage: Stage): boolean {
  return stagesOf(key).includes(stage);
}

/** The stage Advance moves to, or null at the end of the flow (or when closed out). */
export function nextStage(key: string | null | undefined, stage: Stage): Stage | null {
  const p = pipelineOf(key);
  if (stage === "Lost" || stage === "Dormant") return null;
  const i = p.flow.indexOf(stage);
  return i >= 0 && i < p.flow.length - 1 ? p.flow[i + 1] : null;
}

// A stage in one pipeline and its nearest stage in the other, for moving a
// deal between pipelines (and for sorting existing deals in migration 0044).
const SERVICES_TO_SOFTWARE: Partial<Record<Stage, Stage>> = {
  Identified: "Inquired",
  "Meeting booked": "Discovery call",
  "Pitch delivered": "Walkthrough",
  Won: "Signed",
};
const SOFTWARE_TO_SERVICES: Partial<Record<Stage, Stage>> = {
  Inquired: "Identified",
  "Discovery call": "Meeting booked",
  "Demo sent": "Pitch delivered",
  Walkthrough: "Pitch delivered",
  Signed: "Won",
  "Setting up": "Won",
  Live: "Won",
};

export function mapStage(stage: Stage, to: PipelineKey): Stage {
  if (stageInPipeline(to, stage)) return stage;
  return (to === "software" ? SERVICES_TO_SOFTWARE : SOFTWARE_TO_SERVICES)[stage] ?? PIPELINES[to].first;
}

/** Best guess for a new deal's pipeline from its package name. Max can switch it on the deal. */
export function guessPipeline(packageTier: string | null | undefined): PipelineKey {
  return /osseus|vigil|nuntius|mercator|meridian|tempus|solus|grayscale|module|software|crm/i.test(packageTier ?? "")
    ? "software"
    : "services";
}

// Closed in either pipeline: no overdue next actions, not an open deal on
// the client health score.
export const CLOSED_STAGES: readonly Stage[] = ["Won", "Lost", "Dormant", "Live"];
// Pre-sale in either pipeline (open + weighted totals across both).
export const OPEN_STAGES: readonly Stage[] = [...new Set<Stage>([...PIPELINES.services.open, ...PIPELINES.software.open])];
// Said yes, in either pipeline.
export const WON_STAGES: readonly Stage[] = ["Won", "Signed", "Setting up", "Live"];
// Default close probability for any open stage (the two maps agree on shared stages).
export const STAGE_PROB: Partial<Record<Stage, number>> = { ...PIPELINES.services.prob, ...PIPELINES.software.prob };

export function isClosedStage(stage: Stage): boolean {
  return CLOSED_STAGES.includes(stage);
}

// The task auto-created when a deal moves into a given stage. `null` means
// no automatic task for that stage (e.g. terminal stages). Contacted and
// Proposal out are shared, so their task depends on the pipeline.
type TaskRule = { title: string; dueInDays: number } | null;
const SERVICES_TASKS: Partial<Record<Stage, TaskRule>> = {
  Identified: { title: "Make first contact", dueInDays: 2 },
  Contacted: { title: "Follow up to book a meeting", dueInDays: 5 },
  "Meeting booked": { title: "Prepare for meeting", dueInDays: 1 },
  "Pitch delivered": { title: "Follow up on pitch", dueInDays: 3 },
  "Proposal out": { title: "Follow up on proposal", dueInDays: 5 },
};
const SOFTWARE_TASKS: Partial<Record<Stage, TaskRule>> = {
  Inquired: { title: "Reply to the enquiry", dueInDays: 1 },
  Contacted: { title: "Book the discovery call", dueInDays: 5 },
  "Discovery call": { title: "Build and send their demo", dueInDays: 2 },
  "Demo sent": { title: "Follow up and book the walkthrough", dueInDays: 3 },
  Walkthrough: { title: "Send the proposal", dueInDays: 2 },
  "Proposal out": { title: "Follow up on proposal", dueInDays: 5 },
  Signed: { title: "Run the setup wizard and send the invite", dueInDays: 1 },
  "Setting up": { title: "Check their Getting started progress", dueInDays: 7 },
};

export function stageTaskRule(pipeline: string | null | undefined, stage: Stage): TaskRule {
  return (pipeline === "software" ? SOFTWARE_TASKS : SERVICES_TASKS)[stage] ?? null;
}
