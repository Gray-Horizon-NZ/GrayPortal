import { NextRequest, NextResponse } from "next/server";
import { searchXeroContacts } from "@/lib/xero/adapter";

// TEMPORARY — diagnosing the "Xero contact search does nothing" report from
// the finance page. Same CRON_SECRET bearer pattern as the other /api/cron
// routes, reused here purely so this can be hit without a browser session.
// Remove once the underlying bug is found and fixed.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const term = request.nextUrl.searchParams.get("q") ?? "a";
  try {
    const contacts = await searchXeroContacts(term);
    return NextResponse.json({ ok: true, term, contacts });
  } catch (err) {
    return NextResponse.json({ ok: false, term, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
