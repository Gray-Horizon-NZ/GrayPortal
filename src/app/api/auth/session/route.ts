import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/dal/constants";
import { claimOrVerifyAllowlist } from "@/lib/dal/allowlist";
import { NotOnAllowlistError } from "@/lib/dal/session";

// Exchanges a freshly-signed-in Firebase ID token for a long-lived session
// cookie. The ID token itself is short-lived and only used once, here.
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  let decodedEmail: string | undefined;
  try {
    // Re-verify the token server-side rather than trusting the client's
    // claim that sign-in succeeded.
    const decoded = await adminAuth.verifyIdToken(idToken);
    decodedEmail = decoded.email;
    if (!decoded.email) {
      return NextResponse.json({ error: "No email on Google account" }, { status: 401 });
    }

    // Allowlist gate — a valid Google sign-in is not enough on its own
    // (brief §5.1).
    await claimOrVerifyAllowlist(decoded.email, decoded.uid);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS / 1000,
      path: "/",
    });
    return response;
  } catch (err) {
    if (err instanceof NotOnAllowlistError) {
      return NextResponse.json({ error: "Not on allowlist" }, { status: 401 });
    }
    // Anything else (token verification, session cookie signing, DB
    // connectivity) is an infra/config problem, not an allowlist rejection
    // — logged with detail server-side so it shows up in Cloud Run logs,
    // since the client-facing message stays generic on purpose.
    console.error("auth/session failed for", decodedEmail ?? "(unknown email)", err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
