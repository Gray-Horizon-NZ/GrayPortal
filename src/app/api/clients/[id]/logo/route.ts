import { NextRequest, NextResponse } from "next/server";
import { getClientLogo } from "@/lib/dal/clients";

// Client logos are served from GrayPortal's own origin (see getClientLogo):
// access is checked through RLS on every request, and the image needs no
// third-party host in the CSP.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const logo = await getClientLogo(id);
    if (!logo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(new Uint8Array(logo.bytes), {
      headers: {
        "Content-Type": logo.contentType,
        // Private: per-user access. The src carries a version param, so a
        // long cache is safe — a new upload gets a new URL.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
