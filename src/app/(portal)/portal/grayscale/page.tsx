import { notFound } from "next/navigation";
import { getEnabledFeatureKeys } from "@/lib/dal/portal";

// Static placeholder — no catalogue content model exists yet (fast-follow;
// see the redesign plan). Gated by the pre-existing, previously-unused
// "grayscale_page" feature key.
export default async function PortalGrayScalePage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("grayscale_page")) notFound();

  return (
    <div>
      <div className="ghp-page-head">
        <h1>GrayScale</h1>
        <div className="ghp-sub">Product catalogue</div>
      </div>
      <div className="ghp-panel-block">
        <div className="ghp-panel-head">
          <div className="ghp-t">GrayScale catalogue</div>
        </div>
        <div className="ghp-gs-grid">
          <div className="ghp-gs-tile">
            <div className="ghp-n">Coming soon</div>
            <div className="ghp-s">Ask Gray Horizon about what&apos;s available for your account.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
