import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { companies, contacts, deals } from "@/lib/db/schema";
import { and, isNull, or, ilike } from "drizzle-orm";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const results = q
    ? await withCaller(async (_caller, tx) => {
        const term = `%${q}%`;
        const companyRows = await tx
          .select()
          .from(companies)
          .where(and(isNull(companies.deletedAt), ilike(companies.name, term)));
        const contactRows = await tx
          .select()
          .from(contacts)
          .where(
            and(
              isNull(contacts.deletedAt),
              or(ilike(contacts.firstName, term), ilike(contacts.lastName, term), ilike(contacts.email, term))
            )
          );
        const dealRows = await tx
          .select()
          .from(deals)
          .where(and(isNull(deals.deletedAt), ilike(deals.nextAction, term)));
        return { companyRows, contactRows, dealRows };
      })
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Search</h1>
      </div>

      <form style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        <input className="gh-input" name="q" defaultValue={q} placeholder="Search companies, contacts, deals…" autoFocus />
        <button className="gh-btn-secondary" type="submit">Search</button>
      </form>

      {results && (
        <>
          <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <p className="gh-eyebrow">Companies</p>
            {results.companyRows.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="gh-card">{c.name}</Link>
            ))}
            {results.companyRows.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No matches.</p>}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <p className="gh-eyebrow">Contacts</p>
            {results.contactRows.map((c) => (
              <Link key={c.id} href={`/contacts/${c.id}`} className="gh-card">{c.firstName} {c.lastName}</Link>
            ))}
            {results.contactRows.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No matches.</p>}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <p className="gh-eyebrow">Deals</p>
            {results.dealRows.map((d) => (
              <Link key={d.id} href={`/deals/${d.id}`} className="gh-card">{d.nextAction}</Link>
            ))}
            {results.dealRows.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No matches.</p>}
          </section>
        </>
      )}
    </div>
  );
}
