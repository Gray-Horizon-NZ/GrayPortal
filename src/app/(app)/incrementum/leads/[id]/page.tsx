import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadDetail } from "@/lib/dal/incrementum/leads";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_SOURCES, LEAD_SOURCE_LABELS, type LeadStage } from "@/lib/incrementum/registry";
import { LEAD_DRAFTS } from "@/lib/incrementum/drafts";
import { formatMetric, money, shortDateTime, todayNz, minutesSince } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip } from "@/components/incrementum/ui";
import { OutreachPanel, Timeline } from "@/components/incrementum/Outreach";
import QuoteBuilder from "@/components/incrementum/QuoteBuilder";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { setLeadStageAction, updateLeadAction, markLeadRespondedAction, onboardLeadAction, deleteLeadAction } from "../../actions";

export default async function LeadDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const [d, s] = await Promise.all([getLeadDetail(id), getIncrementumSnapshot()]);
  if (!d) notFound();
  const l = d.lead;
  const back = `/incrementum/leads/${id}`;
  const stage = l.stage as LeadStage;
  const target = s.state.settings.responseTargetMinutes ?? 60;
  const waitingMins = l.firstResponseAt ? null : minutesSince(l.receivedAt);
  const responseMins = l.firstResponseAt ? Math.round((new Date(l.firstResponseAt).getTime() - new Date(l.receivedAt).getTime()) / 60_000) : null;
  const pkg = s.packages.find((p) => p.id === l.packageId) ?? s.packages[0];
  const engagement = l.convertedClientId ? s.state.engagements.find((e) => e.leadId === l.id) : null;

  return (
    <>
      <Link href="/incrementum/leads" className="inc-link">
        ← Leads
      </Link>
      <PageHead
        eyebrow={`${LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS] ?? l.source} · arrived ${shortDateTime(l.receivedAt)}`}
        title={l.businessName}
        actions={
          <>
            <Chip tone={stage === "won" ? "good" : stage === "lost" ? "danger" : "accent"}>{LEAD_STAGE_LABELS[stage]}</Chip>
            {waitingMins !== null && stage !== "lost" && <Chip tone={waitingMins > target ? "danger" : "warning"}>Waiting {formatMetric(waitingMins, "minutes")}</Chip>}
            {responseMins !== null && <Chip tone={responseMins <= target ? "good" : "warning"}>Replied in {formatMetric(responseMins, "minutes")}</Chip>}
          </>
        }
      />
      <Flash ok={ok} error={error} />

      <section className="inc-panel">
        <div className="inc-steps" style={{ gridTemplateColumns: `repeat(${LEAD_STAGES.length}, minmax(0, 1fr))` }}>
          {LEAD_STAGES.map((st, i) => (
            <form key={st} action={setLeadStageAction} className="inc-step" data-state={st === stage ? "active" : LEAD_STAGES.indexOf(stage) > i && stage !== "lost" ? "done" : undefined}>
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="stage" value={st} />
              {st === "lost" && st !== stage && <input className="gh-input" name="note" placeholder="Why lost?" style={{ marginBottom: 4 }} aria-label="Lost reason" />}
              <button type="submit" className="inc-step-name" style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontSize: "var(--gh-text-sm)" }} disabled={st === stage || st === "won"}>
                {LEAD_STAGE_LABELS[st]}
              </button>
            </form>
          ))}
        </div>
        <p className="inc-small">&quot;Won&quot; is set by Onboard client below. Any move past New stops the response clock.</p>
        {l.lostReason && <p className="inc-small">Lost because: {l.lostReason}</p>}
        {!l.firstResponseAt && (
          <form action={markLeadRespondedAction}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="id" value={id} />
            <SubmitButton className="gh-btn-secondary" pendingLabel="…">I&apos;ve replied (outside GrayPortal)</SubmitButton>
          </form>
        )}
      </section>

      <div className="inc-two">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", minWidth: 0 }}>
          {!l.convertedClientId && <QuoteBuilder s={s} leadId={id} back={back} />}
          {l.message && (
            <section className="inc-panel">
              <h2 className="inc-cell-title">Their message</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{l.message}</p>
            </section>
          )}
          <OutreachPanel
            entityType="lead"
            entityId={id}
            back={back}
            drafts={LEAD_DRAFTS}
            name={l.contactName}
            business={l.businessName}
            email={l.email}
            meetingTitle={`Discovery call · ${l.businessName} × Gray Horizon`}
          />
          <Timeline activities={d.activities} stageEvents={d.stageEvents} labels={LEAD_STAGE_LABELS} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", minWidth: 0 }}>
          <section className="inc-panel" style={{ borderColor: "var(--gh-accent)" }}>
            <h2 className="inc-cell-title">
              Onboard <em>client</em>
            </h2>
            {l.convertedClientId ? (
              <>
                <p className="inc-muted">Onboarded. This lead is now a GrayPortal client.</p>
                <div className="inc-inline">
                  <Link className="gh-btn-secondary" href={`/clients/${l.convertedClientId}`}>
                    Client record ↗
                  </Link>
                  {engagement && (
                    <Link className="gh-btn-primary" href={`/incrementum/engagements/${engagement.id}`}>
                      Engagement
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <form action={onboardLeadAction} className="inc-form">
                <input type="hidden" name="_back" value={back} />
                <input type="hidden" name="id" value={id} />
                <p className="inc-small inc-field--wide">
                  Creates the company, client, portal login and starter tasks in the main GrayPortal, starts the engagement at the package&apos;s current price (locked from then on), and marks the lead Won.
                </p>
                <label className="inc-field">
                  Portal login email
                  <input className="gh-input" type="email" name="portalEmail" defaultValue={l.email ?? ""} required />
                </label>
                <label className="inc-field">
                  Display name
                  <input className="gh-input" name="displayName" defaultValue={l.contactName ?? ""} />
                </label>
                <label className="inc-field">
                  Package
                  <select className="gh-input" name="packageId" defaultValue={pkg?.id ?? ""}>
                    <option value="">None</option>
                    {s.packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {money(p.totals.monthlyPrice)}/mo
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inc-field">
                  Start date
                  <input className="gh-input" type="date" name="startDate" defaultValue={todayNz()} required />
                </label>
                <label className="inc-field">
                  Signed monthly price (blank = quote total, else package)
                  <input className="gh-input" name="monthlyPrice" inputMode="decimal" />
                </label>
                <label className="inc-field">
                  Signed setup fee (blank = quote one-offs, else package)
                  <input className="gh-input" name="setupPrice" inputMode="decimal" />
                </label>
                <SubmitButton pendingLabel="Onboarding…">Onboard client</SubmitButton>
              </form>
            )}
          </section>

          <section className="inc-panel">
            <h2 className="inc-cell-title">Details</h2>
            {(l.gclid || l.utm) && (
              <p className="inc-small">
                Tracking: {l.gclid ? `gclid ${l.gclid.slice(0, 12)}…` : ""} {l.utm ? Object.entries(l.utm).map(([k, v]) => `${k}=${v}`).join(" · ") : ""}
              </p>
            )}
            <form action={updateLeadAction} className="inc-form">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="id" value={id} />
              <label className="inc-field">
                Business
                <input className="gh-input" name="businessName" defaultValue={l.businessName} required />
              </label>
              <label className="inc-field">
                Contact
                <input className="gh-input" name="contactName" defaultValue={l.contactName ?? ""} />
              </label>
              <label className="inc-field">
                Email
                <input className="gh-input" type="email" name="email" defaultValue={l.email ?? ""} />
              </label>
              <label className="inc-field">
                Phone
                <input className="gh-input" name="phone" defaultValue={l.phone ?? ""} />
              </label>
              <label className="inc-field">
                Website
                <input className="gh-input" name="website" defaultValue={l.website ?? ""} />
              </label>
              <label className="inc-field">
                Source
                <select className="gh-input" name="source" defaultValue={l.source}>
                  {LEAD_SOURCES.map((x) => (
                    <option key={x} value={x}>
                      {LEAD_SOURCE_LABELS[x]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inc-field">
                Package of interest
                <select className="gh-input" name="packageId" defaultValue={l.packageId ?? ""}>
                  <option value="">—</option>
                  {s.packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inc-field">
                Service interest
                <input className="gh-input" name="serviceInterest" defaultValue={l.serviceInterest ?? ""} />
              </label>
              <label className="inc-field">
                Ad budget
                <input className="gh-input" name="adBudget" defaultValue={l.adBudget ?? ""} />
              </label>
              <input type="hidden" name="message" value={l.message ?? ""} />
              <label className="inc-field inc-field--wide">
                Notes
                <textarea className="gh-input" name="notes" defaultValue={l.notes ?? ""} />
              </label>
              <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
            </form>
          </section>

          <form action={deleteLeadAction}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="id" value={id} />
            <button className="gh-link-btn gh-link-btn--danger" type="submit">
              Delete lead (spam / duplicate)
            </button>
          </form>
        </div>
      </div>
      <IncrementumReadySignal />
    </>
  );
}
