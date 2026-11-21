import { describe, it, expect } from "vitest";
import {
  PIPELINES,
  STAGES,
  guessPipeline,
  mapStage,
  nextStage,
  stageInPipeline,
  stageTaskRule,
  stagesOf,
  isClosedStage,
} from "@/config/pipeline";

describe("two pipelines (P1)", () => {
  it("keeps the original eight enum values first, in order", () => {
    expect(STAGES.slice(0, 8)).toEqual(["Identified", "Contacted", "Meeting booked", "Pitch delivered", "Proposal out", "Won", "Lost", "Dormant"]);
  });

  it("every pipeline stage is a database stage", () => {
    for (const p of Object.values(PIPELINES)) for (const s of stagesOf(p.key)) expect(STAGES).toContain(s);
  });

  it("services is unchanged", () => {
    expect(PIPELINES.services.open).toEqual(["Identified", "Contacted", "Meeting booked", "Pitch delivered", "Proposal out"]);
    expect(nextStage("services", "Proposal out")).toBe("Won");
    expect(nextStage("services", "Won")).toBeNull();
    expect(stageTaskRule("services", "Contacted")?.title).toBe("Follow up to book a meeting");
  });

  it("software runs past the sale to Live", () => {
    expect(nextStage("software", "Proposal out")).toBe("Signed");
    expect(nextStage("software", "Signed")).toBe("Setting up");
    expect(nextStage("software", "Setting up")).toBe("Live");
    expect(nextStage("software", "Live")).toBeNull();
    expect(nextStage("software", "Lost")).toBeNull();
    expect(stageTaskRule("software", "Contacted")?.title).toBe("Book the discovery call");
    expect(stageTaskRule("software", "Live")).toBeNull();
    expect(isClosedStage("Live")).toBe(true);
    expect(isClosedStage("Setting up")).toBe(false);
  });

  it("rejects a stage from the other pipeline", () => {
    expect(stageInPipeline("software", "Pitch delivered")).toBe(false);
    expect(stageInPipeline("services", "Demo sent")).toBe(false);
    expect(stageInPipeline("software", "Contacted")).toBe(true);
    expect(stageInPipeline("services", "Lost")).toBe(true);
  });

  it("maps a stage to the nearest one when a deal switches pipeline", () => {
    expect(mapStage("Identified", "software")).toBe("Inquired");
    expect(mapStage("Won", "software")).toBe("Signed");
    expect(mapStage("Proposal out", "software")).toBe("Proposal out");
    expect(mapStage("Demo sent", "services")).toBe("Pitch delivered");
    expect(mapStage("Live", "services")).toBe("Won");
  });

  it("guesses software from the package name", () => {
    expect(guessPipeline("Osseus + Fergus connector")).toBe("software");
    expect(guessPipeline("Vigil")).toBe("software");
    expect(guessPipeline("Foundation")).toBe("services");
    expect(guessPipeline("Shopping Ad Setup")).toBe("services");
    expect(guessPipeline(null)).toBe("services");
  });
});
