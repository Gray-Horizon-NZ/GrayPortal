import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaybook } from "@/lib/dal/incrementum/planning";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { renderTrustedMarkdown } from "@/lib/markdown";
import { shortDate } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { updatePlaybookAction, deletePlaybookAction } from "../../actions";

export default async function PlaybookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const [b, s] = await Promise.all([getPlaybook(id), getIncrementumSnapshot()]);
  if (!b) notFound();
  const back = `/incrementum/playbooks/${id}`;

  return (
    <>
      <Link href="/incrementum/playbooks" className="inc-link">
        ← Playbooks
      </Link>
      <PageHead eyebrow={`Version ${b.version} · updated ${shortDate(b.updatedAt, true)}`} title={b.title} actions={<Chip>Markdown</Chip>} />
      <Flash ok={ok} error={error} />
      <div className="inc-two" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <section className="inc-panel">
          <h2 className="inc-cell-title">Edit</h2>
          <form action={updatePlaybookAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="id" value={id} />
            <label className="inc-field">
              Title
              <input className="gh-input" name="title" defaultValue={b.title} required />
            </label>
            <label className="inc-field">
              Service
              <select className="gh-input" name="serviceId" defaultValue={b.serviceId ?? ""}>
                <option value="">General</option>
                {s.services.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <textarea className="gh-input" name="body" defaultValue={b.body} rows={28} style={{ fontFamily: "var(--gh-font-mono)", fontSize: "var(--gh-text-sm)" }} aria-label="Playbook body (Markdown)" />
            <SubmitButton pendingLabel="Saving…">Save (new version)</SubmitButton>
          </form>
          <form action={deletePlaybookAction}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="id" value={id} />
            <button className="gh-link-btn gh-link-btn--danger" type="submit">
              Delete playbook
            </button>
          </form>
        </section>
        <section className="inc-panel">
          <h2 className="inc-cell-title">Preview</h2>
          <div className="gh-prose" dangerouslySetInnerHTML={{ __html: renderTrustedMarkdown(b.body) }} />
        </section>
      </div>
      <IncrementumReadySignal />
    </>
  );
}
