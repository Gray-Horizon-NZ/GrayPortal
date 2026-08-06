import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { VAULT_SESSION_COOKIE_NAME, VAULT_SESSION_MAX_AGE_MS } from "@/lib/dal/constants";
import { getVerifiedUid } from "@/lib/dal/auth";

// Step 2 of the Phase 6 vault re-auth flow: exchanges a fresh Firebase ID
// token — one the client obtained by resolving an MFA (TOTP) challenge via
// reauthenticateWithPopup + a MultiFactorResolver, see
// src/app/(app)/vault/RevealButton.tsx — for a short-lived cookie proving
// "recently re-verified with a second factor," separate from the ordinary
// 14-day session cookie. Every reveal checks this cookie
// (src/lib/dal/vaultAuth.ts), not just the main session.
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  const mainSessionUid = await getVerifiedUid();
  if (!mainSessionUid) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);

    // This token must belong to the same person as the active main session
    // — otherwise a stolen fresh token for a different account could stamp
    // a vault-verified cookie under someone else's session.
    if (decoded.uid !== mainSessionUid) {
      return NextResponse.json({ error: "Token does not match active session" }, { status: 401 });
    }

    // The check that actually enforces "MFA, not just a fresh sign-in":
    // Firebase only sets this claim on ID tokens minted by resolving a
    // MultiFactorResolver, never on a plain single-factor sign-in or
    // reauthenticateWithPopup call that didn't hit the MFA branch.
    if (!decoded.firebase?.sign_in_second_factor) {
      return NextResponse.json({ error: "Second factor not verified" }, { status: 401 });
    }

    const vaultCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: VAULT_SESSION_MAX_AGE_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(VAULT_SESSION_COOKIE_NAME, vaultCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: VAULT_SESSION_MAX_AGE_MS / 1000,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("auth/vault-session failed", err);
    return NextResponse.json({ error: "Vault re-authentication failed" }, { status: 401 });
  }
}
