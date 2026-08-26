import Link from "next/link";
import { searchAll } from "@/lib/dal/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const results = q ? await searchAll(q) : null;

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

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <p className="gh-eyebrow">Tasks</p>
            {results.taskRows.map((t) => (
              <Link key={t.id} href="/tasks" className="gh-card">{t.title}</Link>
            ))}
            {results.taskRows.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No matches.</p>}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <p className="gh-eyebrow">Ideation / Roadmap / Meeting Summaries</p>
            {[...results.ideationRows, ...results.roadmapRows, ...results.meetingRows].map((r) => (
              <Link key={r.id} href={`/clients/${r.clientId}`} className="gh-card">{"title" in r ? r.title : ""}</Link>
            ))}
            {results.ideationRows.length === 0 && results.roadmapRows.length === 0 && results.meetingRows.length === 0 && (
              <p style={{ color: "var(--gh-text-muted)" }}>No matches.</p>
            )}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
            <p className="gh-eyebrow">Emails</p>
            {results.emailRows.map((e) => (
              <Link
                key={e.id}
                href={e.contactId ? `/contacts/${e.contactId}` : e.dealId ? `/deals/${e.dealId}` : "/email-triage"}
                className="gh-card"
              >
                {e.subject || "(no subject)"}
              </Link>
            ))}
            {results.emailRows.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No matches.</p>}
          </section>
        </>
      )}
    </div>
  );
}
