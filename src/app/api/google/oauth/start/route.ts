import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { buildGoogleConsentUrl } from "@/lib/google/oauth";

const STATE_COOKIE = "__google_oauth_state";

export async function GET() {
  await withCaller(async (caller) => assertRole(caller, "admin"));

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
