import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import GuidebookViewer from "./GuidebookViewer";
import { PageHead } from "@/components/ui/terminal/Term";

/**
 * Admin-only quick-reference for the Gray Horizon brand guidebook
 * (Branding/Gray Horizon Branding GuideBook 2026 v2.0.html) — the source
 * document itself is untouched design work, not something this app owns;
 * this page just imports it wholesale (`public/brand-guidebook.html`) and
 * adds mini-tab navigation over its existing sections so it's a couple of
 * clicks away instead of a file to go dig up.
 */
export default async function BrandGuidelinesPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");

  return (
    <div className="gh-term-page" style={{ height: "calc(100dvh - 140px)", gap: "var(--gh-space-4)" }}>
      <PageHead title="Brand guidelines" sub="The Gray Horizon brand guidebook, section by section" />
      <GuidebookViewer />
    </div>
  );
}
