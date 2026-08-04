// Simple in-memory fixed-window rate limiter (brief §5.6: "rate limiting
// on auth endpoints and all mutations"). Deliberately not backed by Redis
// or similar — this app runs on 0-2 Cloud Run instances at solo-admin
// scale, and an extra stateful dependency isn't worth it yet (brief §5.5:
// "every added package is attack surface"). Per-instance memory means the
// effective limit is roughly limit×instanceCount, which is an acceptable
// trade at this scale — revisit if traffic or instance count grows.

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

// Prevent unbounded growth from one-off IPs — sweep occasionally rather
// than on every request.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
