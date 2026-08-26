import { listInternalIdeationItems, INTERNAL_IDEATION_CATEGORIES } from "@/lib/dal/ideation";
import { createInternalIdeationItemAction, deleteInternalIdeationItemAction } from "./actions";
import IdeationStatusSelect from "./IdeationStatusSelect";
import SubmitButton from "@/components/ui/SubmitButton";

const CATEGORY_LABELS: Record<string, string> = {
  software: "Software",
  marketing: "Marketing",
};

export default async function IdeationPage() {
  const items = await listInternalIdeationItems();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Ideation</h1>
        <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-2)" }}>
          Your own internal/business ideas — separate from client ideation, never client- or contractor-visible.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${INTERNAL_IDEATION_CATEGORIES.length}, minmax(280px, 1fr))`,
          gap: "var(--gh-space-6)",
        }}
      >
        {INTERNAL_IDEATION_CATEGORIES.map((category) => {
          const categoryItems = items.filter((it) => it.category === category);
          return (
            <div key={category} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
              <p className="gh-eyebrow">{CATEGORY_LABELS[category] ?? category}</p>

              {categoryItems.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--gh-space-2)",
                    borderBottom: "1px solid var(--gh-border)",
                    paddingBottom: "var(--gh-space-3)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--gh-space-2)" }}>
                    <span style={{ fontWeight: 500 }}>{it.title}</span>
                    <form action={deleteInternalIdeationItemAction.bind(null, it.id)}>
                      <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Removing…">
                        Remove
                      </SubmitButton>
                    </form>
                  </div>
                  {it.description && (
                    <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>{it.description}</p>
                  )}
                  <IdeationStatusSelect id={it.id} status={it.status} />
                </div>
              ))}
              {categoryItems.length === 0 && (
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No {CATEGORY_LABELS[category]?.toLowerCase() ?? category} ideas yet.</p>
              )}

              <details>
                <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add idea</summary>
                <form
                  action={createInternalIdeationItemAction}
                  style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}
                >
                  <input type="hidden" name="category" value={category} />
                  <input className="gh-input" name="title" placeholder="Idea title" required />
                  <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
                  <SubmitButton pendingLabel="Adding…">Add idea</SubmitButton>
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
