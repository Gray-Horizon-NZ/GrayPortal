import Link from "next/link";
import { notFound } from "next/navigation";
import { getEngagementDetail } from "@/lib/dal/incrementum/engagements";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import {
  ENGAGEMENT_HEALTH,
  ENGAGEMENT_HEALTH_LABELS,
  ENGAGEMENT_MODULES,
  ENGAGEMENT_MODULE_LABELS,
  BENCH_STAGES,
  BUSINESS_SIZES,
  BUSINESS_SIZE_LABELS,
  type ContractorStage,
  type BusinessSize,
} from "@/lib/incrementum/registry";
import { money, shortDate, todayNz } from "@/lib/incrementum/format";
import { monthsBetween } from "@/lib/incrementum/evaluate";
import { toNum } from "@/lib/incrementum/pricing";
import { ProfileHead, Flash, Chip } from "@/components/incrementum/ui";
import { CycleRow } from "@/components/incrementum/CycleRow";
import ClientServices from "@/components/incrementum/ClientServices";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import {
  updateEngagementAction,
  setEngagementModulesAction,
  endEngagementAction,
  reopenEngagementAction,
  addEngagementContractorAction,
  removeEngagementContractorAction,
  openCycleAction,
  logHoursAction,
  deleteHoursAction,
  addActivityAction,
} from "../../actions";

