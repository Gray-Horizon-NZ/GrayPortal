import Link from "next/link";
import { Suspense } from "react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { money } from "@/lib/incrementum/format";

// "Enter Project Incrementum" (docs/Project-Incrementum-Plan.md §2.3) — the
// one light object on the dark GrayPortal Home, far right of the "Welcome
// back" row. Its live figure streams in separately so it never delays Home,
// and any failure (e.g. the Incrementum migration not applied yet) just
// drops the figure — the doorway itself always renders.
async function bannerText(): Promise<string | null> {
  try {
    const s = await getIncrementumSnapshot();
    return s.mode === "pre"
      ? `Phase ${s.phases.current?.number ?? 0} · ${s.launch.readinessPct}% launch-ready`
      : `Phase ${s.phases.current?.number ?? ""} · ${money(s.metrics.monthly_profit)}/mo profit`;
  } catch {
    return null;
  }
}

async function BannerMeta() {
  const text = await bannerText();
  return text ? <span className="gh-inc-banner-meta">{text}</span> : null;
}

export default function IncrementumHomeBanner() {
  return (
    <Link href="/incrementum" className="gh-inc-banner" aria-label="Enter Project Incrementum">
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="gh-inc-banner-eyebrow">Project Incrementum</span>
        <span className="gh-inc-banner-title">
          Enter <em>Project Incrementum</em>
        </span>
        <Suspense fallback={null}>
          <BannerMeta />
        </Suspense>
      </span>
      <span className="gh-inc-banner-arrow" aria-hidden>
        →
      </span>
    </Link>
  );
}
