import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { buildGoogleConsentUrl } from "@/lib/google/oauth";
import { absoluteUrl } from "@/lib/http";

const STATE_COOKIE = "__google_oauth_state";

export async function GET(request: NextRequest) {
  await withCaller(async (caller) => assertRole(caller, "admin"));

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET || !process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return NextResponse.redirect(absoluteUrl("/settings?google=notconfigured", request));
  }

  const state = randomBytes(32).toString("hex");
  const response = NextResponse.redirect(buildGoogleConsentUrl(state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
