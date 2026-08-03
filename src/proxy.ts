import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/dal/constants";

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

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
