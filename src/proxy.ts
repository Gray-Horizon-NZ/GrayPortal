import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/dal/constants";
import { isRateLimited } from "@/lib/rateLimit";

// Deny-by-default route protection (brief §5.2). Every route not listed in
// PUBLIC_PATHS requires a valid, unexpired Firebase session cookie. A newly
// added route with no configuration is locked, not open, because the
// matcher below covers everything and PUBLIC_PATHS is an explicit opt-out
// list, not the reverse.
//
// This only proves "a valid Firebase session exists" — it does NOT check
// the allowlist or role (that needs Postgres, and happens in
// src/lib/dal/session.ts's withSession, re-verified on every DAL call).
// Both layers are required; this is the network-boundary half.
const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function clientKey(request: NextRequest): string {
  // Cloud Run/App Hosting sits behind a proxy — the real client IP arrives
  // via x-forwarded-for, not request.ip (which Next.js no longer exposes).
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting (brief §5.6: auth endpoints + all mutations). Server
  // Actions are POSTs to ordinary page routes, so "any POST" is the one
  // place that sees every mutation without needing per-route wiring.
  if (pathname.startsWith("/api/auth/session")) {
    if (isRateLimited(`auth:${clientKey(request)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many attempts, slow down." }, { status: 429 });
    }
  } else if (request.method === "POST") {
    if (isRateLimited(`mutate:${clientKey(request)}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
    }
  }

  if (pathname.startsWith("/api/auth/session") || isPublic(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await adminAuth.verifySessionCookie(cookie, true);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
