import { searchAll } from "@/lib/dal/search";
import { StoreData } from "@/terminal/store";
import { SearchResults } from "@/terminal/screens/System";

// Header search (/search?q=), grouped as in the terminal concept's Search
// screen. Matching runs server-side across the real records.
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const r = term ? await searchAll(term) : null;
  const groups = r
    ? [
        { label: "Companies", rows: r.companyRows.map((c) => ({ key: c.id, label: c.name, sub: "", go: `/companies/${c.id}` })) },
        { label: "Contacts", rows: r.contactRows.map((c) => ({ key: c.id, label: `${c.firstName} ${c.lastName}`, sub: c.email ?? "", go: `/contacts/${c.id}` })) },
        { label: "Deals", rows: r.dealRows.map((d) => ({ key: d.id, label: d.nextAction, sub: d.stage, go: `/deals/${d.id}` })) },
        { label: "Tasks", rows: r.taskRows.map((t) => ({ key: t.id, label: t.title, sub: "", go: "/tasks" })) },
        {
          label: "Client notes",
          rows: [...r.ideationRows, ...r.roadmapRows, ...r.meetingRows].map((x) => ({ key: x.id, label: "title" in x ? x.title : "", sub: "", go: `/clients/${x.clientId}` })),
        },
        {
          label: "Email",
          rows: r.emailRows.map((e) => ({
            key: e.id,
            label: e.subject || "(no subject)",
            sub: e.fromAddress ?? "",
            go: e.contactId ? `/contacts/${e.contactId}` : e.dealId ? `/deals/${e.dealId}` : "/email-triage",
          })),
        },
      ]
    : [];
  return (
    <StoreData data={{ q: term, groups }}>
      <SearchResults />
    </StoreData>
  );
}
