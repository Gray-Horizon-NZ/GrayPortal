import { NextRequest, NextResponse } from "next/server";
import { runQueuedCampaignSends } from "@/lib/dal/campaigns";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runQueuedCampaignSends();
  return NextResponse.json({ ok: true, ...result });
}
