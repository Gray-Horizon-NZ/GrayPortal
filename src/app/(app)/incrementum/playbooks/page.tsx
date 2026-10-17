import Link from "next/link";
import { listPlaybooks } from "@/lib/dal/incrementum/planning";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { PLAYBOOK_TEMPLATE } from "@/lib/incrementum/seeds";
import { shortDate } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { createPlaybookAction } from "../actions";

const BACK = "/incrementum/playbooks";

export default async function PlaybooksPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const [books, s] = await Promise.all([listPlaybooks(), getIncrementumSnapshot()]);
  const svc = new Map(s.services.map((x) => [x.id, x.name]));
  const filled = (body: string) => body.split("\n").filter((l) => l.trim() && !l.startsWith("#") && l.trim() !== "-").length;

  return (
    <>
      <PageHead
        eyebrow="Deliver"
        title={<>Playbooks</>}
        lede="How each service is actually delivered, written down so a backup contractor can take over in a day. Start from the template, get your first contractor to fill in how they work, then test it on the pilot client."
      />
      <Flash ok={ok} error={error} />
      <div className="inc-grid">
        {books.map((b) => {
          const lines = filled(b.body);
          return (
            <Link key={b.id} href={`${BACK}/${b.id}`} className="inc-cell inc-span-4">
              <div className="inc-cell-head">
                <h2 className="inc-cell-title">{b.title}</h2>
                <Chip>v{b.version}</Chip>
              </div>
              <span className="inc-small">{b.serviceId ? svc.get(b.serviceId) : "General"}</span>
              <Chip tone={lines === 0 ? "warning" : lines < 8 ? "accent" : "good"}>{lines === 0 ? "Empty template" : lines < 8 ? "Drafting" : "Written"}</Chip>
              <span className="inc-small">Updated {shortDate(b.updatedAt, true)}</span>
            </Link>
          );
        })}
      </div>
      <section className="inc-panel">
        <h2 className="inc-cell-title">
          New <em>playbook</em>
        </h2>
        <form action={createPlaybookAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <input type="hidden" name="body" value={PLAYBOOK_TEMPLATE} />
          <label className="inc-field">
            Title
            <input className="gh-input" name="title" required />
          </label>
          <label className="inc-field">
            Service
            <select className="gh-input" name="serviceId" defaultValue="">
              <option value="">General</option>
              {s.services.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton pendingLabel="Creating…">Create from template</SubmitButton>
        </form>
      </section>
      <IncrementumReadySignal />
    </>
  );
}
