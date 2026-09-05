import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, getPortalCallerContext } from "@/lib/dal/portal";
import { listGrayscaleProducts } from "@/lib/dal/grayscaleProducts";
import GrayscaleWidget from "@/components/portal/GrayscaleWidget";

export default async function PortalGrayScalePage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("grayscale_page")) notFound();

  const [products, { isAdminPreview }] = await Promise.all([
    listGrayscaleProducts().catch((err) => {
      console.error("listGrayscaleProducts failed", err);
      return [];
    }),
    getPortalCallerContext(),
  ]);

  return (
    <div>
      <div className="ghp-page-head">
        <h1>GrayScale</h1>
        <div className="ghp-sub">Product catalogue</div>
      </div>

      <div className="ghp-panel-block">
        <div className="ghp-panel-head">
          <div className="ghp-t">GrayScale catalogue</div>
          <div className="ghp-n">{products.length} products</div>
        </div>
        {products.length > 0 ? (
          <div className="ghp-gs-grid">
            {products.map((p) => (
              <div key={p.id} className="ghp-gs-tile">
                <div className="ghp-n">{p.name}</div>
                {p.category && (
                  <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ghp-brass)", marginTop: 4 }}>
                    {p.category}
                  </div>
                )}
                {p.description && <div className="ghp-s">{p.description}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="ghp-gs-grid">
            <div className="ghp-gs-tile">
              <div className="ghp-n">Coming soon</div>
              <div className="ghp-s">Ask Gray Horizon about what&apos;s available for your account.</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "var(--ghp-space-6)" }}>
        <GrayscaleWidget products={products} previewOnly={isAdminPreview} />
      </div>
    </div>
  );
}
