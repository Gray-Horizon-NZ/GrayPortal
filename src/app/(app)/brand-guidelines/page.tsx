import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import GuidebookViewer from "./GuidebookViewer";

/**
 * Admin-only quick-reference for the Gray Horizon brand guidebook
 * (Branding/Gray Horizon Branding GuideBook 2026 v2.0.html) — the source
 * document itself is untouched design work, not something this app owns;
 * this page just imports it wholesale (`public/brand-guidebook.html`) and
 * adds mini-tab navigation over its existing sections so it's a couple of
 * clicks away instead of a file to go dig up.
 */
export default async function BrandGuidelinesPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)", height: "calc(100vh - 120px)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          Brand <em>Guidelines</em>
        </h1>
      </div>
      <GuidebookViewer />
    </div>
  );
}
