import type { NextRequest } from "next/server";

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
