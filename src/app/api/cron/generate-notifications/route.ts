import { NextRequest, NextResponse } from "next/server";
import { generateNotifications } from "@/lib/dal/notifications";

// Triggered by Cloud Scheduler on a daily cadence, same pattern as
// /api/cron/purge-done-tasks — see that route's comment for why bearer
// auth rather than the session-cookie model applies here.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateNotifications();
  return NextResponse.json({ ok: true, ...result });
}
