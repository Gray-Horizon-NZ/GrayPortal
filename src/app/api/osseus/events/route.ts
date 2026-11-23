import { NextResponse, type NextRequest } from "next/server";
import { firstTime, handleEvent, linkSecret, parseEvent, verifySignature } from "@/lib/dal/osseusLink";

// Osseus → GrayPortal events (BUILD-PLAN P1): demo published / opened, and
// Book a walkthrough; J3 deal terms; O8 e terms accepted, setup complete. Signed with OSSEUS_LINK_SECRET (src/lib/dal/osseusLink.ts).
export async function POST(request: NextRequest) {
  const secret = linkSecret();
  if (!secret) return NextResponse.json({ error: "Link not set up" }, { status: 503 });
  const body = (await request.text()).slice(0, 20_000);
  if (!verifySignature(secret, request.headers.get("x-osseus-ts"), request.headers.get("x-osseus-signature"), body)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const event = parseEvent(raw);
  if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  if (!firstTime((raw as { id?: unknown }).id)) return NextResponse.json({ ok: true, repeat: true });
  try {
    return NextResponse.json(await handleEvent(event));
  } catch (err) {
    console.error("Osseus event failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
