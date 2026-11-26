import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature, parseEvent, firstTime, milestoneMoves, milestoneLine, MILESTONE_STAGE, leadOf, matchLead, greetingName } from "@/lib/dal/osseusLink";

describe("website enquiries and alerts", () => {
  const id = "a903d1cd-4714-4870-8bf0-21ab2ec83e71";
  const enquiry = {
    type: "website.enquiry", submissionId: id, origin: "book-a-call", product: "Osseus",
    name: "Kim Lee", business: "", email: "kim@example.nz", phone: "", message: "Hi", page: "/osseus",
  };

  it("reads an enquiry, and refuses one with no submission id or a made-up origin", () => {
    expect(parseEvent(enquiry)).not.toBeNull();
    expect(parseEvent({ ...enquiry, submissionId: undefined })).toBeNull();
    expect(parseEvent({ ...enquiry, origin: "marketing" })).toBeNull();
  });
  it("still reads a walkthrough with or without a submission id", () => {
    const w = { type: "walkthrough.requested", name: "Kim", business: "Gym", email: "kim@example.nz", phone: "", message: "", demoTitle: "", demoUrl: "" };
    expect(parseEvent(w)).not.toBeNull();
    expect(parseEvent({ ...w, submissionId: id })).not.toBeNull();
  });
  it("reads a GH alert, which can't name a recipient", () => {
    const e = parseEvent({ type: "gh.alert", subject: "S", text: "T", to: "someone@else.nz" });
    expect(e).not.toBeNull();
    expect(e).not.toHaveProperty("to");
  });
  it("gives a website enquiry the 48-hour reply and an acknowledgment, a waitlist move neither", () => {
    const book = leadOf(parseEvent(enquiry) as never);
    expect(book).toMatchObject({ source: "Website: Book a call", replyInDays: 2, acknowledge: true });
    expect(book.story).toContain("(from /osseus)");
    const wait = leadOf(parseEvent({ ...enquiry, origin: "waitlist", product: "Vigil" }) as never);
    expect(wait).toMatchObject({ source: "Waitlist: Vigil", product: "Vigil", replyInDays: 1, acknowledge: false });
  });
  it("adds to an open deal before making anything new", () => {
    expect(matchLead({}, {})).toBe("add to open deal");
    expect(matchLead(undefined, {})).toBe("new deal");
    expect(matchLead(undefined, undefined)).toBe("new company");
  });
  it("never greets someone with a link typed into the name box", () => {
    expect(greetingName("Kim Lee")).toBe("Kim");
    expect(greetingName("www.spam.example now")).toBe("there");
    expect(greetingName("<b>x</b>")).toBe("there");
  });
});

// The Osseus → GrayPortal link (BUILD-PLAN P1): signed status events.
const secret = "s".repeat(40);
const signed = (ts: string, body: string) => createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

describe("Osseus link signature", () => {
  const now = 1_800_000_000_000;
  const ts = String(now);
  const body = '{"type":"demo.opened"}';

  it("accepts Osseus's signature", () => {
    expect(verifySignature(secret, ts, signed(ts, body), body, now)).toBe(true);
  });
  it("refuses a changed body, a wrong secret, or an old request", () => {
    expect(verifySignature(secret, ts, signed(ts, body), body + " ", now)).toBe(false);
    expect(verifySignature("t".repeat(40), ts, signed(ts, body), body, now)).toBe(false);
    expect(verifySignature(secret, ts, signed(ts, body), body, now + 6 * 60_000)).toBe(false);
    expect(verifySignature(secret, null, signed(ts, body), body, now)).toBe(false);
    expect(verifySignature(secret, ts, "nothex", body, now)).toBe(false);
  });
});

describe("Osseus events", () => {
  it("reads the three events and nothing else", () => {
    expect(parseEvent({ type: "demo.published", dealId: "a903d1cd-4714-4870-8bf0-21ab2ec83e71", title: "X", url: "https://demo.grayhorizon.nz/x-abc123/", expires: null })).not.toBeNull();
    expect(parseEvent({ type: "demo.opened", dealId: "a903d1cd-4714-4870-8bf0-21ab2ec83e71", title: "X", url: "u", opens: 2, first: false })).not.toBeNull();
    expect(parseEvent({ type: "walkthrough.requested", name: "Kim", business: "Kim's Gym", email: "kim@example.nz", phone: "", message: "", demoTitle: "", demoUrl: "" })).not.toBeNull();
    expect(parseEvent({ type: "contacts.export" })).toBeNull();
    expect(parseEvent({ type: "demo.opened", dealId: "not-a-uuid", title: "X", url: "u", opens: 1, first: true })).toBeNull();
  });
  it("reads the O8 e milestones", () => {
    const dealId = "a903d1cd-4714-4870-8bf0-21ab2ec83e71";
    expect(parseEvent({ type: "terms.accepted", dealId, workspace: "Kim's Gym", documents: "Osseus subscription terms v1", acceptedAt: "2026-11-23T01:00:00Z" })).not.toBeNull();
    expect(parseEvent({ type: "setup.complete", dealId, workspace: "Kim's Gym", steps: 6 })).not.toBeNull();
    expect(parseEvent({ type: "setup.complete", dealId: "x", workspace: "Kim's Gym", steps: 6 })).toBeNull();
    expect(parseEvent({ type: "terms.accepted", dealId, workspace: "", documents: "x", acceptedAt: "" })).toBeNull();
  });
  it("ignores the same event id twice", () => {
    expect(firstTime("evt-1")).toBe(true);
    expect(firstTime("evt-1")).toBe(false);
  });
});

describe("O8 e: milestones move Software deals forward only", () => {
  it("maps each milestone to Max's stage", () => {
    expect(MILESTONE_STAGE).toEqual({ "terms.accepted": "Signed", "setup.complete": "Live" });
  });
  it("moves forward from any earlier stage", () => {
    expect(milestoneMoves("software", "Proposal out", "Signed")).toBe(true);
    expect(milestoneMoves("software", "Walkthrough", "Signed")).toBe(true);
    expect(milestoneMoves("software", "Setting up", "Live")).toBe(true);
    expect(milestoneMoves("software", "Signed", "Live")).toBe(true);
  });
  it("never moves back, sideways or out of a closed deal", () => {
    expect(milestoneMoves("software", "Setting up", "Signed")).toBe(false);
    expect(milestoneMoves("software", "Live", "Live")).toBe(false);
    expect(milestoneMoves("software", "Lost", "Signed")).toBe(false);
    expect(milestoneMoves("software", "Dormant", "Live")).toBe(false);
    expect(milestoneMoves("services", "Proposal out", "Signed")).toBe(false);
  });
  it("writes a plain line on the deal", () => {
    const dealId = "a903d1cd-4714-4870-8bf0-21ab2ec83e71";
    expect(milestoneLine({ type: "terms.accepted", dealId, workspace: "Kim's Gym", documents: "Osseus subscription terms v1", acceptedAt: "2026-11-23T01:00:00Z" }))
      .toBe("Kim's Gym's owner accepted the terms in Osseus: Osseus subscription terms v1 (2026-11-23).");
    expect(milestoneLine({ type: "setup.complete", dealId, workspace: "Kim's Gym", steps: 6 })).toBe("Kim's Gym finished Getting started in Osseus (all 6 steps).");
  });
});
