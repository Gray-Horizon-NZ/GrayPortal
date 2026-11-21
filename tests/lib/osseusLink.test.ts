import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature, parseEvent, firstTime } from "@/lib/dal/osseusLink";

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
  it("ignores the same event id twice", () => {
    expect(firstTime("evt-1")).toBe(true);
    expect(firstTime("evt-1")).toBe(false);
  });
});
