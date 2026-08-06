import { describe, it, expect } from "vitest";
import { requireClientScope, type Caller } from "@/lib/dal/session";

// Phase 2 brief §5: "a client-role query with no client_id scope must fail
// the same way an unscoped admin-wide query requires the audited escape
// hatch, not silently return nothing or, worse, everything."

function caller(overrides: Partial<Caller>): Caller {
  return {
    userId: "user-1",
    role: "client",
    clientId: "client-1",
    email: "client@example.com",
    displayName: null,
    ...overrides,
  };
}

describe("requireClientScope", () => {
  it("passes for a client-role caller with a clientId", () => {
    expect(() => requireClientScope(caller({}))).not.toThrow();
  });

  it("throws for a client-role caller with no clientId", () => {
    expect(() => requireClientScope(caller({ clientId: null }))).toThrow();
  });

  it("throws for a non-client-role caller", () => {
    expect(() => requireClientScope(caller({ role: "admin", clientId: null }))).toThrow();
  });
});
