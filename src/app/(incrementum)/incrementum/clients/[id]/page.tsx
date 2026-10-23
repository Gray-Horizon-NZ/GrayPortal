import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Users, Timer, NotebookPen, ToggleLeft, FileText, CircleSlash, Star, Link2, RotateCcw } from "lucide-react";
import { getEngagementDetail } from "@/lib/dal/incrementum/engagements";
import { getGrayPortalLink } from "@/lib/dal/incrementum/grayportal";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { BUSINESS_SIZES, BUSINESS_SIZE_LABELS, ENGAGEMENT_HEALTH, ENGAGEMENT_HEALTH_LABELS, ENGAGEMENT_MODULES, ENGAGEMENT_MODULE_LABELS, BENCH_STAGES, type BusinessSize } from "@/lib/incrementum/registry";
import { REVIEW_DRAFTS } from "@/lib/incrementum/drafts";
import { money } from "@/lib/incrementum/format";
import { monthsBetween } from "@/lib/incrementum/evaluate";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { Badge, Priv, Field, Back, Avatar, Toggle, Console, Csec, IdCard, Monogram, Blocks, TermStatus, LevelBars, TotalSplit, BigAction, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog, AutoSubmitForm } from "@/components/incrementum/terminal/client";
import ServicesTeam from "@/components/incrementum/terminal/services-team";
import EmailForm from "@/components/incrementum/terminal/email-form";
import { CycleRow, WORK_STEPS } from "@/components/incrementum/terminal/cycle-row";
import { longDate, fmtDate, monthName, daysBetween, addDays, tintFor, n0, healthTone, reviewOpen, PASS_LINE } from "@/components/incrementum/terminal/helpers";
import {
  updateEngagementAction,
  setEngagementModulesAction,
  endEngagementAction,
  reopenEngagementAction,
  addEngagementContractorAction,
  removeEngagementContractorAction,
  openCycleAction,
  stampCycleAction,
  logHoursAction,
  deleteHoursAction,
  addActivityAction,
  sendReviewRequestAction,
  syncClientServicesAction,
} from "../../actions";

const VIEWS = ["cycle", "quote", "team", "notes", "grayportal", "modules", "details"] as const;
type View = (typeof VIEWS)[number];

