import Link from "next/link";
import { listCompanies } from "@/lib/dal/companies";
import { createCompanyAction } from "./actions";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const companies = await listCompanies(q);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
          Companies
        </h1>
      </div>

      <form className="gh-list-toolbar">
        <input
          className="gh-input gh-list-toolbar-search"
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search companies…"
        />
        <button className="gh-btn-secondary" type="submit">Search</button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {companies.map((c) => (
          <Link
            key={c.id}
            href={`/companies/${c.id}`}
            className="gh-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontWeight: 500 }}>{c.name}</span>
            <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
              {c.industry ?? "—"} · {c.region ?? "—"}
            </span>
          </Link>
        ))}
        {companies.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>No companies yet.</p>
        )}
      </div>

      <details className="gh-card">
        <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>
          Add company
        </summary>
        <form
          action={createCompanyAction}
          style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}
        >
          <input className="gh-input" name="name" placeholder="Company name" required />
          <input className="gh-input" name="source" placeholder="Source (required)" required />
          <input className="gh-input" name="industry" placeholder="Industry" />
          <input className="gh-input" name="region" placeholder="Region" />
          <input className="gh-input" name="website" placeholder="Website" />
          <input className="gh-input" name="sizeBand" placeholder="Size band" />
          <textarea className="gh-input" name="notes" placeholder="Notes" rows={3} />
          <button className="gh-btn-primary" type="submit">Add company</button>
        </form>
      </details>
    </div>
  );
}
