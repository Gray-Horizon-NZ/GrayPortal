import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listContractorsWithoutProfile } from "@/lib/dal/incrementum/contractors";
import { CONTRACTOR_STAGES, CONTRACTOR_STAGE_LABELS, BENCH_STAGES, type ContractorStage } from "@/lib/incrementum/registry";
import { money, shortDate } from "@/lib/incrementum/format";
import { PageHead, Flash, Chip, Avatar, Dot } from "@/components/incrementum/ui";
import { TeamWidget } from "@/components/incrementum/widgets";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { createContractorAction, addExistingContractorAction } from "../actions";

const BACK = "/incrementum/contractors";

export default async function ContractorsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; view?: string; service?: string }> }) {
  const { ok, error, view, service } = await searchParams;
  const [s, unprofiled] = await Promise.all([getIncrementumSnapshot(), listContractorsWithoutProfile()]);
  const bench = view === "bench";
  const svcName = new Map(s.services.map((x) => [x.id, x.name]));
  const servicesFor = (contractorId: string) => s.state.contractorServices.filter((cs) => cs.contractorId === contractorId);
  const profiles = s.state.profiles.filter((p) => !service || servicesFor(p.contractorId).some((cs) => cs.serviceId === service));
  const lockdown = Boolean(s.state.contractorLockdownApplied);
  const offRamp = profiles.filter((p) => p.stage === "paused" || p.stage === "not_a_fit");

  return (
    <>
      <PageHead
        eyebrow="Deliver"
        title={<>Contractors</>}
        lede="Recruit the bench: source → contact → meet → vet → confirm → onboard. Every stage change is timed, which is what the Capacity forecast uses to set recruit-by dates."
        actions={
          <>
            <Link className={bench ? "gh-btn-secondary" : "gh-btn-primary"} href={BACK}>
              Pipeline
            </Link>
            <Link className={bench ? "gh-btn-primary" : "gh-btn-secondary"} href={`${BACK}?view=bench`}>
              Bench
            </Link>
          </>
        }
      />
      <Flash ok={ok} error={error} />

      <form className="inc-inline" action={BACK}>
        {bench && <input type="hidden" name="view" value="bench" />}
        <select className="gh-input" name="service" defaultValue={service ?? ""} aria-label="Filter by service">
          <option value="">All services</option>
          {s.services
            .filter((x) => x.status === "active")
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
        </select>
        <button className="gh-btn-secondary" type="submit">
          Filter
        </button>
      </form>

      {!bench ? (
        <div className="inc-board">
          {CONTRACTOR_STAGES.map((stage) => {
            const col = profiles.filter((p) => p.stage === stage);
            return (
              <div className="inc-col" key={stage}>
                <div className="inc-col-head">
                  <span>{CONTRACTOR_STAGE_LABELS[stage]}</span>
                  <span className="inc-num">{col.length}</span>
                </div>
                <div className="inc-col-body">
                  {col.map((p) => {
                    const quotes = servicesFor(p.contractorId);
                    const stale = ["contacted", "meeting_booked", "vetting"].includes(p.stage) && Date.now() - new Date(p.stageChangedAt).getTime() > 7 * 86_400_000;
                    return (
                      <Link className="inc-card" key={p.id} href={`${BACK}/${p.contractorId}`}>
                        <span className="inc-card-title">{p.name}</span>
                        <span className="inc-small">{p.specialty ?? p.businessName ?? ""}</span>
                        {quotes.length > 0 && (
                          <span className="inc-small">
                            {quotes
                              .slice(0, 2)
                              .map((q) => `${svcName.get(q.serviceId) ?? "Service"} ${money(q.rate)}`)
                              .join(" · ")}
                          </span>
                        )}
                        <span className="inc-small inc-inline">
                          {stale && <Dot tone="warning" />}
                          {stale ? "Follow up · " : ""}since {shortDate(p.stageChangedAt)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <section className="inc-panel">
            <TeamWidget s={s} />
          </section>
          <section className="inc-panel">
            <h2 className="inc-cell-title">
              The <em>bench</em>
            </h2>
            <div className="gh-table-wrap">
              <table className="gh-table">
                <thead>
                  <tr>
                    <th>Contractor</th>
                    <th>Stage</th>
                    <th>Services &amp; rates</th>
                    <th className="gh-table-num">Capacity</th>
                    <th>Agreements</th>
                    <th className="gh-table-num">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter((p) => BENCH_STAGES.includes(p.stage as ContractorStage))
                    .map((p) => {
                      const quotes = servicesFor(p.contractorId);
                      const cap = quotes.reduce((a, q) => a + Number(q.capacitySlots ?? 0), 0);
                      return (
                        <tr key={p.id}>
                          <td>
                            <Link href={`${BACK}/${p.contractorId}`} className="inc-inline">
                              <Avatar name={p.name} photoUrl={p.photoUrl} size={28} />
                              {p.name}
                            </Link>
                          </td>
                          <td>
                            <Chip tone={p.stage === "onboarded" ? "accent" : "good"}>{CONTRACTOR_STAGE_LABELS[p.stage as ContractorStage]}</Chip>
                          </td>
                          <td className="inc-small">{quotes.map((q) => `${svcName.get(q.serviceId) ?? "?"} ${money(q.rate)}/${q.rateType === "monthly" ? "mo" : q.rateType}`).join(" · ") || "—"}</td>
                          <td className="gh-table-num">{cap || "—"}</td>
                          <td>
                            <Chip tone={p.payWhenPaidAcceptedAt && p.nonSolicitSignedAt ? "good" : "warning"}>{p.payWhenPaidAcceptedAt && p.nonSolicitSignedAt ? "Signed" : "Missing"}</Chip>
                          </td>
                          <td className="gh-table-num">{p.qualityRating ? `${p.qualityRating}/5` : "—"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="inc-panel" id="access" style={{ borderColor: lockdown ? "var(--gh-border)" : "var(--gh-danger)" }}>
            <div className="inc-cell-head">
              <h2 className="inc-cell-title">
                Contractor <em>access</em>
              </h2>
              <Chip tone={lockdown ? "good" : "danger"}>{lockdown ? "Lockdown applied: onboarding unlocked" : "Lockdown not applied: onboarding locked"}</Chip>
            </div>
            {lockdown ? (
              <p className="inc-muted">
                Contractor logins only reach their own workspace (/work): their clients, months, tasks, payouts, playbooks and the team, through views that never show what a client pays. No CRM, no client list, no prices, no emails.
              </p>
            ) : (
              <>
                <p className="inc-muted">Audit (2026-10-18): today a contractor login can read and write every company, contact, client, task, client price, the pricing catalogue and every email.</p>
                <p className="inc-callout" data-tone="danger">
                  Apply db/sql/031_contractor_scoping.sql (it&apos;s in the one-paste file db/APPLY-incrementum-2026-10-18.sql). Onboarding unlocks automatically once it&apos;s in.
                </p>
              </>
            )}
          </section>
        </>
      )}

      <div className="inc-two">
        <section className="inc-panel">
          <h2 className="inc-cell-title">
            Add a <em>contractor</em>
          </h2>
          <form action={createContractorAction} className="inc-form">
            <input type="hidden" name="_back" value={BACK} />
            <label className="inc-field">
              Name
              <input className="gh-input" name="name" required />
            </label>
            <label className="inc-field">
              Specialty
              <input className="gh-input" name="specialty" placeholder="Google + Meta ads" />
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
              Found via
              <input className="gh-input" name="source" placeholder="Cold call, referral, LinkedIn…" />
            </label>
            <label className="inc-field">
              Portfolio
              <input className="gh-input" name="portfolioUrl" placeholder="https://…" />
            </label>
            <label className="inc-field">
              Stage
              <select className="gh-input" name="stage" defaultValue="sourced">
                {CONTRACTOR_STAGES.filter((st) => st !== "onboarded").map((st) => (
                  <option key={st} value={st}>
                    {CONTRACTOR_STAGE_LABELS[st]}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton pendingLabel="Adding…">Add contractor</SubmitButton>
          </form>
        </section>

        <section className="inc-panel">
          <h2 className="inc-cell-title">
            Already in <em>GrayPortal</em>
          </h2>
          {unprofiled.length === 0 ? (
            <p className="inc-muted">Every GrayPortal contractor is in Incrementum.</p>
          ) : (
            <div className="inc-list">
              {unprofiled.map((c) => (
                <form className="inc-row" key={c.id} action={addExistingContractorAction}>
                  <input type="hidden" name="_back" value={BACK} />
                  <input type="hidden" name="contractorId" value={c.id} />
                  <span>
                    {c.name} <span className="inc-small">{c.specialty ?? ""}</span>
                  </span>
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">
                    Bring in
                  </SubmitButton>
                </form>
              ))}
            </div>
          )}
          {offRamp.length > 0 && (
            <div className="inc-list">
              <p className="gh-eyebrow">Paused / not a fit</p>
              {offRamp.map((p) => (
                <Link className="inc-row" key={p.id} href={`${BACK}/${p.contractorId}`}>
                  <span>{p.name}</span>
                  <span className="inc-small">
                    {CONTRACTOR_STAGE_LABELS[p.stage as ContractorStage]}
                    {p.offRampReason ? ` · ${p.offRampReason}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <IncrementumReadySignal />
    </>
  );
}
