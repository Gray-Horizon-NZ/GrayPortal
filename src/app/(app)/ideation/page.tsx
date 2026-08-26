import { listInternalIdeationItems, listIdeationCategories } from "@/lib/dal/ideation";
import { createInternalIdeationItemAction, deleteInternalIdeationItemAction } from "./actions";
import IdeationStatusSelect from "./IdeationStatusSelect";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function IdeationPage() {
  const [items, categories] = await Promise.all([listInternalIdeationItems(), listIdeationCategories()]);

  const knownKeys = new Set(categories.map((c) => c.key));
  // Anything tagged with a category that's since been removed from the
  // Settings-page registry still needs somewhere to show up, rather than
  // silently disappearing — no category deletion UI exists today, but
  // nothing stops a key going stale by other means (a direct DB edit,
  // future admin tooling), so this fallback column exists defensively.
  const orphaned = items.filter((it) => !it.category || !knownKeys.has(it.category));
  const columns = [
    ...categories.map((c) => ({ key: c.key, label: c.label })),
    ...(orphaned.length > 0 ? [{ key: null, label: "Other" }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Ideation</h1>
        <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-2)" }}>
          Your own internal/business ideas — separate from client ideation, never client- or contractor-visible.
          Manage categories in Settings.
        </p>
      </div>

      {columns.length === 0 ? (
        <p style={{ color: "var(--gh-text-muted)" }}>
          No categories yet — add one in Settings before logging an idea.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`,
            gap: "var(--gh-space-6)",
          }}
        >
          {columns.map(({ key, label }) => {
            const categoryItems = key === null ? orphaned : items.filter((it) => it.category === key);
            return (
              <div key={key ?? "__other__"} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
                <p className="gh-eyebrow">{label}</p>

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
                  <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No {label.toLowerCase()} ideas yet.</p>
                )}

                {key !== null && (
                  <details>
                    <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add idea</summary>
                    <form
                      action={createInternalIdeationItemAction}
                      style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}
                    >
                      <input type="hidden" name="category" value={key} />
                      <input className="gh-input" name="title" placeholder="Idea title" required />
                      <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
                      <SubmitButton pendingLabel="Adding…">Add idea</SubmitButton>
                    </form>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
