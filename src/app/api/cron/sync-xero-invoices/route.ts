import { NextRequest, NextResponse } from "next/server";
import { syncXeroInvoices } from "@/lib/dal/xero";
import { fetchAccountsReceivableInvoices } from "@/lib/xero/adapter";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (request.nextUrl.searchParams.get("debug") === "1") {
    const invoices = await fetchAccountsReceivableInvoices();
    return NextResponse.json({ sample: invoices?.slice(0, 2) ?? null });
  }

  try {
    const result = await syncXeroInvoices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Xero invoice sync failed", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
