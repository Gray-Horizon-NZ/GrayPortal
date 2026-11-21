import { NextResponse, type NextRequest } from "next/server";
import { linkSecret, openSoftwareDeals, verifySignature } from "@/lib/dal/osseusLink";

// Open Software deals for Osseus's demo picker (BUILD-PLAN P1, D2). Company
// names and stages only. Signed like the events (empty body).
export async function GET(request: NextRequest) {
  const secret = linkSecret();
  if (!secret) return NextResponse.json({ error: "Link not set up" }, { status: 503 });
  if (!verifySignature(secret, request.headers.get("x-osseus-ts"), request.headers.get("x-osseus-signature"), "")) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  return NextResponse.json({ deals: await openSoftwareDeals() }, { headers: { "Cache-Control": "no-store" } });
}
