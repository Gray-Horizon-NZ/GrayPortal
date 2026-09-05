import Link from "next/link";
import { listGrayscaleProducts } from "@/lib/dal/grayscaleProducts";
import { createGrayscaleProductAction, updateGrayscaleProductAction, softDeleteGrayscaleProductAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function GrayscaleProductsPage() {
  const products = await listGrayscaleProducts();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--gh-space-4)" }}>
        <div>
          <p className="gh-eyebrow">GrayScale</p>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
            Product <em>Catalogue</em>
          </h1>
          <p className="gh-source-note" style={{ marginTop: "var(--gh-space-2)" }}>
            Shown to clients in the portal&apos;s GrayScale consultation widget and validated against here when a
            request is submitted. Previously a hardcoded source file — this is the live catalogue now.
          </p>
        </div>
        <Link href="/apexus" className="gh-btn-secondary" style={{ whiteSpace: "nowrap" }}>
          Build a quote →
        </Link>
      </div>

      <div className="gh-grid-joined gh-grid-joined--3">
        {products.map((p) => (
          <div key={p.id} className="gh-grid-cell gh-grid-cell--interactive">
            <div className="gh-card-top">
              <p style={{ fontSize: "var(--gh-text-base)", fontWeight: 600 }}>{p.name}</p>
              {p.category && <span className="gh-badge">{p.category}</span>}
            </div>
            {p.description && (
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", lineHeight: 1.5, marginTop: "var(--gh-space-2)" }}>
                {p.description}
              </p>
            )}
            <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-accent)", fontWeight: 600, marginTop: "var(--gh-space-2)" }}>
              {p.monthlyPriceNzd ? `$${Number(p.monthlyPriceNzd).toLocaleString()}/mo` : "No price set"}
            </p>
            <details style={{ marginTop: "var(--gh-space-3)" }}>
              <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Edit</summary>
              <form
                action={updateGrayscaleProductAction.bind(null, p.id)}
                style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-3)" }}
              >
                <input className="gh-input" name="name" defaultValue={p.name} required />
                <input className="gh-input" name="category" defaultValue={p.category ?? ""} placeholder="Category" />
                <textarea className="gh-input" name="description" defaultValue={p.description ?? ""} placeholder="Description" rows={3} />
                <input className="gh-input" name="monthlyPriceNzd" type="number" step="0.01" defaultValue={p.monthlyPriceNzd ?? ""} placeholder="Monthly price (NZD)" />
                <input className="gh-input" name="sortOrder" type="number" defaultValue={p.sortOrder} placeholder="Sort order" />
                <SubmitButton>Save</SubmitButton>
              </form>
              <form action={softDeleteGrayscaleProductAction.bind(null, p.id)} style={{ marginTop: "var(--gh-space-2)" }}>
                <SubmitButton
                  className="gh-btn-secondary"
                  style={{ color: "var(--gh-danger)", borderColor: "var(--gh-danger)", fontSize: "var(--gh-text-micro)", padding: "var(--gh-space-1) var(--gh-space-2)" }}
                >
                  Remove
                </SubmitButton>
              </form>
            </details>
          </div>
        ))}

        <details className="gh-grid-cell" style={{ padding: 0 }}>
          <summary className="gh-add-cell" style={{ padding: "var(--gh-space-6)" }}>+ Add product</summary>
          <form
            action={createGrayscaleProductAction}
            style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", padding: "var(--gh-space-6)", paddingTop: 0 }}
          >
            <input className="gh-input" name="name" placeholder="Product name" required />
            <input className="gh-input" name="category" placeholder="Category" />
            <textarea className="gh-input" name="description" placeholder="Description" rows={3} />
            <input className="gh-input" name="monthlyPriceNzd" type="number" step="0.01" placeholder="Monthly price (NZD)" />
            <input className="gh-input" name="sortOrder" type="number" placeholder="Sort order" />
            <SubmitButton>Add product</SubmitButton>
          </form>
        </details>
      </div>
      {products.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No GrayScale products yet.</p>}
    </div>
  );
}
