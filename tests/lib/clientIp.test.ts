import { describe, it, expect } from "vitest";
import { clientIpFrom } from "@/lib/clientIp";

describe("clientIpFrom", () => {
  it("picks the caller, not Google's changing last entry", () => {
    expect(clientIpFrom("203.0.113.9, 35.191.12.34")).toBe("203.0.113.9");
  });
  it("ignores a fake value the caller put first", () => {
    expect(clientIpFrom("6.6.6.6, 203.0.113.9, 35.191.99.1")).toBe("203.0.113.9");
    expect(clientIpFrom("1.1.1.1, 2.2.2.2, 203.0.113.9, 35.191.99.1")).toBe("203.0.113.9");
  });
  it("falls back with no header or a short one (local dev)", () => {
    expect(clientIpFrom(null)).toBeNull();
    expect(clientIpFrom("127.0.0.1")).toBe("127.0.0.1");
  });
});
