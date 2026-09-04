import { NextRequest, NextResponse } from "next/server";
import { recordCampaignRecipientOpen } from "@/lib/dal/campaigns";

// 1x1 transparent GIF, the smallest widely-supported pixel format for this —
// same bytes every open-tracking pixel on the internet uses.
const TRANSPARENT_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

/**
 * Genuinely public (src/proxy.ts's TRULY_PUBLIC_PREFIX_PATHS) — a mail
 * client fetches this with no Firebase session, no bearer token. Always
 * returns the same 1x1 image regardless of what happens underneath: a
 * malformed/guessed recipientId must never surface as a broken image in
 * someone's inbox, so the DB write is best-effort and swallowed on failure,
 * same posture as every other pre-caller write in this app that can't allow
 * its own failure to visibly break the thing triggering it.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ recipientId: string }> }) {
  try {
    const { recipientId } = await params;
    await recordCampaignRecipientOpen(recipientId);
  } catch (err) {
    console.error("Campaign open-pixel hit failed to record", err);
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.length),
      "Cache-Control": "no-store, private",
    },
  });
}
