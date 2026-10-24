import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { withSession, NotOnAllowlistError } from "@/lib/dal/session";
import { issueMcpKey } from "@/lib/dal/mcpKeys";

// Issues a long-lived MCP access key (src/lib/dal/mcpKeys.ts) and returns it
// in the response body, so it can be copied into an MCP client's
// Authorization header (Phase 4 brief §2). Until 2026-10-24 this minted a
// 14-day session cookie, which meant re-pasting a token every fortnight.
// Still requires a fresh Firebase ID token, not just the browser's session
// cookie, so a key can only be issued by someone actively signed in.
// Admin-only: MCP tools are for Max, not contractor/client roles.
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const token = await withSession(decoded.uid, (tx, caller) => issueMcpKey(tx, caller));
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
