import { NextRequest, NextResponse } from "next/server";
import { purgeOldDoneTasks } from "@/lib/dal/tasks";

// Triggered by Cloud Scheduler on a daily cadence, not by any user action —
// hence proxy.ts must explicitly allow it through (see PUBLIC_PATHS there)
// while this route enforces its own bearer-token check, since the normal
// session-cookie auth model doesn't apply to a scheduled job with no user.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeOldDoneTasks();
  return NextResponse.json({ ok: true, purged: result });
}
