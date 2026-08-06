import { NextRequest, NextResponse } from "next/server";
import { createLead, LeadInput } from "@/lib/dal/leads";

// Public, unauthenticated intake for the Gray Horizon website's inquiry
// form (Phase 11 brief) — proxy.ts's TRULY_PUBLIC_EXACT_PATHS lets this
// bypass the normal session-cookie gate entirely, and applies its own
// tighter rate limit (5/10min per IP, vs. the generic 30/min mutate
// bucket) since this is the one endpoint reachable by anyone on the
// internet, not just an authenticated caller.
export async function POST(request: NextRequest) {
  const body: Record<string, unknown> | null = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Honeypot — a hidden field real visitors never see or fill in; bots
  // that autofill every field on a form trip it. Report success anyway so
  // a bot never learns which field gave it away.
  if (typeof body._hp === "string" && body._hp.length > 0) {
    return NextResponse.json({ ok: true });
  }

  // Shared-secret header, set by the website form's own submission script
  // (not by anything a browser sends automatically) — a soft spam
  // deterrent, not real authentication. Optional: if unset, this check is
  // skipped rather than hard-failing before Max has wired the website up.
  const secret = process.env.LEAD_CAPTURE_SECRET;
  if (secret && request.headers.get("x-lead-capture-key") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = LeadInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  try {
    await createLead(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Lead capture failed", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
