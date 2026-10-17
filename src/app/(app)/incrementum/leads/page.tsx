import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_SOURCES, LEAD_SOURCE_LABELS, METRICS, type LeadStage } from "@/lib/incrementum/registry";
import { formatMetric, shortDate, minutesSince } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip, Dot } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { createLeadAction } from "../actions";

const BACK = "/incrementum/leads";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const s = await getIncrementumSnapshot();
  const target = s.state.settings.responseTargetMinutes ?? 60;
  const leads = s.state.leads;
  const waiting = leads.filter((l) => !l.firstResponseAt && l.stage !== "won" && l.stage !== "lost");
  const m = s.metrics;

  return (
    <>
      <PageHead
        eyebrow="Sell"
        title={<>Leads</>}
        lede={`Kept separate from the main CRM until they become clients. The response clock runs from arrival to first contact; target ${target} minutes. Website/ad forms post to /api/incrementum/leads (gclid + UTM captured).`}
      />
      <Flash ok={ok} error={error} />

      <div className="inc-stats">
        {(["leads_this_month", "leads_unanswered", "qualified_leads", "close_rate", "avg_response_minutes", "cost_per_lead", "landing_conversion"] as const).map((k) => (
          <div className="inc-stat" key={k}>
            <span className="inc-small">{METRICS[k].label}</span>
            <span className="inc-stat-value">{formatMetric(m[k], METRICS[k].unit)}</span>
          </div>
        ))}
      </div>

      {waiting.length > 0 && (
        <section className="inc-panel" style={{ borderColor: "var(--gh-danger)" }}>
          <h2 className="inc-cell-title">
            Waiting on a <em>reply</em>
          </h2>
          <div className="inc-list">
            {waiting.map((l) => {
              const mins = minutesSince(l.receivedAt);
              return (
                <Link className="inc-row" key={l.id} href={`${BACK}/${l.id}`}>
                  <span className="inc-row-main">
                    <Dot tone={mins > target ? "danger" : "warning"} />
                    <span>
                      {l.businessName}
                      {l.contactName ? <span className="inc-small"> · {l.contactName}</span> : null}
                    </span>
                  </span>
                  <span className="inc-inline">
                    <Chip>{LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS] ?? l.source}</Chip>
                    <Chip tone={mins > target ? "danger" : "warning"}>{formatMetric(mins, "minutes")}</Chip>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="inc-board">
        {LEAD_STAGES.map((st) => {
          const col = leads.filter((l) => l.stage === st);
          return (
            <div className="inc-col" key={st}>
              <div className="inc-col-head">
                <span>{LEAD_STAGE_LABELS[st as LeadStage]}</span>
                <span className="inc-num">{col.length}</span>
              </div>
              <div className="inc-col-body">
                {col.map((l) => (
                  <Link className="inc-card" key={l.id} href={`${BACK}/${l.id}`}>
                    <span className="inc-card-title">{l.businessName}</span>
                    <span className="inc-small">{l.serviceInterest ?? l.contactName ?? ""}</span>
                    <span className="inc-small">
                      {LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS] ?? l.source} · {shortDate(l.receivedAt)}
                      {l.gclid ? " · gclid" : ""}
                    </span>
                    {l.convertedClientId && <Chip tone="good">Client</Chip>}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Add a <em>lead</em>
        </h2>
        <form action={createLeadAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <label className="inc-field">
            Business
            <input className="gh-input" name="businessName" required />
          </label>
          <label className="inc-field">
            Contact
            <input className="gh-input" name="contactName" />
          </label>
          <label className="inc-field">
            Email
            <input className="gh-input" type="email" name="email" />
          </label>
          <label className="inc-field">
            Phone
            <input className="gh-input" name="phone" />
          </label>
          <label className="inc-field">
            Website
            <input className="gh-input" name="website" />
          </label>
          <label className="inc-field">
            Source
            <select className="gh-input" name="source" defaultValue="outreach">
              {LEAD_SOURCES.map((x) => (
                <option key={x} value={x}>
                  {LEAD_SOURCE_LABELS[x]}
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field">
            Package of interest
            <select className="gh-input" name="packageId" defaultValue="">
              <option value="">—</option>
              {s.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="inc-field">
            Monthly ad budget
            <input className="gh-input" name="adBudget" placeholder="e.g. $1,500" />
          </label>
          <label className="inc-field inc-field--wide">
            Notes
            <textarea className="gh-input" name="notes" />
          </label>
          <SubmitButton pendingLabel="Adding…">Add lead</SubmitButton>
        </form>
      </section>
      <IncrementumReadySignal />
    </>
  );
}
