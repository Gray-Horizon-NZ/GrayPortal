import { describe, it, expect } from "vitest";
import { claimOrVerifyAllowlist } from "@/lib/dal/allowlist";
import { NotOnAllowlistError } from "@/lib/dal/session";
import { withSession } from "@/lib/dal/session";

// Covers brief §5.8: "an unauthenticated request to a protected route is
// rejected" and "a user not on the allowlist is rejected". The DAL layer
// (not proxy.ts, which needs a live Firebase ID token to test end-to-end)
// is where the allowlist check is actually enforced.

describe("Allowlist (brief §5.8)", () => {
  it("rejects a Google account with no matching users row", async () => {
    await expect(
      claimOrVerifyAllowlist("not-on-the-allowlist@example.com", "some-random-uid")
    ).rejects.toThrow(NotOnAllowlistError);
  });

  it("withSession rejects a UID with no matching (claimed) users row", async () => {
    await expect(
      withSession("uid-that-has-never-signed-in", async () => "should not reach here")
    ).rejects.toThrow(NotOnAllowlistError);
  });
});
