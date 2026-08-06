import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_MAX_AGE_MS } from "@/lib/dal/constants";
import { withSession, NotOnAllowlistError, assertRole } from "@/lib/dal/session";

// Mints a fresh session cookie value and returns it in the response body
// instead of setting it as an httpOnly cookie, so it can be copied into an
// MCP client's Authorization header (Phase 4 brief §2). This deliberately
// never touches the browser's own live session cookie — a separate token is
// minted for this one purpose, using the exact same createSessionCookie
// call /api/auth/session uses. Admin-only: this phase's MCP tools are for
// Max, not contractor/client roles.
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    await withSession(decoded.uid, async (_tx, caller) => {
      assertRole(caller, "admin");
    });

    const token = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    return NextResponse.json({ token });
  } catch (err) {
    if (err instanceof NotOnAllowlistError) {
      return NextResponse.json({ error: "Not on allowlist" }, { status: 401 });
    }
    if (err instanceof Error && err.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    console.error("mcp/token failed", err);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }
}
