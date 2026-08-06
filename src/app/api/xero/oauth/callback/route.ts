import { NextRequest, NextResponse } from "next/server";
import { withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { exchangeCodeForConnection } from "@/lib/xero/oauth";
import { saveXeroConnection } from "@/lib/dal/xeroConnection";

const STATE_COOKIE = "__xero_oauth_state";

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
    const { refreshToken, tenant } = await exchangeCodeForConnection(code);
    await saveXeroConnection(refreshToken, tenant.tenantId, tenant.tenantName);
  } catch (err) {
    console.error("Xero OAuth callback failed", err);
    return NextResponse.redirect(new URL("/settings?xero=error", request.url));
  }

  const response = NextResponse.redirect(new URL("/settings?xero=connected", request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
