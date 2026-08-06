import { NextRequest, NextResponse } from "next/server";
import { withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { exchangeCodeForRefreshToken, GOOGLE_SYNC_SCOPES } from "@/lib/google/oauth";
import { saveGoogleConnection } from "@/lib/dal/googleConnection";

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
    return NextResponse.redirect(new URL("/settings?google=error", request.url));
  }

  const response = NextResponse.redirect(new URL("/settings?google=connected", request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
