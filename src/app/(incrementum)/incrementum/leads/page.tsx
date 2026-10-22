import Link from "next/link";
import { Plus, ChevronRight, Reply } from "lucide-react";
import { getIncrementumSnapshot, type IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listLeadHistory } from "@/lib/dal/incrementum/leads";
import { computeNeed, quoteTotals } from "@/lib/incrementum/compute";
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_SOURCES, LEAD_SOURCE_LABELS, BUSINESS_SIZES, BUSINESS_SIZE_LABELS, type LeadStage, type BusinessSize } from "@/lib/incrementum/registry";
import { money, formatMetric, minutesSince } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, Priv, Stat, Field, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog, OpenDialog, ClickRow } from "@/components/incrementum/terminal/client";
import { fmtDate, longDate, addDays, daysBetween, isoOf, hrefWith } from "@/components/incrementum/terminal/helpers";
import { createLeadAction, setLeadStageAction, markLeadRespondedAction } from "../actions";

// ─── Leads (the GrayPortal Pipeline layout) ─────────────────────────────
const BASE = "/incrementum/leads";
const OPEN_STAGES = LEAD_STAGES.slice(0, 5);
const STAGE_PROB: Record<string, number> = { new: 0.05, contacted: 0.1, qualified: 0.25, call_booked: 0.4, proposal: 0.6 };
const NEXT: Record<string, [string, number]> = {
  new: ["Reply", 0],
  contacted: ["Qualify: budget, size, fit", 3],
  qualified: ["Book the discovery call", 3],
  call_booked: ["Run the call, send the proposal", 5],
  proposal: ["Follow up the proposal", 5],
};
type Lead = IncrementumSnapshot["state"]["leads"][number];

