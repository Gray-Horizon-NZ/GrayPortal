import { NextRequest, NextResponse } from "next/server";
import { searchXeroContacts } from "@/lib/xero/adapter";

// TEMPORARY — diagnosing "search does nothing" for a specific term
// ("dm rider") on the finance page's client linking UI. Temporary.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const term = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const contacts = await searchXeroContacts(term);
    return NextResponse.json({ ok: true, term, count: contacts?.length ?? 0, contacts });
  } catch (err) {
    return NextResponse.json({ ok: false, term, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
