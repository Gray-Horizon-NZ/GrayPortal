import { NextRequest, NextResponse } from "next/server";
import { createPublicIncrementumLead, PublicLeadInput } from "@/lib/dal/incrementum/leads";

// Public intake for Project Incrementum's ad landing page(s) — same shape
// and protections as /api/leads (Phase 11): proxy.ts lists it in
// TRULY_PUBLIC_EXACT_PATHS and gives it the same tight 5-per-10-minutes
// per-IP bucket; this route adds the honeypot and the optional
// LEAD_CAPTURE_SECRET header check. Accepts gclid + utm_* so Analytics can
// trace an ad click to a paying client (plan §7.2).
export async function POST(request: NextRequest) {
  const body: Record<string, unknown> | null = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (typeof body._hp === "string" && body._hp.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.LEAD_CAPTURE_SECRET;
  if (secret && request.headers.get("x-lead-capture-key") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Collect utm_* fields whether they arrive nested ({ utm: {...} }) or flat.
  const utm: Record<string, string> = {};
  const nested = body.utm && typeof body.utm === "object" ? (body.utm as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries({ ...body, ...nested })) {
    if (k.startsWith("utm_") && typeof v === "string") utm[k] = v;
  }

  const parsed = PublicLeadInput.safeParse({
    businessName: body.businessName ?? body.companyName,
    contactName: body.contactName ?? ([body.firstName, body.lastName].filter((x) => typeof x === "string").join(" ") || undefined),
    email: body.email || undefined,
    phone: body.phone || undefined,
    website: body.website || undefined,
    serviceInterest: body.serviceInterest || undefined,
    adBudget: body.adBudget || undefined,
    message: body.message || undefined,
    gclid: body.gclid || undefined,
    utm: Object.keys(utm).length ? utm : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  try {
    await createPublicIncrementumLead(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Incrementum lead capture failed", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
