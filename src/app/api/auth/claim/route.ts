import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { claimOrVerifyAllowlist } from "@/lib/dal/allowlist";
import { NotOnAllowlistError } from "@/lib/dal/session";

// Step 1 of sign-in: verifies the freshly-minted Firebase ID token, runs the
// allowlist check, and stamps Firebase custom claims (role, clientId) on the
// user record. Firebase only propagates new custom claims into a token after
// that token is refreshed — the ID token the client already holds predates
// this claim, so the client must call getIdToken(true) and then exchange the
// *refreshed* token at /api/auth/session for the actual session cookie. This
// route issues no cookie itself.
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  let decodedEmail: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    decodedEmail = decoded.email;
    if (!decoded.email) {
      return NextResponse.json({ error: "No email on Google account" }, { status: 401 });
    }

    await claimOrVerifyAllowlist(decoded.email, decoded.uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotOnAllowlistError) {
      return NextResponse.json({ error: "Not on allowlist" }, { status: 401 });
    }
    console.error("auth/claim failed for", decodedEmail ?? "(unknown email)", err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
