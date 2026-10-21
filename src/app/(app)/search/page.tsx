import Link from "next/link";
import { Building2, ChevronRight, Lightbulb, ListChecks, Mail, User, Workflow, type LucideIcon } from "lucide-react";
import { searchAll } from "@/lib/dal/search";
import { PageHead, Panel } from "@/components/ui/terminal/Term";

function ResultPanel({ title, icon, items }: { title: string; icon: LucideIcon; items: { key: string; href: string; label: string }[] }) {
  return (
    <Panel title={title} icon={icon} right={`${items.length}`} pad={items.length === 0}>
      {items.length === 0 ? (
        <p className="gh-term-muted">No matches.</p>
      ) : (
        <div className="gh-term-rows">
          {items.map((i) => (
            <Link key={i.key} href={i.href} className="gh-term-row">
              <span>{i.label}</span>
              <ChevronRight size={14} className="gh-term-row-go" style={{ marginLeft: "auto" }} />
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await searchAll(q) : null;

  return (
    <div className="gh-term-page" style={{ maxWidth: 1100 }}>
      <PageHead title="Search" sub={q ? `Results for “${q}”` : "Companies, contacts, deals, tasks, client notes and emails"} />

      <form className="gh-list-toolbar" style={{ marginBottom: 0 }}>
        <input className="gh-input gh-list-toolbar-search" name="q" defaultValue={q} placeholder="Search companies, contacts, deals…" autoFocus />
        <button className="gh-btn-secondary" type="submit">Search</button>
      </form>

      {results && (
        <div className="gh-term-grid gh-term-grid--2">
          <ResultPanel title="Companies" icon={Building2} items={results.companyRows.map((c) => ({ key: c.id, href: `/companies/${c.id}`, label: c.name }))} />
          <ResultPanel
            title="Contacts"
            icon={User}
            items={results.contactRows.map((c) => ({ key: c.id, href: `/contacts/${c.id}`, label: `${c.firstName} ${c.lastName}` }))}
          />
          <ResultPanel title="Deals" icon={Workflow} items={results.dealRows.map((d) => ({ key: d.id, href: `/deals/${d.id}`, label: d.nextAction }))} />
          <ResultPanel title="Tasks" icon={ListChecks} items={results.taskRows.map((t) => ({ key: t.id, href: "/tasks", label: t.title }))} />
          <ResultPanel
            title="Ideation / roadmap / meeting summaries"
            icon={Lightbulb}
            items={[...results.ideationRows, ...results.roadmapRows, ...results.meetingRows].map((r) => ({
              key: r.id,
              href: `/clients/${r.clientId}`,
              label: "title" in r ? r.title : "",
            }))}
          />
          <ResultPanel
            title="Emails"
            icon={Mail}
            items={results.emailRows.map((e) => ({
              key: e.id,
              href: e.contactId ? `/contacts/${e.contactId}` : e.dealId ? `/deals/${e.dealId}` : "/email-triage",
              label: e.subject || "(no subject)",
            }))}
          />
        </div>
      )}
    </div>
  );
}
