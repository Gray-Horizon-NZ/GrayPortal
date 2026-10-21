import { Lightbulb } from "lucide-react";
import { listInternalIdeationItems, listIdeationCategories } from "@/lib/dal/ideation";
import { createInternalIdeationItemAction, deleteInternalIdeationItemAction } from "./actions";
import IdeationStatusSelect from "./IdeationStatusSelect";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead } from "@/components/ui/terminal/Term";

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
    <div className="gh-term-page">
      <PageHead
        title="Ideation"
        sub="Your own internal/business ideas — separate from client ideation, never client- or contractor-visible. Manage categories in Settings."
      />

      {columns.length === 0 ? (
        <p className="gh-term-muted">No categories yet — add one in Settings before logging an idea.</p>
      ) : (
        <div className="gh-term-board">
          {columns.map(({ key, label }) => {
            const categoryItems = key === null ? orphaned : items.filter((it) => it.category === key);
            return (
              <section key={key ?? "__other__"} className="gh-term-panel gh-term-bcol">
                <header className="gh-term-phead">
                  <Lightbulb size={13} strokeWidth={2} />
                  <span className="gh-term-ptitle">{label}</span>
                  <span className="gh-term-phead-r">{categoryItems.length}</span>
                </header>
                <div className="gh-term-bcol-body">
                  {categoryItems.map((it) => (
                    <div key={it.id} className="gh-term-bcard">
                      <p className="gh-term-strong">{it.title}</p>
                      {it.description && <p className="gh-term-small">{it.description}</p>}
                      <div className="gh-term-bcard-foot">
                        <IdeationStatusSelect id={it.id} status={it.status} />
                        <form action={deleteInternalIdeationItemAction.bind(null, it.id)}>
                          <SubmitButton className="gh-link-btn gh-link-btn--danger" pendingLabel="Removing…">
                            Remove
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                  ))}
                  {categoryItems.length === 0 && <p className="gh-term-muted">No {label.toLowerCase()} ideas yet.</p>}
                </div>

                {key !== null && (
                  <details className="gh-term-bcol-add">
                    <summary>+ Add idea</summary>
                    <form action={createInternalIdeationItemAction} className="gh-term-form">
                      <input type="hidden" name="category" value={key} />
                      <input className="gh-input" name="title" placeholder="Idea title" required />
                      <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
                      <SubmitButton pendingLabel="Adding…">Add idea</SubmitButton>
                    </form>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
