import type { NextRequest } from "next/server";
import { headers } from "next/headers";

// Firebase App Hosting terminates TLS at a proxy in front of the Cloud Run
// container, which listens internally on 0.0.0.0:8080. `request.url` on
// that container reflects the internal socket, not the public origin, so
// `new URL(path, request.url)` silently redirects to 0.0.0.0:8080 instead
// of the real domain. The proxy does set x-forwarded-host/-proto correctly
// (standard Cloud Run behavior), so prefer those for building absolute
// redirect URLs; fall back to request.url for local dev, where there's no
// proxy in front and request.url is already correct.
export function absoluteUrl(path: string, request: NextRequest): URL {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return new URL(path, `${forwardedProto ?? "https"}://${forwardedHost}`);
  }
  return new URL(path, request.url);
}

// Same forwarded-host/proto problem as absoluteUrl above, but for server
// actions, which get no NextRequest — only the incoming request's headers
// via next/headers. Used to build an absolute link (e.g. the onboarding
// wizard's emailed portal-setup URL) from code that isn't a route handler.
export async function absoluteOriginFromHeaders(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const forwardedProto = h.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }
  return `${forwardedProto ?? "http"}://${h.get("host")}`;
}
