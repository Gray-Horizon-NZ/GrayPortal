import { NextRequest, NextResponse } from "next/server";
import { computeClientHealthScores } from "@/lib/dal/health";

// Triggered by Cloud Scheduler on a nightly cadence, same pattern as the
// other /api/cron/* routes — see purge-done-tasks/route.ts for why bearer
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

  const result = await computeClientHealthScores();
  return NextResponse.json({ ok: true, ...result });
}