export default async function EngagementDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const [d, s] = await Promise.all([getEngagementDetail(id), getIncrementumSnapshot()]);
  if (!d) notFound();
  const e = d.engagement;
  const back = `/incrementum/engagements/${id}`;
  const price = toNum(e.monthlyPrice) ?? 0;
  const cost = d.team.reduce((a, t) => a + (toNum(t.link.monthlyCost) ?? 0), 0);
  const profit = price - cost;
  const modules = (e.modules ?? {}) as Record<string, boolean>;
  const bench = s.state.profiles.filter((p) => BENCH_STAGES.includes(p.stage as ContractorStage));
  const hoursTotal = d.hours.reduce((a, h) => a + (toNum(h.hours) ?? 0), 0);
  const currentMonth = todayNz().slice(0, 7);

  return (
    <>
      <Link href="/incrementum/engagements" className="inc-link">
        ← Engagements
      </Link>
      <ProfileHead
        eyebrow={d.packageName ? `Client · ${d.packageName} package` : "Client"}
        name={d.clientName ?? e.name}
        meta={[e.startDate && `Started ${shortDate(e.startDate, true)}`, e.minTermEnd && `Min term to ${shortDate(e.minTermEnd, true)}`]}
        badges={
          <>
            <Chip tone={e.status === "active" ? "good" : e.status === "ended" ? undefined : "warning"}>{e.status}</Chip>
            {e.businessSize && <Chip>{BUSINESS_SIZE_LABELS[e.businessSize as BusinessSize] ?? e.businessSize}</Chip>}
            <Chip tone={e.health === "good" ? "good" : e.health === "watch" ? "warning" : "danger"}>{ENGAGEMENT_HEALTH_LABELS[e.health as keyof typeof ENGAGEMENT_HEALTH_LABELS] ?? e.health}</Chip>
            <Link className="gh-btn-secondary" href={`/clients/${e.clientId}`}>
              Client record ↗
            </Link>
          </>
        }
      />
      <Flash ok={ok} error={error} />

      <div className="inc-stats">
        <div className="inc-stat">
          <span className="inc-small">Signed price</span>
          <span className="inc-stat-value">{money(price)}/mo</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Contractor cost</span>
          <span className="inc-stat-value">{money(cost)}/mo</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Profit</span>
          <span className="inc-stat-value" style={{ color: profit < 400 ? "var(--gh-danger)" : profit >= 700 ? "var(--gh-success)" : undefined }}>
            {money(profit)}/mo
          </span>
          <span className="inc-small">{price ? `${Math.round((profit / price) * 100)}% margin` : ""}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Months retained</span>
          <span className="inc-stat-value">{e.startDate ? monthsBetween(e.startDate, e.endedAt ?? s.state.today).toFixed(1) : "—"}</span>
          <span className="inc-small">min term to {shortDate(e.minTermEnd, true)}</span>
        </div>
        <div className="inc-stat">
          <span className="inc-small">Your hours (total)</span>
          <span className="inc-stat-value">{hoursTotal.toFixed(1)} h</span>
        </div>
      </div>

      <ClientServices s={s} engagementId={id} back={back} readOnly={e.status === "ended"} />

      <section className="inc-panel">
        <div className="inc-cell-head">
          <h2 className="inc-cell-title">
            Monthly <em>cycle</em>
          </h2>
          <form action={openCycleAction} className="inc-inline">
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="engagementId" value={id} />
            <input className="gh-input" type="month" name="month" defaultValue={currentMonth} aria-label="Month" />
            <SubmitButton className="gh-btn-secondary" pendingLabel="…">Open month</SubmitButton>
          </form>
        </div>
        <p className="inc-small">Pay-when-paid is enforced: a contractor payout can&apos;t be marked paid before the client has paid. Recording the client payment sets the payout due date (7 days later).</p>
        {d.cycles.length === 0 ? <p className="inc-muted">No months opened yet.</p> : d.cycles.map((c) => <CycleRow key={c.id} c={c} back={back} />)}
      </section>

      <div className="inc-two">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", minWidth: 0 }}>
          <section className="inc-panel">
            <h2 className="inc-cell-title">
              Contractor <em>team</em>
            </h2>
            <div className="inc-list">
              {d.team.map((t) => (
                <div className="inc-row" key={t.link.id}>
                  <Link href={`/incrementum/contractors/${t.link.contractorId}`}>
                    {t.contractorName} <span className="inc-small">· {t.serviceName ?? "—"}</span>
                  </Link>
                  <span className="inc-inline">
                    <Chip tone={t.link.role === "main" ? "accent" : undefined}>{t.link.role}</Chip>
                    <span className="inc-num">{money(t.link.monthlyCost)}/mo</span>
                    <form action={removeEngagementContractorAction}>
                      <input type="hidden" name="_back" value={back} />
                      <input type="hidden" name="id" value={t.link.id} />
                      <button className="gh-link-btn" type="submit" aria-label="Remove">
                        ×
                      </button>
                    </form>
                  </span>
                </div>
              ))}
            </div>
            {d.team.length === 0 && <p className="inc-muted">Assign a main contractor and a backup (27ADS: a backup per service).</p>}
            <form action={addEngagementContractorAction} className="inc-form">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="engagementId" value={id} />
              <label className="inc-field">
                Contractor
                <select className="gh-input" name="contractorId" required>
                  {bench.map((p) => (
                    <option key={p.contractorId} value={p.contractorId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inc-field">
                Service
                <select className="gh-input" name="serviceId" defaultValue="">
                  <option value="">—</option>
                  {s.services
                    .filter((x) => x.billing === "monthly" && x.status === "active")
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="inc-field">
                Role
                <select className="gh-input" name="role" defaultValue="main">
                  <option value="main">Main</option>
                  <option value="backup">Backup</option>
                </select>
              </label>
              <label className="inc-field">
                Monthly cost ($)
                <input className="gh-input" name="monthlyCost" inputMode="decimal" defaultValue="0" />
              </label>
              <SubmitButton className="gh-btn-secondary" pendingLabel="…">Assign</SubmitButton>
            </form>
            {bench.length === 0 && <p className="inc-small">No confirmed contractors yet. Confirm one in Contractors first.</p>}
          </section>

          <section className="inc-panel">
            <h2 className="inc-cell-title">
              Your <em>hours</em>
            </h2>
            <p className="inc-small">Log your own time from day one. It&apos;s the proof the model works without you doing the delivery (pass line ≤ 3 h per client per month).</p>
            <form action={logHoursAction} className="inc-inline">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="engagementId" value={id} />
              <input className="gh-input" type="date" name="workDate" defaultValue={todayNz()} aria-label="Date" />
              <input className="gh-input" name="hours" placeholder="Hours" inputMode="decimal" required style={{ width: 90 }} />
              <input className="gh-input" name="note" placeholder="What for" style={{ flex: 1 }} />
              <SubmitButton className="gh-btn-secondary" pendingLabel="…">Log</SubmitButton>
            </form>
            <div className="inc-list">
              {d.hours.slice(0, 10).map((h) => (
                <div className="inc-row" key={h.id}>
                  <span>
                    {shortDate(h.workDate)} · <span className="inc-num">{h.hours} h</span> {h.note ? <span className="inc-small">· {h.note}</span> : null}
                  </span>
                  <form action={deleteHoursAction}>
                    <input type="hidden" name="_back" value={back} />
                    <input type="hidden" name="id" value={h.id} />
                    <button className="gh-link-btn" type="submit" aria-label="Remove">
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>

          <section className="inc-panel">
            <h2 className="inc-cell-title">Notes</h2>
            <form action={addActivityAction} className="inc-inline">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="entityType" value="engagement" />
              <input type="hidden" name="entityId" value={id} />
              <input type="hidden" name="type" value="note" />
              <input className="gh-input" name="body" placeholder="Add a note (90-day plan check-in, issue, win…)" required style={{ flex: 1 }} />
              <SubmitButton className="gh-btn-secondary" pendingLabel="…">Add</SubmitButton>
            </form>
            <div className="inc-timeline">
              {d.activities.map((a) => (
                <div className="inc-event" key={a.id}>
                  <p className="inc-event-meta">{shortDate(a.occurredAt, true)}</p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", minWidth: 0 }}>
          <section className="inc-panel">
            <h2 className="inc-cell-title">Modules</h2>
            <form action={setEngagementModulesAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="keys" value={ENGAGEMENT_MODULES.join(",")} />
              {ENGAGEMENT_MODULES.map((m) => (
                <label className="inc-inline" key={m} style={{ fontSize: "var(--gh-text-sm)" }}>
                  <input type="checkbox" name={`m_${m}`} defaultChecked={modules[m] ?? false} /> {ENGAGEMENT_MODULE_LABELS[m]}
                </label>
              ))}
              <SubmitButton className="gh-btn-secondary" pendingLabel="…">Save modules</SubmitButton>
            </form>
          </section>

          <section className="inc-panel">
            <h2 className="inc-cell-title">Details</h2>
            <form action={updateEngagementAction} className="inc-form">
              <input type="hidden" name="_back" value={back} />
              <input type="hidden" name="id" value={id} />
              <label className="inc-field inc-field--wide">
                Name
                <input className="gh-input" name="name" defaultValue={e.name} />
              </label>
              <label className="inc-field">
                Signed monthly price
                <input className="gh-input" name="monthlyPrice" defaultValue={e.monthlyPrice} />
              </label>
              <label className="inc-field">
                Setup fee
                <input className="gh-input" name="setupPrice" defaultValue={e.setupPrice ?? ""} />
              </label>
              <label className="inc-field">
                Slot weight
                <input className="gh-input" name="slotWeight" defaultValue={e.slotWeight} />
              </label>
              <label className="inc-field">
                Business size
                <select className="gh-input" name="businessSize" defaultValue={e.businessSize ?? ""}>
                  <option value="">Not set</option>
                  {BUSINESS_SIZES.map((z) => (
                    <option key={z} value={z}>
                      {BUSINESS_SIZE_LABELS[z]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inc-field">
                Health
                <select className="gh-input" name="health" defaultValue={e.health}>
                  {ENGAGEMENT_HEALTH.map((h) => (
                    <option key={h} value={h}>
                      {ENGAGEMENT_HEALTH_LABELS[h]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inc-field">
                Status
                <select className="gh-input" name="status" defaultValue={e.status === "paused" ? "paused" : "active"}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
              <label className="inc-field">
                Start
                <input className="gh-input" type="date" name="startDate" defaultValue={e.startDate ?? ""} />
              </label>
              <label className="inc-field">
                Min term ends
                <input className="gh-input" type="date" name="minTermEnd" defaultValue={e.minTermEnd ?? ""} />
              </label>
              <label className="inc-field inc-field--wide">
                Notes / first-90-days plan
                <textarea className="gh-input" name="notes" defaultValue={e.notes ?? ""} />
              </label>
              <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
            </form>
          </section>

          <section className="inc-panel">
            {e.status === "ended" ? (
              <>
                <h2 className="inc-cell-title">Ended</h2>
                <p className="inc-small">
                  {shortDate(e.endedAt, true)} · {e.endReason}
                </p>
                {e.lessons && <p className="inc-muted">Lessons: {e.lessons}</p>}
                <form action={reopenEngagementAction}>
                  <input type="hidden" name="_back" value={back} />
                  <input type="hidden" name="id" value={id} />
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">Reopen</SubmitButton>
                </form>
              </>
            ) : (
              <details className="inc-disclosure">
                <summary>End engagement</summary>
                <form action={endEngagementAction} className="inc-form">
                  <input type="hidden" name="_back" value={back} />
                  <input type="hidden" name="id" value={id} />
                  <label className="inc-field">
                    Ended
                    <input className="gh-input" type="date" name="endedAt" defaultValue={todayNz()} />
                  </label>
                  <label className="inc-field inc-field--wide">
                    Why
                    <input className="gh-input" name="endReason" required />
                  </label>
                  <label className="inc-field inc-field--wide">
                    Lessons
                    <textarea className="gh-input" name="lessons" />
                  </label>
                  <SubmitButton className="gh-btn-secondary" pendingLabel="…">End and archive</SubmitButton>
                </form>
              </details>
            )}
          </section>
        </div>
      </div>
      <IncrementumReadySignal />
    </>
  );
}
