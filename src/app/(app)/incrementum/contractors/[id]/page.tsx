import Link from "next/link";
import { notFound } from "next/navigation";
import { getContractorDetail, listUnlinkedContractorLogins } from "@/lib/dal/incrementum/contractors";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { ALL_CONTRACTOR_STAGES, CONTRACTOR_STAGES, CONTRACTOR_STAGE_LABELS, CONTRACTOR_RATE_TYPES, type ContractorStage } from "@/lib/incrementum/registry";
import { CONTRACTOR_DRAFTS } from "@/lib/incrementum/drafts";
import { money, shortDate } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip, Avatar } from "@/components/incrementum/ui";
import { OutreachPanel, Timeline } from "@/components/incrementum/Outreach";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import {
  setContractorStageAction,
  updateContractorProfileAction,
  upsertContractorServiceAction,
  removeContractorServiceAction,
  onboardContractorAction,
  removeContractorAction,
  linkContractorLoginAction,
} from "../../actions";

export default async function ContractorDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const [d, s, unlinked] = await Promise.all([getContractorDetail(id), getIncrementumSnapshot(), listUnlinkedContractorLogins()]);
  if (!d) notFound();
  const { profile: p, contractor: c } = d;
  const back = `/incrementum/contractors/${id}`;
  const stage = p.stage as ContractorStage;
  const idx = CONTRACTOR_STAGES.indexOf(stage as (typeof CONTRACTOR_STAGES)[number]);
  const nextStage = idx >= 0 && idx < CONTRACTOR_STAGES.length - 2 ? CONTRACTOR_STAGES[idx + 1] : null;
  const agreementsDone = Boolean(p.payWhenPaidAcceptedAt && p.nonSolicitSignedAt);
  const reviewed = Boolean(s.state.contractorLockdownApplied);
  const canOnboard = stage === "confirmed" && agreementsDone && reviewed && d.portalUsers.length === 0;
  const activeServices = s.services.filter((x) => x.status === "active");

  return (
    <>
      <Link href="/incrementum/contractors" className="inc-link">
        ← Contractors
      </Link>
      <PageHead
        eyebrow={p.businessName ?? c.specialty ?? "Contractor"}
        title={
          <span className="inc-inline" style={{ gap: "var(--gh-space-4)" }}>
            <Avatar name={c.name} photoUrl={p.photoUrl} size={56} />
            {c.name}
          </span>
        }
        actions={
          <>
            <Chip tone={stage === "onboarded" ? "accent" : stage === "not_a_fit" ? "danger" : stage === "confirmed" ? "good" : undefined}>{CONTRACTOR_STAGE_LABELS[stage]}</Chip>
            {stage === "onboarded" && <Chip tone="accent">◆ Gray Horizon Team</Chip>}
          </>
        }
      />
      <Flash ok={ok} error={error} />

      <section className="inc-panel">
        <div className="inc-steps" style={{ gridTemplateColumns: `repeat(${CONTRACTOR_STAGES.length}, minmax(0, 1fr))` }}>
          {CONTRACTOR_STAGES.map((st, i) => (
            <div key={st} className="inc-step" data-state={st === stage ? "active" : idx > i ? "done" : undefined}>
              <span className="inc-step-num">{i + 1}</span>
              <span className="inc-step-name" style={{ fontSize: "var(--gh-text-sm)" }}>
                {CONTRACTOR_STAGE_LABELS[st]}
              </span>
            </div>
          ))}
        </div>
        <div className="inc-inline">
          {nextStage && (
            <form action={setContractorStageAction}>
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="contractorId" value={id} />
              <input type="hidden" name="stage" value={nextStage} />
              <SubmitButton pendingLabel="…">Advance → {CONTRACTOR_STAGE_LABELS[nextStage]}</SubmitButton>
            </form>
          )}
          <details className="inc-disclosure">
            <summary>Move to any stage</summary>
            <form action={setContractorStageAction} className="inc-inline">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="contractorId" value={id} />
              <select className="gh-input" name="stage" defaultValue={stage} aria-label="Stage">
                {ALL_CONTRACTOR_STAGES.filter((st) => st !== "onboarded").map((st) => (
                  <option key={st} value={st}>
                    {CONTRACTOR_STAGE_LABELS[st]}
                  </option>
                ))}
              </select>
              <input className="gh-input" name="note" placeholder="Note (required for Not a fit)" />
              <SubmitButton className="gh-btn-secondary" pendingLabel="…">Move</SubmitButton>
            </form>
          </details>
        </div>
        {p.offRampReason && <p className="inc-small">Reason: {p.offRampReason}</p>}
      </section>

      <div className="inc-two">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", minWidth: 0 }}>
          <section className="inc-panel">
            <h2 className="inc-cell-title">
              Services &amp; <em>pricing</em>
            </h2>
            <p className="inc-small">Their quote per service. Bench quotes (Confirmed/Onboarded) drive sell prices in Services &amp; Pricing; capacity drives the Capacity forecast.</p>
            <div className="inc-list">
              {d.services.map(({ link, serviceName }) => (
                <div className="inc-row" key={link.id}>
                  <span>
                    <strong style={{ fontWeight: 500 }}>{serviceName}</strong>
                    <span className="inc-small">
                      {" "}
                      · {money(link.rate)}/{link.rateType === "monthly" ? "mo" : link.rateType} · {link.capacitySlots ?? "?"} client slots
                    </span>
                    {link.notes && <span className="inc-small"> · {link.notes}</span>}
                  </span>
                  <form action={removeContractorServiceAction}>
                    <input type="hidden" name="_back" value={back} />
                    <input type="hidden" name="id" value={link.id} />
                    <button className="gh-link-btn" type="submit" aria-label="Remove">
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <form action={upsertContractorServiceAction} className="inc-form">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="contractorId" value={id} />
              <label className="inc-field">
                Service
                <select className="gh-input" name="serviceId" required>
                  {activeServices.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inc-field">
                Rate type
                <select className="gh-input" name="rateType" defaultValue="monthly">
                  {CONTRACTOR_RATE_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inc-field">
                Rate ($)
                <input className="gh-input" name="rate" inputMode="decimal" required />
              </label>
              <label className="inc-field">
                Capacity (clients)
                <input className="gh-input" name="capacitySlots" inputMode="decimal" />
              </label>
              <label className="inc-field inc-field--wide">
                Notes
                <input className="gh-input" name="notes" />
              </label>
              <SubmitButton pendingLabel="Saving…">Save quote</SubmitButton>
            </form>
          </section>

          <OutreachPanel
            entityType="contractor"
            entityId={id}
            back={back}
            drafts={CONTRACTOR_DRAFTS}
            name={c.name}
            email={p.email}
            meetingTitle={`Gray Horizon × ${c.name}`}
          />

          <Timeline activities={d.activities} stageEvents={d.stageEvents} labels={CONTRACTOR_STAGE_LABELS} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", minWidth: 0 }}>
          <section className="inc-panel" style={{ borderColor: canOnboard ? "var(--gh-accent)" : undefined }}>
            <h2 className="inc-cell-title">
              Onboard to <em>GrayPortal</em>
            </h2>
            {d.portalUsers.length > 0 ? (
              d.portalUsers.map((u) => (
                <p key={u.id} className="inc-small">
                  {u.email} · {u.googleUid ? "Active" : "Invited, awaiting first sign-in"}
                </p>
              ))
            ) : (
              <>
                <ul className="inc-small" style={{ paddingLeft: "var(--gh-space-4)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <li>{stage === "confirmed" ? "✓" : "✗"} Stage is Confirmed</li>
                  <li>{agreementsDone ? "✓" : "✗"} Pay-when-paid and non-solicit recorded</li>
                  <li>
                    {reviewed ? "✓" : "✗"} Contractor lockdown applied (
                    <Link className="inc-link" href="/incrementum/contractors?view=bench#access">
                      details
                    </Link>
                    )
                  </li>
                </ul>
                {unlinked.length > 0 && (
                  <form action={linkContractorLoginAction} className="inc-inline">
                    <input type="hidden" name="_back" value={back} />
                    <input type="hidden" name="contractorId" value={id} />
                    <select className="gh-input" name="userId" aria-label="Existing login" style={{ flex: 1 }}>
                      {unlinked.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email}
                          {u.active ? "" : " (never signed in)"}
                        </option>
                      ))}
                    </select>
                    <SubmitButton className="gh-btn-secondary" disabled={!reviewed} pendingLabel="…">
                      Link existing login
                    </SubmitButton>
                  </form>
                )}
                <form action={onboardContractorAction} className="inc-form">
                  <input type="hidden" name="_back" value={back} />
                  <input type="hidden" name="contractorId" value={id} />
                  <label className="inc-field">
                    Login email
                    <input className="gh-input" type="email" name="email" defaultValue={p.email ?? ""} required />
                  </label>
                  <label className="inc-field">
                    Display name
                    <input className="gh-input" name="displayName" defaultValue={c.name} />
                  </label>
                  <SubmitButton disabled={!canOnboard} pendingLabel="Onboarding…">
                    Onboard to GrayPortal
                  </SubmitButton>
                </form>
              </>
            )}
          </section>

          <section className="inc-panel">
            <h2 className="inc-cell-title">Profile</h2>
            <form action={updateContractorProfileAction} className="inc-form">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="contractorId" value={id} />
              <Field name="name" label="Name" v={c.name} />
              <Field name="specialty" label="Specialty" v={c.specialty} />
              <Field name="businessName" label="Business" v={p.businessName} />
              <Field name="email" label="Email" v={p.email} type="email" />
              <Field name="phone" label="Phone" v={p.phone} />
              <Field name="location" label="Location" v={p.location} />
              <Field name="portfolioUrl" label="Portfolio" v={p.portfolioUrl} />
              <Field name="source" label="Found via" v={p.source} />
              <Field name="skills" label="Skills (comma-separated)" v={(p.skills ?? []).join(", ")} wide />
              <label className="inc-field">
                GST registered
                <select className="gh-input" name="gstRegistered" defaultValue={p.gstRegistered === null ? "" : p.gstRegistered ? "yes" : "no"}>
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <Field name="paymentTerms" label="Payment terms" v={p.paymentTerms} />
              <label className="inc-field">
                Quality (1–5)
                <select className="gh-input" name="qualityRating" defaultValue={p.qualityRating ? String(p.qualityRating) : ""}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <p className="gh-eyebrow inc-field--wide" style={{ marginTop: "var(--gh-space-2)" }}>
                Agreements
              </p>
              <Field name="payWhenPaidAcceptedAt" label="Pay-when-paid accepted" v={p.payWhenPaidAcceptedAt} type="date" />
              <Field name="nonSolicitSignedAt" label="Non-solicit signed" v={p.nonSolicitSignedAt} type="date" />
              <Field name="noticePeriodDays" label="Notice (days)" v={p.noticePeriodDays} type="number" />
              <Field name="agreementUrl" label="Signed agreement link" v={p.agreementUrl} />
              <p className="gh-eyebrow inc-field--wide" style={{ marginTop: "var(--gh-space-2)" }}>
                Team card (shown once onboarded)
              </p>
              <Field name="publicTitle" label="Public title" v={p.publicTitle} />
              <Field name="photoUrl" label="Photo URL" v={p.photoUrl} />
              <label className="inc-field inc-field--wide">
                Bio
                <textarea className="gh-input" name="bio" defaultValue={p.bio ?? ""} />
              </label>
              <label className="inc-field inc-field--wide">
                Notes
                <textarea className="gh-input" name="notes" defaultValue={p.notes ?? ""} />
              </label>
              <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
            </form>
          </section>

          {d.engagements.length > 0 && (
            <section className="inc-panel">
              <h2 className="inc-cell-title">Engagements</h2>
              {d.engagements.map((e) => (
                <Link className="inc-row" key={e.link.id} href={`/incrementum/engagements/${e.link.engagementId}`}>
                  <span>{e.clientName ?? e.engagementName}</span>
                  <span className="inc-small">
                    {e.link.role} · {money(e.link.monthlyCost)}/mo · {e.status}
                  </span>
                </Link>
              ))}
            </section>
          )}

          <form action={removeContractorAction}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="contractorId" value={id} />
            <button className="gh-link-btn gh-link-btn--danger" type="submit">
              Remove from Incrementum (keeps the GrayPortal record)
            </button>
          </form>
          <p className="inc-small">In Incrementum since {shortDate(p.createdAt, true)}</p>
        </div>
      </div>
      <IncrementumReadySignal />
    </>
  );
}

function Field({ name, label, v, type = "text", wide }: { name: string; label: string; v: string | number | null | undefined; type?: string; wide?: boolean }) {
  return (
    <label className={wide ? "inc-field inc-field--wide" : "inc-field"}>
      {label}
      <input className="gh-input" name={name} type={type} defaultValue={v ?? ""} />
    </label>
  );
}
