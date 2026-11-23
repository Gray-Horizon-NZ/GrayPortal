import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { parseEvent, termsLine } from "@/lib/dal/osseusLink";
import { applyPriceList, signPrices } from "@/lib/dal/osseusPrices";

// GrayScale J3: GrayPortal reads Osseus's price list (signed "prices.<ts>"),
// and Osseus tells the deal what the client pays (workspace.terms).
const secret = "s".repeat(40);
const dealId = "0b4f7c1e-1111-4222-8333-944455556666";

describe("price list read", () => {
  it("signs prices.<ts>, which Osseus checks (src/core/demos/grayportal-link.ts verifyGrayPortal)", () => {
    const ts = "1800000000000";
    expect(signPrices(secret, ts)).toBe(createHmac("sha256", secret).update(`prices.${ts}`).digest("hex"));
    // Not the same as an event signature over an empty body, so neither passes for the other
    expect(signPrices(secret, ts)).not.toBe(createHmac("sha256", secret).update(`${ts}.`).digest("hex"));
  });
  it("refuses a list without Osseus in it, before touching the table", async () => {
    await expect(applyPriceList({ at: "2026-11-23", products: [{ key: "vigil", name: "Vigil", category: "Watchdog", monthly: 97, desc: "", sort: 0 }] })).rejects.toThrow(/without Osseus/);
  });
});

describe("workspace.terms", () => {
  const e = { type: "workspace.terms", dealId, workspace: "Kauri Road Auto", monthly: 425, billingFrom: "2027-02-01", setup: null, setupHourly: true, freeMonths: 2, commitment: 6, created: true };
  it("parses", () => {
    expect(parseEvent(e)).toMatchObject({ type: "workspace.terms", monthly: 425 });
    expect(parseEvent({ ...e, billingFrom: "soon" })).toBeNull();
  });
  type Terms = Extract<NonNullable<ReturnType<typeof parseEvent>>, { type: "workspace.terms" }>;
  it("reads as the Xero line on the deal", () => {
    const line = termsLine(parseEvent(e) as Terms);
    expect(line).toBe("Workspace created in Osseus (Kauri Road Auto): $425 a month from 2027-02-01 (Xero repeating invoice, no GST), 2 free months first, setup by the hour at $80, 6-month commitment.");
    const waived = termsLine({ ...(parseEvent(e) as Terms), setup: 0, setupHourly: false, freeMonths: 0, commitment: 0, created: false, monthly: 52.5 });
    expect(waived).toBe("Deal terms changed in Osseus (Kauri Road Auto): $52.50 a month from 2027-02-01 (Xero repeating invoice, no GST), setup waived.");
  });
});
