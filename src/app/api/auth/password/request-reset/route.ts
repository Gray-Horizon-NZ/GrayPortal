import { NextRequest, NextResponse } from "next/server";
import { requestPasswordResetIfAllowlisted } from "@/lib/dal/passwordAuth";

// Public, unauthenticated — reached from the login page's "Forgot your
// password?" form and from the first-time "set your password" case (same
// mechanism, see passwordAuth.ts). Always responds the same way regardless
// of whether the email is on the allowlist — requestPasswordResetIfAllowlisted
// itself decides whether anything actually gets sent, enumeration-safe.
export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  await requestPasswordResetIfAllowlisted(email);
  return NextResponse.json({ ok: true });
}
