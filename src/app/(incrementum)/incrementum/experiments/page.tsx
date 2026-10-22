import Link from "next/link";
import { MessageSquare, Info } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { EXPERIMENT_TYPES, EXPERIMENT_TYPE_LABELS, METRICS, METRIC_KEYS, isMetricKey } from "@/lib/incrementum/registry";
import { formatMetric } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, Priv, Field, Console, Tree, Bracket, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog } from "@/components/incrementum/terminal/client";
import { fmtDate, longDate, hrefWith } from "@/components/incrementum/terminal/helpers";
import { createExperimentAction, recordExperimentResultAction, deleteExperimentAction } from "../actions";

const BASE = "/incrementum/experiments";
const typeLabel = (t: string) => EXPERIMENT_TYPE_LABELS[t as keyof typeof EXPERIMENT_TYPE_LABELS] ?? t;

// ─── Experiments (agency contract database) ─────────────────────────────
export default async function ExperimentsPage({ searchParams }: { searchParams: Promise<{ folder?: string; sel?: string; log?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const all = st.experiments;
  const folder = sp.folder === "due" || (EXPERIMENT_TYPES as readonly string[]).includes(sp.folder ?? "") ? (sp.folder as string) : "all";
  const due = (e: (typeof all)[number]) => e.type === "test" && !e.verdict && !!e.endsAt && e.endsAt <= st.today;
  const rows = all.filter((e) => (folder === "all" ? true : folder === "due" ? due(e) : e.type === folder));
  const e = rows.find((x) => x.id === sp.sel) ?? rows[0];
  const back = hrefWith(BASE, { folder: folder === "all" ? null : folder, sel: e?.id ?? null });
  const folderHref = (k: string) => hrefWith(BASE, { folder: k === "all" ? null : k });
  const metricNow = (k: string) => (isMetricKey(k) ? METRICS[k].unit === "currency" ? <Priv>{formatMetric(s.metrics[k], "currency")}</Priv> : formatMetric(s.metrics[k], METRICS[k].unit) : "—");

  return (
    <div className="screen">
      <PageHead title="Experiments" sub="At $400/month there's too little data for charts to say much. You learn from deliberate, logged changes. Tests carry pass/kill lines written in advance." />
      <Console>
        <div className="agency">
          <div className="agency-side">
            <Tree
              value={folder}
              head={
                <Bracket wide dialog="exp-log">
                  Log a change or test
                </Bracket>
              }
              groups={[
                { label: "Needs a verdict", items: [{ key: "due", label: "Verdict due", count: all.filter(due).length, tone: all.some(due) ? "warn" : undefined, href: folderHref("due") }] },
                {
                  label: "Logbook",
                  items: [
                    { key: "all", label: "Everything", count: all.length, href: folderHref("all") },
                    ...EXPERIMENT_TYPES.map((t) => ({ key: t, label: EXPERIMENT_TYPE_LABELS[t], count: all.filter((x) => x.type === t).length, href: folderHref(t) })),
                  ],
                },
              ]}
              foot={
                <Ledger
                  rows={[
                    ["Passed", all.filter((x) => x.verdict === "pass").length, "good"],
                    ["Failed", all.filter((x) => x.verdict === "fail").length],
                    ["Open tests", all.filter((x) => x.type === "test" && !x.verdict).length],
                  ]}
                />
              }
            />
          </div>
          <div className="agency-list">
            <div className="agency-list-head">
              {folder === "all" ? "Everything logged" : folder === "due" ? "Verdict due" : typeLabel(folder)}
              <span className="r">{rows.length}</span>
            </div>
            {rows.length === 0 && (
              <p className="muted small" style={{ padding: 16 }}>
                Nothing here.
              </p>
            )}
            {rows.map((x) => (
              <Link key={x.id} className="agency-row" data-active={e?.id === x.id || undefined} href={hrefWith(BASE, { folder: folder === "all" ? null : folder, sel: x.id })} scroll={false}>
                <span>
                  <b>{x.title}</b>
                  <small>
                    {typeLabel(x.type)} · {longDate(x.startedAt ?? x.createdAt)}
                    {x.endsAt ? ` → check ${fmtDate(x.endsAt)}` : ""}
                  </small>
                </span>
                <span className="r">{x.verdict ? <Badge tone={x.verdict === "pass" ? "good" : x.verdict === "fail" ? "bad" : undefined}>{x.verdict}</Badge> : due(x) ? <Badge tone="warn">Verdict due</Badge> : null}</span>
              </Link>
            ))}
          </div>
          <div className="agency-brief">
            {e ? (
              <>
                <div className="brief-block">
                  <p className="brief-title">
                    <MessageSquare size={13} /> Brief
                  </p>
                  <p className="brief-text">{e.body || "No notes."}</p>
                </div>
                <div className="brief-block">
                  <p className="brief-title">
                    <Info size={13} /> Details
                  </p>
                  <Ledger
                    rows={[
                      ["Type", typeLabel(e.type)],
                      e.metricKey && isMetricKey(e.metricKey) && [`${METRICS[e.metricKey].label} now`, metricNow(e.metricKey)],
                      e.passLine && ["Pass line", e.passLine, "good"],
                      e.killLine && ["Kill line", e.killLine, "bad"],
                      ["Verdict", e.verdict ?? "—", e.verdict === "pass" ? "good" : e.verdict === "fail" ? "bad" : "muted"],
                    ]}
                  />
                  {e.result && (
                    <p className="small" style={{ marginTop: 8 }}>
                      <b>Result:</b> {e.result}
                    </p>
                  )}
                </div>
                <div className="brief-block">
                  {e.type !== "retro" && (
                    <form className="stack" style={{ gap: 10 }} action={recordExperimentResultAction} key={e.id}>
                      <BackTo path={back} />
                      <HiddenFields values={{ id: e.id }} />
                      <Field label={e.verdict ? "Edit result" : "Record result"}>
                        <textarea className="textarea" name="result" defaultValue={e.result ?? ""} />
                      </Field>
                      <Field label="Verdict">
                        <select className="select" name="verdict" defaultValue={e.verdict ?? ""}>
                          <option value="">—</option>
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                          <option value="inconclusive">Inconclusive</option>
                        </select>
                      </Field>
                      <Bracket submit wide>
                        Record verdict
                      </Bracket>
                    </form>
                  )}
                  <form action={deleteExperimentAction} style={{ marginTop: 10 }}>
                    <BackTo path={folderHref(folder)} />
                    <HiddenFields values={{ id: e.id }} />
                    <button type="submit" className="linkbtn danger">
                      Delete
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <p className="muted small" style={{ padding: 16 }}>
                Pick an entry.
              </p>
            )}
          </div>
        </div>
      </Console>

      <Dialog id="exp-log" title="Log a change or test" wide openOnLoad={sp.log === "1"}>
        <form className="form-grid g3" action={createExperimentAction}>
          <BackTo path={BASE} />
          <Field label="Type">
            <select className="select" name="type" defaultValue="change">
              {EXPERIMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXPERIMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What">
            <input className="input" name="title" required placeholder="e.g. Added 'from $966/month' to headline 2" />
          </Field>
          <Field label="Metric to watch">
            <select className="select" name="metricKey" defaultValue="">
              <option value="">—</option>
              {METRIC_KEYS.map((k) => (
                <option key={k} value={k}>
                  {METRICS[k].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Why / expected effect" wide>
            <textarea className="textarea" name="body" />
          </Field>
          <Field label="Pass line">
            <input className="input" name="passLine" />
          </Field>
          <Field label="Kill line">
            <input className="input" name="killLine" />
          </Field>
          <Field label="Started">
            <input className="input" type="date" name="startedAt" defaultValue={st.today} />
          </Field>
          <Field label="Check on">
            <input className="input" type="date" name="endsAt" />
          </Field>
          <div className="form-actions">
            <SubmitButton className="btn btn-primary" pendingLabel="Logging…">
              Log it
            </SubmitButton>
          </div>
        </form>
      </Dialog>
      <IncrementumReadySignal />
    </div>
  );
}
