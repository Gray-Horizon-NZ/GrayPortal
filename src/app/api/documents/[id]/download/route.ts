import { NextRequest, NextResponse } from "next/server";
import { getDocumentDownloadUrl } from "@/lib/dal/documents";

// Every download goes through here — never a direct Storage URL handed to
// the client — so access is re-checked (via RLS inside
// getDocumentDownloadUrl) on every single download, not just at page-load
// time when the list was rendered.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = await getDocumentDownloadUrl(id);
  if (!url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.redirect(url);
}
