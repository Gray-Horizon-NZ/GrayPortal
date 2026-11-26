import { NextResponse, type NextRequest } from "next/server";
import { linkSecret, softwareContacts, verifySignature } from "@/lib/dal/osseusLink";

// Every Software deal with its contact, for Osseus's Contacts page. Gray
// Horizon's own prospects and customers. Signed like the events (the signed
// body is the word "contacts", so a signature for the deal picker can't be
// replayed here).
export async function GET(request: NextRequest) {
  const secret = linkSecret();
  if (!secret) return NextResponse.json({ error: "Link not set up" }, { status: 503 });
  if (!verifySignature(secret, request.headers.get("x-osseus-ts"), request.headers.get("x-osseus-signature"), "contacts")) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  return NextResponse.json({ contacts: await softwareContacts() }, { headers: { "Cache-Control": "no-store" } });
}
