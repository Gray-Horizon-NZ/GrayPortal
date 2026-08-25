import { NextRequest, NextResponse } from "next/server";
import { withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { exchangeCodeForRefreshToken, GOOGLE_SYNC_SCOPES } from "@/lib/google/oauth";
import { saveGoogleConnection } from "@/lib/dal/googleConnection";
import { absoluteUrl } from "@/lib/http";

const STATE_COOKIE = "__google_oauth_state";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid or expired OAuth state" }, { status: 400 });
  }

  try {
    await withCaller(async (caller) => assertRole(caller, "admin"));
    const refreshToken = await exchangeCodeForRefreshToken(code);
    await saveGoogleConnection(refreshToken, GOOGLE_SYNC_SCOPES);
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    // Settings is admin-only, so it's safe to surface the actual failure
    // reason there instead of a single generic message covering every
    // possible cause — googleapis/postgres errors are descriptive, not
    // secrets. Drizzle/postgres-js wrap the real driver error in `.cause`
    // rather than putting it in the top-level message, so walk the chain.
    let reason = err instanceof Error ? err.message : String(err);
    let cause = err instanceof Error ? err.cause : undefined;
    while (cause instanceof Error) {
      reason += ` | caused by: ${cause.message}`;
      cause = cause.cause;
    }
    const url = absoluteUrl("/settings?google=error", request);
    url.searchParams.set("reason", reason.slice(0, 500));
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(absoluteUrl("/settings?google=connected", request));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
