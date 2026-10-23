// Playbooks as the agency database (concept Deliver.jsx): folder tree of
// service and general playbooks with a status ledger at its foot, and the
// chosen playbook rendered on the right, or its editor with ?edit=1.
import Link from "next/link";
import { BookOpen, Eye, PenLine } from "lucide-react";
import { listPlaybooks } from "@/lib/dal/incrementum/planning";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { PLAYBOOK_TEMPLATE } from "@/lib/incrementum/seeds";
import { renderTrustedMarkdown } from "@/lib/markdown";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, Field, Console, Tree, Ledger, Bracket, BackTo, HiddenFields } from "./kit";
import { longDate } from "./helpers";
import { createPlaybookAction, updatePlaybookAction, deletePlaybookAction } from "@/app/(incrementum)/incrementum/actions";

const BASE = "/incrementum/playbooks";
const filled = (body: string) => body.split("\n").filter((l) => l.trim() && !l.startsWith("#") && l.trim() !== "-").length;
const status = (body: string): [string, string] => {
  const n = filled(body);
  return n === 0 ? ["Empty template", "warn"] : n < 8 ? ["Drafting", "accent"] : ["Written", "good"];
};

export default async function PlaybooksView({ id, edit, creating }: { id?: string; edit?: boolean; creating?: boolean }) {
  const [books, s] = await Promise.all([listPlaybooks(), getIncrementumSnapshot()]);
  const b = books.find((x) => x.id === id) ?? (id ? null : books[0]) ?? null;
  const svc = (sid: string | null) => s.services.find((x) => x.id === sid)?.name;
  const here = b ? `${BASE}/${b.id}` : BASE;
  const short = (t: string) => t.replace(" playbook", "");

  return (
    <div className="screen">
      <PageHead title="Playbooks" sub="How each service is actually delivered, written down so a backup contractor can take over in a day. Start from the template, get your first contractor to fill it in, then test it on the pilot client." />
      <Console>
        <div className="agency two">
          <div className="agency-side">
            <Tree
              value={b?.id}
              head={
                creating ? (
                  <form className="stack" style={{ gap: 8, marginBottom: 10 }} action={createPlaybookAction}>
                    <BackTo path={BASE} />
                    <HiddenFields values={{ body: PLAYBOOK_TEMPLATE }} />
                    <input className="input" name="title" placeholder="Title" required autoFocus />
                    <select className="select" name="serviceId" defaultValue="">
                      <option value="">General</option>
                      {s.services.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                    <SubmitButton className="btn btn-sm btn-primary" pendingLabel="Creating…">
                      Create from template
                    </SubmitButton>
                  </form>
                ) : (
                  <Bracket wide href={`${here}?new=1`}>
                    New playbook
                  </Bracket>
                )
              }
              groups={[
                { label: "Service playbooks", items: books.filter((x) => x.serviceId).map((x) => ({ key: x.id, label: short(x.title), count: `v${x.version}`, href: `${BASE}/${x.id}` })) },
                { label: "General", items: books.filter((x) => !x.serviceId).map((x) => ({ key: x.id, label: x.title, count: `v${x.version}`, href: `${BASE}/${x.id}` })) },
              ]}
              foot={<Ledger rows={books.map((x) => [short(x.title), <Badge key="s" tone={status(x.body)[1]}>{status(x.body)[0]}</Badge>])} />}
            />
          </div>
          <div className="agency-list">
            {b ? (
              <>
                <div className="agency-list-head">
                  <BookOpen size={14} /> {b.title}
                  <span className="r">
                    {svc(b.serviceId) ?? "General"} · v{b.version} · updated {longDate(b.updatedAt)}
                    <Link className="btn btn-sm" href={edit ? here : `${here}?edit=1`} scroll={false}>
                      {edit ? (
                        <>
                          <Eye size={12} /> Preview
                        </>
                      ) : (
                        <>
                          <PenLine size={12} /> Edit
                        </>
                      )}
                    </Link>
                  </span>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  {edit ? (
                    <>
                      <form className="form-grid" action={updatePlaybookAction}>
                        <BackTo path={here} />
                        <HiddenFields values={{ id: b.id }} />
                        <Field label="Title">
                          <input className="input" name="title" defaultValue={b.title} required />
                        </Field>
                        <Field label="Service">
                          <select className="select" name="serviceId" defaultValue={b.serviceId ?? ""}>
                            <option value="">General</option>
                            {s.services.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Playbook (Markdown)" wide>
                          <textarea className="textarea playbook-editor" name="body" defaultValue={b.body} />
                        </Field>
                        <div className="form-actions">
                          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                            Save (new version)
                          </SubmitButton>
                        </div>
                      </form>
                      <form action={deletePlaybookAction} className="row" style={{ marginTop: 10 }}>
                        <BackTo path={here} />
                        <HiddenFields values={{ id: b.id }} />
                        <span className="spacer" />
                        <button type="submit" className="linkbtn danger">
                          Delete playbook
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="markdown" dangerouslySetInnerHTML={{ __html: renderTrustedMarkdown(b.body) }} />
                  )}
                </div>
              </>
            ) : (
              <p className="muted small" style={{ padding: 16 }}>
                {id ? "Playbook not found." : "No playbooks yet."}
              </p>
            )}
          </div>
        </div>
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}