export default async function ClientProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [d, s, gp] = await Promise.all([getEngagementDetail(id), getIncrementumSnapshot(), getGrayPortalLink(id)]);
  if (!d) notFound();
  const e = d.engagement;
  const st = s.state;
  const base = `/incrementum/clients/${id}`;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "cycle";
  const back = view === "cycle" ? base : `${base}?view=${view}`;
  const viewHref = (v: View) => (v === "cycle" ? base : `${base}?view=${v}`);
  const name = d.clientName ?? e.name;
  const price = n0(e.monthlyPrice);
  const cost = d.team.reduce((a, t) => a + n0(t.link.monthlyCost), 0);
  const profit = price - cost;
  const thisMonth = st.today.slice(0, 7);
  const hoursThisMonth = d.hours.filter((h) => h.workDate.slice(0, 7) === thisMonth).reduce((a, h) => a + n0(h.hours), 0);
  const cycles = d.cycles;
  const latest = [...cycles].sort((a, b) => b.month.localeCompare(a.month))[0];
  const latestSteps = latest ? WORK_STEPS.filter(([k]) => latest[k]).length : 0;
  const lead = e.leadId ? st.leads.find((l) => l.id === e.leadId) : null;
  const bench = st.profiles.filter((p) => BENCH_STAGES.includes(p.stage as never));
  const notes = d.activities;
  const ended = e.status === "ended";
  const start = e.startDate ?? st.today;
  const termEnd = e.minTermEnd ?? start;
  const noTerm = termEnd <= start;
  const term = noTerm ? 1 : Math.min(1, daysBetween(start, st.today) / Math.max(1, daysBetween(start, termEnd)));
  const canReview = reviewOpen(e, st.today);
  const contact = gp?.contacts[0] ?? null;
  const contactName = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") : (lead?.contactName ?? null);
  const contactEmail = contact?.email ?? lead?.email ?? gp?.logins[0]?.email ?? null;
  const health = ENGAGEMENT_HEALTH_LABELS[e.health as keyof typeof ENGAGEMENT_HEALTH_LABELS] ?? e.health;

  // The one next step, as the bunker's priced bar.
  let action: React.ComponentProps<typeof BigAction> | null = null;
  if (!ended) {
    const asc = [...cycles].sort((a, b) => a.month.localeCompare(b.month));
    for (const c of asc) {
      const step = WORK_STEPS.find(([k]) => !c[k]);
      if (step) {
        action = {
          label: `Mark ${monthName(c.month, true)} ${step[1]}`,
          sub: step[0] === "invoicedAt" ? "Billed in advance · record the Xero invoice number in the month" : "Stamps today on the month",
          value: step[0] === "invoicedAt" ? <Priv>{money(c.invoiceAmount)}</Priv> : "✓",
          action: stampCycleAction,
          hidden: { _back: back, id: c.id, field: step[0], date: st.today },
        };
        break;
      }
    }
    if (!action && canReview && !e.reviewRequestedAt) {
      action = { label: "Send review email", sub: "Minimum term served · asks for a Google review", value: <Star size={24} />, dialog: "client-review" };
    }
    if (!action) {
      const last = asc[asc.length - 1];
      const month = last ? addDays(last.month, 32).slice(0, 7) : thisMonth;
      action = { label: `Open ${monthName(`${month}-01`, true)}`, sub: "Starts the next month's work and invoice", value: "+", action: openCycleAction, hidden: { _back: back, engagementId: id, month } };
    }
  }

  return (
    <div className="screen">
      <Back href={ended ? "/incrementum/archive" : "/incrementum/clients"} label={ended ? "Archive" : "Clients"} />
      <Console
        side={
          <>
            <IdCard
              tint={tintFor(e.id)}
              art={<Monogram text={name.trim()[0]?.toUpperCase() ?? "?"} big />}
              strip={name}
              rows={[
                ["Package", d.packageName ? d.packageName.split(" · ")[0] : "Custom"],
                ["Started", longDate(e.startDate)],
                ["Min term", noTerm ? "None" : `to ${longDate(termEnd)}`],
                ["Size", e.businessSize ? BUSINESS_SIZE_LABELS[e.businessSize as BusinessSize] : "Not set"],
              ]}
            />
            <Blocks
              value={view}
              items={[
                { key: "cycle", label: "Monthly work", icon: CalendarRange, count: cycles.length || undefined, href: viewHref("cycle") },
                { key: "quote", label: "Services & team", icon: Users, href: viewHref("quote") },
                { key: "team", label: "Team & hours", icon: Timer, href: viewHref("team") },
                { key: "notes", label: "Notes", icon: NotebookPen, count: notes.length || undefined, href: viewHref("notes") },
                { key: "grayportal", label: "In GrayPortal", icon: Link2, href: viewHref("grayportal") },
                { key: "modules", label: "Modules", icon: ToggleLeft, href: viewHref("modules") },
                { key: "details", label: "Details", icon: FileText, href: viewHref("details") },
                { label: e.reviewRequestedAt ? "Review requested" : "Send review email", icon: Star, disabled: !canReview || ended, dialog: "client-review" },
                ended ? null : { label: "End client", icon: CircleSlash, tone: "danger", dialog: "client-end" },
              ]}
            />
            {ended && (
              <form action={reopenEngagementAction} className="blocks">
                <BackTo path={back} />
                <HiddenFields values={{ id }} />
                <button type="submit" className="block">
                  <RotateCcw size={15} strokeWidth={1.75} />
                  <span>Reopen</span>
                </button>
              </form>
            )}
            {!canReview && !ended && <p className="muted small">Review email unlocks {longDate(termEnd)}, when the minimum term is served.</p>}
          </>
        }
      >
        <Csec>
          <TermStatus
            label="Client status"
            value={ended ? "Ended" : e.status === "paused" ? "Paused" : health}
            tone={ended ? "bad" : e.status === "paused" ? "warn" : healthTone(e.health) === "good" ? undefined : healthTone(e.health)}
          >
            {monthsBetween(start, e.endedAt ?? st.today).toFixed(1)} months
            {e.reviewRequestedAt ? ` · review asked ${fmtDate(e.reviewRequestedAt)}` : ""}
            {ended ? ` · ended ${longDate(e.endedAt)}: ${e.endReason ?? ""}` : ""}
          </TermStatus>
        </Csec>
        <Csec>
          <LevelBars
            rows={[
              { label: "Margin", value: price ? profit / price : 0, right: `${price ? Math.round((profit / price) * 100) : 0}%`, tone: profit >= PASS_LINE ? "good" : "warn" },
              {
                label: latest ? `${monthName(latest.month, true)} work` : "This month's work",
                value: latestSteps / 4,
                right: latest ? `${latestSteps}/4 · delivered, approved, report, invoiced` : "Not opened",
              },
              { label: "Minimum term", value: term, right: noTerm ? "None" : term >= 1 ? "Served · review unlocked" : `${Math.round(term * 100)}% · to ${fmtDate(termEnd)}`, tone: term >= 1 ? "good" : "neutral" },
              { label: "Your hours this month", value: hoursThisMonth / 6, marks: [0.5], right: `${hoursThisMonth.toFixed(1)} h / 3 h pass`, tone: hoursThisMonth > 3 ? "bad" : "good" },
            ]}
          />
        </Csec>
        <TotalSplit
          items={[
            { label: "Signed price", value: `${money(price)}/mo`, priv: true },
            { label: "Contractor cost", value: `${money(cost)}/mo`, priv: true },
            { label: "Profit", value: `${money(profit)}/mo`, priv: true, tone: profit < 400 ? "bad" : profit >= PASS_LINE ? "good" : undefined },
          ]}
        />
        <Csec className="inset">
          {view === "cycle" && (
            <>
              <p className="muted small" style={{ marginBottom: 12 }}>
                Each month: delivered → approved → report sent → invoiced (in advance). &quot;Settled&quot; is an optional tick once you&apos;ve paid the contractor; nothing depends on it, because payments aren&apos;t tracked here.
              </p>
              {cycles.length === 0 ? (
                <p className="muted small">No months opened yet.</p>
              ) : (
                <div className="rowlist bordered">
                  {cycles.map((c) => (
                    <CycleRow key={c.id} c={c} back={back} today={st.today} />
                  ))}
                </div>
              )}
              {!ended && (
                <form className="row" action={openCycleAction} style={{ marginTop: 12 }}>
                  <BackTo path={back} />
                  <HiddenFields values={{ engagementId: id }} />
                  <input className="input" type="month" name="month" defaultValue={thisMonth} aria-label="Month" style={{ width: 170 }} />
                  <SubmitButton className="btn" pendingLabel="…">
                    Open month
                  </SubmitButton>
                </form>
              )}
            </>
          )}
          {view === "quote" && <ServicesTeam s={s} engagementId={id} back={back} readOnly={ended} />}
          {view === "team" && (
            <div className="grid g-2">
              <div>
                <p className="csec-title" style={{ marginBottom: 8 }}>
                  Contractor team
                </p>
                <dl className="ledger">
                  {d.team.map((t) => (
                    <div key={t.link.id}>
                      <dt className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                        <Avatar name={t.contractorName} size={26} active={t.link.role === "main"} />
                        <Link className="linkbtn" href={`/incrementum/contractors/${t.link.contractorId}`}>
                          {t.contractorName}
                        </Link>
                        <small className="muted">{t.serviceName ?? ""}</small>
                      </dt>
                      <dd className="row" style={{ gap: 8, flexWrap: "nowrap", justifyContent: "flex-end" }}>
                        <Badge tone={t.link.role === "main" ? "accent" : undefined}>{t.link.role}</Badge>
                        <span>
                          <Priv>{money(t.link.monthlyCost)}</Priv>/mo
                        </span>
                        {!ended && (
                          <form action={removeEngagementContractorAction} style={{ display: "contents" }}>
                            <BackTo path={back} />
                            <HiddenFields values={{ id: t.link.id }} />
                            <button type="submit" className="linkbtn muted" aria-label={`Remove ${t.contractorName}`}>
                              ×
                            </button>
                          </form>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {d.team.length === 0 && <p className="muted small">Assign contractors in Services &amp; team. 27ADS: a backup per service.</p>}
                {!ended && (
                  <details className="inline-details">
                    <summary>Add a contractor (e.g. a backup)</summary>
                    <form className="form-grid" action={addEngagementContractorAction}>
                      <BackTo path={back} />
                      <HiddenFields values={{ engagementId: id }} />
                      <Field label="Contractor">
                        <select className="select" name="contractorId" required>
                          {bench.map((c) => (
                            <option key={c.contractorId} value={c.contractorId}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Service">
                        <select className="select" name="serviceId" defaultValue="">
                          <option value="">—</option>
                          {s.services
                            .filter((x) => x.billing === "monthly" && x.status === "active")
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Field label="Role">
                        <select className="select" name="role" defaultValue="backup">
                          <option value="main">Main</option>
                          <option value="backup">Backup</option>
                        </select>
                      </Field>
                      <Field label="Monthly cost ($)">
                        <input className="input" name="monthlyCost" defaultValue="0" inputMode="decimal" />
                      </Field>
                      <div className="form-actions">
                        <SubmitButton className="btn" pendingLabel="…">
                          Assign
                        </SubmitButton>
                      </div>
                    </form>
                  </details>
                )}
              </div>
              <div>
                <p className="csec-title" style={{ marginBottom: 8 }}>
                  Your hours
                </p>
                <p className="muted small" style={{ marginBottom: 10 }}>
                  The proof the model works without you doing the delivery (pass line ≤ 3 h per client per month).
                </p>
                {!ended && (
                  <form className="row" action={logHoursAction}>
                    <BackTo path={back} />
                    <HiddenFields values={{ engagementId: id }} />
                    <input className="input" type="date" name="workDate" defaultValue={st.today} style={{ width: 150 }} aria-label="Date" />
                    <input className="input" name="hours" placeholder="Hours" required style={{ width: 70 }} inputMode="decimal" />
                    <input className="input" name="note" placeholder="What for" style={{ flex: 1, width: "auto" }} />
                    <SubmitButton className="btn" pendingLabel="…">
                      Log
                    </SubmitButton>
                  </form>
                )}
                <dl className="ledger">
                  {d.hours.slice(0, 10).map((h) => (
                    <div key={h.id}>
                      <dt>
                        {fmtDate(h.workDate)}
                        {h.note ? <span className="muted"> · {h.note}</span> : null}
                      </dt>
                      <dd className="row" style={{ gap: 8, flexWrap: "nowrap", justifyContent: "flex-end" }}>
                        {n0(h.hours).toFixed(1)} h
                        <form action={deleteHoursAction} style={{ display: "contents" }}>
                          <BackTo path={back} />
                          <HiddenFields values={{ id: h.id }} />
                          <button type="submit" className="linkbtn muted" aria-label="Remove hours">
                            ×
                          </button>
                        </form>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
          {view === "notes" && (
            <>
              <form className="row" action={addActivityAction}>
                <BackTo path={back} />
                <HiddenFields values={{ entityType: "engagement", entityId: id, type: "note" }} />
                <input className="input" name="body" placeholder="Add a note (90-day plan check-in, issue, win…)" required style={{ flex: 1, width: "auto" }} />
                <SubmitButton className="btn" pendingLabel="…">
                  Add
                </SubmitButton>
              </form>
              <div className="timeline" style={{ marginTop: 8 }}>
                {notes.map((a) => (
                  <div key={a.id}>
                    <time>
                      {fmtDate(a.occurredAt)} · {a.type}
                    </time>
                    <span>
                      {a.subject && <b className="strong">{a.subject} </b>}
                      {a.body}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {view === "grayportal" && (
            <div className="grid g-2">
              <div>
                <p className="csec-title" style={{ marginBottom: 8 }}>
                  Linked GrayPortal records
                </p>
                {gp ? (
                  <Ledger
                    rows={[
                      [
                        "Client record",
                        <Link key="c" className="linkbtn" href={`/clients/${gp.clientId}`}>
                          {gp.clientName} ↗
                        </Link>,
                      ],
                      ["Company", gp.companyName ?? "—"],
                      ...gp.contacts.map(
                        (c, i) =>
                          [
                            i === 0 ? "Contact" : `Contact ${i + 1}`,
                            <Priv key={c.id}>{`${[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"} · ${c.email ?? "no email"}`}</Priv>,
                          ] as [string, React.ReactNode]
                      ),
                      ["Client portal", gp.logins.length ? gp.logins.map((l) => `${l.email}${l.active ? "" : " (invite not accepted)"}`).join(", ") : "No login yet"],
                      ["Services on the client profile", `${gp.services.length} line${gp.services.length === 1 ? "" : "s"}`],
                      ["Lead history", lead ? "Copied to the client timeline" : "Added directly (no lead)"],
                    ]}
                  />
                ) : (
                  <p className="muted small">The GrayPortal client record couldn&apos;t be found.</p>
                )}
                {gp && gp.services.length > 0 && (
                  <details className="inline-details">
                    <summary>Services written to GrayPortal</summary>
                    <dl className="ledger">
                      {gp.services.map((x) => (
                        <div key={x.id}>
                          <dt>{x.name ?? x.notes ?? "Line"}</dt>
                          <dd>
                            <Priv>{x.monthly ? `${money(x.monthly)}/mo` : money(x.setup)}</Priv>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                {!ended && (
                  <form action={syncClientServicesAction} style={{ marginTop: 12 }}>
                    <BackTo path={back} />
                    <HiddenFields values={{ id }} />
                    <SubmitButton className="btn" pendingLabel="Syncing…">
                      Sync services to GrayPortal
                    </SubmitButton>
                    <p className="muted small" style={{ marginTop: 6 }}>
                      Happens on its own whenever a line or the client&apos;s status changes; this re-runs it. Only Incrementum&apos;s own rows are touched, and a service not linked to a GrayPortal service (Services &amp; Pricing) is skipped.
                    </p>
                  </form>
                )}
              </div>
              <div>
                <p className="csec-title" style={{ marginBottom: 8 }}>
                  How it&apos;s split
                </p>
                <ul className="howto">
                  <li>
                    <b>GrayPortal</b> holds the client: company, contacts, portal, tasks, documents, emails, finance.
                  </li>
                  <li>
                    <b>Incrementum</b> holds the delivery: services &amp; team, contractor costs, the monthly work steps and your hours.
                  </li>
                  <li>Both sides link to each other, so nothing has to be entered twice.</li>
                </ul>
              </div>
            </div>
          )}
          {view === "modules" && (
            <AutoSubmitForm action={setEngagementModulesAction} style={{ maxWidth: 520 }}>
              <BackTo path={back} />
              <HiddenFields values={{ id, keys: ENGAGEMENT_MODULES.join(",") }} />
              {ENGAGEMENT_MODULES.map((k) => (
                <Toggle key={k} name={`m_${k}`} label={ENGAGEMENT_MODULE_LABELS[k]} defaultChecked={!!e.modules?.[k]} />
              ))}
            </AutoSubmitForm>
          )}
          {view === "details" && (
            <form className="form-grid g3" action={updateEngagementAction}>
              <BackTo path={back} />
              <HiddenFields values={{ id }} />
              <Field label="Name" wide>
                <input className="input" name="name" defaultValue={e.name} required />
              </Field>
              <Field label="Signed monthly price">
                <input className="input" name="monthlyPrice" defaultValue={e.monthlyPrice} inputMode="decimal" />
              </Field>
              <Field label="Setup fee">
                <input className="input" name="setupPrice" defaultValue={e.setupPrice ?? ""} inputMode="decimal" />
              </Field>
              <Field label="Slot weight (Capacity)">
                <input className="input" name="slotWeight" defaultValue={e.slotWeight} inputMode="decimal" />
              </Field>
              <Field label="Business size">
                <select className="select" name="businessSize" defaultValue={e.businessSize ?? ""}>
                  <option value="">Not set</option>
                  {BUSINESS_SIZES.map((z) => (
                    <option key={z} value={z}>
                      {BUSINESS_SIZE_LABELS[z]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Health">
                <select className="select" name="health" defaultValue={e.health}>
                  {ENGAGEMENT_HEALTH.map((k) => (
                    <option key={k} value={k}>
                      {ENGAGEMENT_HEALTH_LABELS[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select className="select" name="status" defaultValue={e.status === "paused" ? "paused" : "active"} disabled={ended}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </Field>
              <Field label="Start">
                <input className="input" type="date" name="startDate" defaultValue={e.startDate ?? ""} />
              </Field>
              <Field label="Minimum term ends (same as start = none)">
                <input className="input" type="date" name="minTermEnd" defaultValue={e.minTermEnd ?? ""} />
              </Field>
              <Field label="Notes / first-90-days plan" wide>
                <textarea className="textarea" name="notes" defaultValue={e.notes ?? ""} />
              </Field>
              <div className="form-actions">
                <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                  Save
                </SubmitButton>
              </div>
            </form>
          )}
        </Csec>
        {action && <BigAction {...action} />}
        {ended && e.lessons && (
          <Csec>
            <p className="note">
              <span>
                <b>Lessons:</b> {e.lessons}
              </span>
            </p>
          </Csec>
        )}
      </Console>

      {canReview && !ended && (
        <Dialog id="client-review" title={`Ask ${name} for a Google review`} wide>
          <p className="muted small">
            {e.reviewRequestedAt ? `Already asked on ${longDate(e.reviewRequestedAt)}. Sending again records a second request.` : "Unlocks once the minimum term is served. The email design comes later; this is a placeholder template."} Sent from Gmail and logged in Notes.
          </p>
          <EmailForm action={sendReviewRequestAction} hidden={{ _back: back, id }} drafts={REVIEW_DRAFTS} name={contactName} business={name} to={contactEmail} toEditable sendLabel="Send review email" />
        </Dialog>
      )}

      {!ended && (
        <Dialog id="client-end" title={`End ${name}`}>
          <form className="form-grid" action={endEngagementAction}>
            <BackTo path={back} />
            <HiddenFields values={{ id }} />
            <Field label="Ended">
              <input className="input" type="date" name="endedAt" defaultValue={st.today} />
            </Field>
            <Field label="Why">
              <input className="input" name="endReason" required />
            </Field>
            <Field label="Lessons (the next client benefits)" wide>
              <textarea className="textarea" name="lessons" />
            </Field>
            <div className="form-actions">
              <SubmitButton className="btn btn-danger" pendingLabel="…">
                End and archive
              </SubmitButton>
            </div>
          </form>
        </Dialog>
      )}
      <IncrementumReadySignal />
    </div>
  );
}
