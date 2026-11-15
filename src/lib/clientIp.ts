// The caller's real address, for rate limits and sign-in records.
//
// X-Forwarded-For is a list. Anyone can send their own, and each proxy adds
// the address it saw to the END, so the first entry is whatever the caller
// wrote. Firebase App Hosting adds two entries: the caller as Google's front
// end saw them, then a Google address that changes on every request. So the
// caller is 2 from the end. Found on Osseus production 15 Nov 2026 (same
// hosting); GrayScale/platform/SECURITY-PLAN.md 1.5. CLIENT_IP_HOPS overrides.

const DEFAULT_HOPS = 2;

function hops(): number {
  const n = Number(process.env.CLIENT_IP_HOPS ?? DEFAULT_HOPS);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : DEFAULT_HOPS;
}

export function clientIpFrom(forwardedFor: string | null | undefined, trustedHops = hops()): string | null {
  const list = (forwardedFor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) return null;
  // Fewer entries than hops: not through the front end (local dev)
  return list[Math.max(0, list.length - trustedHops)];
}
