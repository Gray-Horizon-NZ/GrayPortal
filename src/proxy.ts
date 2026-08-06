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

// Client-facing routes live under a distinct prefix so route separation
// from the internal (app) group doesn't need PUBLIC_PATHS-style special
// casing per route (Phase 2 brief §3). The role check below is a routing
// hint only, sourced from the Firebase custom claims stamped at claim time
// (see src/lib/dal/allowlist.ts) — it decides which shell a session lands
// on, never whether a query is allowed to return data. That's still RLS,
// re-evaluated per request, independent of anything proxy.ts believes.
const PORTAL_PREFIX = "/portal";

function isPortalPath(pathname: string) {
  return pathname === PORTAL_PREFIX || pathname.startsWith(`${PORTAL_PREFIX}/`);
}

// Routes that enforce their own auth (a bearer-token check) instead of the
// cookie-redirect model, because the caller isn't a browser and can't
// follow a redirect to /login. Still deny-by-default in the sense that the
// route itself 401s without the right token — this list only opts them out
// of the cookie redirect, not out of authentication entirely.
//
// /api/mcp (exact path only — NOT /api/mcp/token, which is called from an
// already-authenticated browser session and stays behind the normal cookie
// gate below) is here for that reason (Phase 4 brief §2), even though its
// bearer token is verified exactly like the session cookie, not a separate
// secret like /api/cron's CRON_SECRET — an MCP client still can't follow an
// HTML redirect, so the route itself (via getVerifiedUid's Bearer fallback,
// src/lib/dal/auth.ts) has to be the enforcement point either way.
const BEARER_AUTH_EXACT_PATHS = ["/api/mcp"];
const BEARER_AUTH_PREFIX_PATHS = ["/api/cron"];

// Genuinely public — no Firebase session, no bearer token, callable by
// anyone on the internet (Phase 11's website inquiry form intake). The
// route itself applies its own soft protections (honeypot, optional
// shared-secret header); this list only opts it out of the cookie
// redirect, same caveat as BEARER_AUTH_EXACT_PATHS above.
const TRULY_PUBLIC_EXACT_PATHS = ["/api/leads"];

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
  if (pathname.startsWith("/api/auth/session") || pathname.startsWith("/api/auth/claim")) {
    if (isRateLimited(`auth:${clientKey(request)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many attempts, slow down." }, { status: 429 });
    }
  } else if (pathname.startsWith("/api/leads")) {
    // Tighter than the generic mutate bucket below — this is the one
    // endpoint reachable by anyone on the internet, not just an
    // authenticated caller, so it's the most exposed to spam/abuse.
    if (isRateLimited(`leads:${clientKey(request)}`, 5, 10 * 60_000)) {
      return NextResponse.json({ error: "Too many submissions, try again later." }, { status: 429 });
    }
  } else if (request.method === "POST") {
    if (isRateLimited(`mutate:${clientKey(request)}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
    }
  }

  if (
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/auth/claim") ||
    isPublic(pathname) ||
    BEARER_AUTH_EXACT_PATHS.includes(pathname) ||
    BEARER_AUTH_PREFIX_PATHS.some((p) => pathname.startsWith(p)) ||
    TRULY_PUBLIC_EXACT_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    // Sessions minted before this claims-stamping existed (or any edge case
    // where the claim didn't propagate) carry no role claim — fail open on
    // routing only, not on data: RLS still fully governs what the session
    // can read once it lands somewhere. Only redirect when the claim is
    // present and clearly mismatched, so we never lock out an existing
    // admin session over a missing claim.
    const claimedRole = typeof decoded.role === "string" ? decoded.role : undefined;
    if (claimedRole === "client" && !isPortalPath(pathname)) {
      return NextResponse.redirect(new URL(PORTAL_PREFIX, request.url));
    }
    if (claimedRole && claimedRole !== "client" && isPortalPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
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