/** Value of a lead per month: their built quote, else the package they asked about. */
function leadValue(s: IncrementumSnapshot, l: Lead) {
  const lines = s.state.needs.filter((n) => n.leadId === l.id && !n.engagementId);
  if (lines.length) return quoteTotals(lines.map((n) => computeNeed(s.state, s.services, n))).monthlyPrice;
  return s.packages.find((p) => p.id === l.packageId)?.totals.monthlyPrice ?? 0;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ stage?: string; new?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const stage = sp.stage === "waiting" || (LEAD_STAGES as readonly string[]).includes(sp.stage ?? "") ? (sp.stage as string) : "new";
  const back = hrefWith(BASE, { stage: stage === "new" ? null : stage });
  const target = st.settings.responseTargetMinutes ?? 60;
  const value = (l: Lead) => leadValue(s, l);
  const open = st.leads.filter((l) => (OPEN_STAGES as readonly string[]).includes(l.stage));
  const won = st.leads.filter((l) => l.stage === "won");
  const lost = st.leads.filter((l) => l.stage === "lost");
  const waiting = st.leads.filter((l) => !l.firstResponseAt && !["won", "lost"].includes(l.stage));
  const total = open.reduce((a, l) => a + value(l), 0);
  const weighted = open.reduce((a, l) => a + value(l) * (STAGE_PROB[l.stage] ?? 0), 0);
  const winRate = won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0;
  const rows = (stage === "waiting" ? waiting : st.leads.filter((l) => l.stage === stage)).sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
  const tile = (x: string) => {
    const ls = st.leads.filter((l) => l.stage === x);
    return { count: ls.length, value: ls.reduce((a, l) => a + value(l), 0) };
  };
  const history = await listLeadHistory(rows.map((l) => l.id));
  const stageHref = (k: string) => hrefWith(BASE, { stage: k === "new" ? null : k });

  return (
    <div className="screen">
      <PageHead title="Leads" sub="Pick a stage to see its leads; open one for its profile. Kept out of the main CRM until they sign.">
        <OpenDialog target="lead-new" className="btn btn-primary">
          <Plus size={14} /> New lead
        </OpenDialog>
      </PageHead>

      {waiting.length > 0 && (
        <div className="statusbar">
          <span className="status">
            Waiting on a reply: <em data-tone="bad">{waiting.length}</em>
          </span>
          {waiting.map((l) => {
            const mins = minutesSince(l.receivedAt);
            return (
              <Link key={l.id} className="linkbtn" href={`${BASE}/${l.id}`}>
                {l.businessName} · <span className={mins > target ? "tone-bad" : "tone-warn"}>{formatMetric(mins, "minutes")}</span>
              </Link>
            );
          })}
          <span className="meta" style={{ marginLeft: "auto" }}>
            target {target} min
          </span>
        </div>
      )}

      <div className="stagetiles">
        {OPEN_STAGES.map((x) => {
          const t = tile(x);
          return (
            <Link key={x} className="stagetile" data-active={stage === x || undefined} href={stageHref(x)} scroll={false}>
              <span className="name">{LEAD_STAGE_LABELS[x]}</span>
              <span className="n">{t.count}</span>
              <span className="v">
                <Priv>{money(t.value)}</Priv>
                <span className="muted small"> /mo</span>
              </span>
              <span className="w">
                Weighted <Priv>{money(t.value * STAGE_PROB[x])}</Priv> · {Math.round(STAGE_PROB[x] * 100)}% close rate
              </span>
            </Link>
          );
        })}
      </div>
      <div className="stagetiles closed">
        {(
          [
            ["waiting", "Waiting on a reply", waiting.length, null],
            ["won", "Won", won.length, tile("won").value],
            ["lost", "Lost", lost.length, tile("lost").value],
          ] as const
        ).map(([k, label, n, v]) => (
          <Link key={k} className="stagetile" data-active={stage === k || undefined} href={stageHref(k)} scroll={false}>
            <span className="name">{label}</span>
            <span className="w">{v !== null ? <Priv>{money(v)}</Priv> : `target ${target} min`}</span>
            <span className="n">{n}</span>
          </Link>
        ))}
      </div>

      <section className="panel">
        <header className="phead">
          <span className="ptitle">{stage === "waiting" ? "Waiting on a reply" : LEAD_STAGE_LABELS[stage as LeadStage]}</span>
          <span className="r">
            {rows.length} lead{rows.length === 1 ? "" : "s"}
          </span>
        </header>
        {rows.length === 0 ? (
          <p className="muted small" style={{ padding: "18px 22px" }}>
            No leads in this stage.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th className="num">Value / mo</th>
                  <th>Next action</th>
                  <th className="num">In stage</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const since = isoOf(l.stageChangedAt ?? l.receivedAt);
                  const isOpen = (OPEN_STAGES as readonly string[]).includes(l.stage);
                  const [action, days] = NEXT[l.stage] ?? [l.lostReason || "—", 0];
                  const due = isOpen ? (l.stage === "new" ? isoOf(l.receivedAt) : addDays(since, days)) : null;
                  const late = isOpen && (l.stage === "new" ? !l.firstResponseAt && minutesSince(l.receivedAt) > target : !!due && due < st.today);
                  const engagement = st.engagements.find((e) => e.leadId === l.id);
                  const nextStage = LEAD_STAGES[LEAD_STAGES.indexOf(l.stage as LeadStage) + 1];
                  return (
                    <ClickRow key={l.id} dialog={`lead-${l.id}`}>
                      <td>
                        <b className="strong">{l.businessName}</b>
                        <div className="muted small">
                          <Priv>{l.contactName ?? "—"}</Priv> · {LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS] ?? l.source}
                          {l.gclid ? " · gclid" : ""}
                        </div>
                      </td>
                      <td className="num">
                        <Priv>{money(value(l))}</Priv>
                      </td>
                      <td>
                        <div className={late ? "tone-bad" : ""}>{l.stage === "won" ? "Client" : action}</div>
                        <div className={`small ${late ? "tone-bad" : "muted"}`}>
                          {isOpen ? (l.stage === "new" && !l.firstResponseAt ? `Waiting ${formatMetric(minutesSince(l.receivedAt), "minutes")}` : late ? `Overdue · ${fmtDate(due)}` : fmtDate(due)) : ""}
                        </div>
                      </td>
                      <td className="num muted">{daysBetween(since, st.today)}d</td>
                      <td className="num">
                        {l.stage === "proposal" ? (
                          <Link className="btn btn-sm btn-primary" href={`${BASE}/${l.id}?onboard=1`}>
                            Onboard <ChevronRight size={12} />
                          </Link>
                        ) : isOpen ? (
                          <form action={setLeadStageAction}>
                            <BackTo path={back} />
                            <HiddenFields values={{ id: l.id, stage: nextStage }} />
                            <SubmitButton className="btn btn-sm btn-primary" pendingLabel="…">
                              Advance <ChevronRight size={12} />
                            </SubmitButton>
                          </form>
                        ) : l.stage === "won" && engagement ? (
                          <Link className="btn btn-sm" href={`/incrementum/clients/${engagement.id}`}>
                            Client <ChevronRight size={12} />
                          </Link>
                        ) : null}
                      </td>
                    </ClickRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid g-4">
        <Stat label="Open pipeline" value={money(total)} sub={`${open.length} leads · per month`} accent />
        <Stat label="Weighted" value={money(weighted)} sub="value × stage close rate" accent />
        <Stat label="Average lead" value={money(open.length ? total / open.length : 0)} sub="per month, open leads" accent />
        <Stat label="Win rate" value={`${Math.round(winRate)}%`} priv={false} sub={`${won.length} won of ${won.length + lost.length} closed`} accent />
      </div>

      {rows.map((l) => (
        <LeadQuickView key={l.id} l={l} value={value(l)} back={back} history={history} engagementId={st.engagements.find((e) => e.leadId === l.id)?.id ?? null} />
      ))}
      <NewLeadDialog s={s} openOnLoad={sp.new === "1"} />
      <IncrementumReadySignal />
    </div>
  );
}

function LeadQuickView({ l, value, back, history, engagementId }: { l: Lead; value: number; back: string; history: Awaited<ReturnType<typeof listLeadHistory>>; engagementId: string | null }) {
  const idx = LEAD_STAGES.indexOf(l.stage as LeadStage);
  const isOpen = idx < 5;
  const acts = [
    ...history.activities.filter((a) => a.entityId === l.id).map((a) => ({ at: new Date(a.occurredAt), type: a.type, body: a.subject ?? a.body ?? "" })),
    ...history.stageEvents
      .filter((x) => x.entityId === l.id)
      .map((x) => ({ at: new Date(x.createdAt), type: "stage", body: `${LEAD_STAGE_LABELS[x.fromStage as LeadStage] ?? "—"} → ${LEAD_STAGE_LABELS[x.toStage as LeadStage] ?? x.toStage}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const next = LEAD_STAGES[idx + 1];
  return (
    <Dialog id={`lead-${l.id}`} title={l.businessName} wide>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <Badge tone="accent">{LEAD_STAGE_LABELS[l.stage as LeadStage] ?? l.stage}</Badge>
          <span className="muted small">
            {LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS] ?? l.source} · arrived {longDate(l.receivedAt)} · {l.businessSize ? BUSINESS_SIZE_LABELS[l.businessSize as BusinessSize] : "size not set"}
          </span>
        </div>
        <span style={{ fontSize: 26, fontWeight: 600, color: "var(--t-accent)" }}>
          <Priv>{money(value)}</Priv>
          <span className="muted small"> /mo</span>
        </span>
      </div>
      <div className="stepper">
        {LEAD_STAGES.slice(0, 6).map((x, i) => (
          <span key={x} data-done={i < idx || undefined} data-current={x === l.stage || undefined}>
            {LEAD_STAGE_LABELS[x]}
          </span>
        ))}
      </div>
      <div className="grid g-2">
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Contact
          </p>
          <Ledger
            rows={[
              ["Name", <Priv key="n">{l.contactName || "—"}</Priv>],
              ["Email", <Priv key="e">{l.email || "—"}</Priv>],
              ["Phone", <Priv key="p">{l.phone || "—"}</Priv>],
              ["Ad budget", l.adBudget || "—"],
            ]}
          />
        </div>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Their message
          </p>
          <p className="brief-text">
            <Priv>{l.message || l.notes || "No message. Added by hand."}</Priv>
          </p>
        </div>
      </div>
      <div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          Activity
        </p>
        {acts.length === 0 ? (
          <p className="muted small">No activity logged yet.</p>
        ) : (
          <div className="timeline">
            {acts.slice(0, 6).map((a, i) => (
              <div key={i}>
                <time>
                  {fmtDate(a.at)} · {a.type}
                </time>
                <span>{a.body}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {isOpen && (
        <details className="inline-details">
          <summary className="btn btn-danger" style={{ display: "inline-flex" }}>
            Mark lost
          </summary>
          <form className="row" action={setLeadStageAction} style={{ marginTop: 10 }}>
            <BackTo path={back} />
            <HiddenFields values={{ id: l.id, stage: "lost" }} />
            <input className="input" name="note" style={{ flex: 1, width: "auto" }} placeholder="Why lost? (required)" required />
            <SubmitButton className="btn btn-danger" pendingLabel="…">
              Confirm lost
            </SubmitButton>
          </form>
        </details>
      )}
      <div className="row" style={{ borderTop: "1px solid var(--t-line)", paddingTop: 14 }}>
        {!l.firstResponseAt && (
          <form action={markLeadRespondedAction}>
            <BackTo path={back} />
            <HiddenFields values={{ id: l.id }} />
            <SubmitButton className="btn" pendingLabel="…">
              <Reply size={13} /> I&apos;ve replied
            </SubmitButton>
          </form>
        )}
        <span className="spacer" />
        <Link className="btn" href={`${BASE}/${l.id}`}>
          Open full lead
        </Link>
        {isOpen && l.stage !== "proposal" && next && (
          <form action={setLeadStageAction}>
            <BackTo path={back} />
            <HiddenFields values={{ id: l.id, stage: next }} />
            <SubmitButton className="btn btn-primary" pendingLabel="…">
              Advance to {LEAD_STAGE_LABELS[next]} <ChevronRight size={14} />
            </SubmitButton>
          </form>
        )}
        {l.stage === "proposal" && (
          <Link className="btn btn-primary" href={`${BASE}/${l.id}?onboard=1`}>
            Onboard client <ChevronRight size={14} />
          </Link>
        )}
        {l.stage === "won" && engagementId && (
          <Link className="btn btn-primary" href={`/incrementum/clients/${engagementId}`}>
            Open client <ChevronRight size={14} />
          </Link>
        )}
      </div>
    </Dialog>
  );
}

function NewLeadDialog({ s, openOnLoad }: { s: IncrementumSnapshot; openOnLoad?: boolean }) {
  return (
    <Dialog id="lead-new" title="New lead" wide openOnLoad={openOnLoad}>
      <form className="form-grid g3" action={createLeadAction}>
        <BackTo path={BASE} />
        <Field label="Business">
          <input className="input" name="businessName" required />
        </Field>
        <Field label="Contact">
          <input className="input" name="contactName" />
        </Field>
        <Field label="Email">
          <input className="input" type="email" name="email" />
        </Field>
        <Field label="Phone">
          <input className="input" name="phone" />
        </Field>
        <Field label="Website">
          <input className="input" name="website" />
        </Field>
        <Field label="Source">
          <select className="select" name="source" defaultValue="outreach">
            {LEAD_SOURCES.map((x) => (
              <option key={x} value={x}>
                {LEAD_SOURCE_LABELS[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Package of interest">
          <select className="select" name="packageId" defaultValue="">
            <option value="">—</option>
            {s.packages
              .filter((p) => p.status !== "retired")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Monthly ad budget">
          <input className="input" name="adBudget" placeholder="e.g. $1,500" />
        </Field>
        <Field label="Business size">
          <select className="select" name="businessSize" defaultValue="">
            <option value="">Not set</option>
            {BUSINESS_SIZES.map((z) => (
              <option key={z} value={z}>
                {BUSINESS_SIZE_LABELS[z]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Their message" wide>
          <textarea className="textarea" name="message" />
        </Field>
        <Field label="Notes" wide>
          <input className="input" name="notes" />
        </Field>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
            Add lead
          </SubmitButton>
          <span className="muted small">Website and ad forms arrive here on their own (POST /api/incrementum/leads, gclid + UTM captured).</span>
        </div>
      </form>
    </Dialog>
  );
}
