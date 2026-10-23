import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare, Users, Mail, History, PenLine, Reply, XCircle } from "lucide-react";
import { getLeadDetail } from "@/lib/dal/incrementum/leads";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { computeNeed, quoteTotals } from "@/lib/incrementum/compute";
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_SOURCES, LEAD_SOURCE_LABELS, BUSINESS_SIZES, BUSINESS_SIZE_LABELS, type LeadStage, type BusinessSize } from "@/lib/incrementum/registry";
import { LEAD_DRAFTS } from "@/lib/incrementum/drafts";
import { formatMetric, money, minutesSince } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { Priv, Field, Stepper, Back, GrayPortalChecklist, Console, Csec, IdCard, Monogram, Blocks, TermStatus, LevelBars, BigAction, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog } from "@/components/incrementum/terminal/client";
import ServicesTeam from "@/components/incrementum/terminal/services-team";
import { Outreach, Timeline } from "@/components/incrementum/terminal/outreach";
import { longDate, tintFor, PASS_LINE } from "@/components/incrementum/terminal/helpers";
import { setLeadStageAction, updateLeadAction, markLeadRespondedAction, onboardLeadAction, deleteLeadAction } from "../../actions";

const VIEWS = ["quote", "outreach", "timeline", "details"] as const;
type View = (typeof VIEWS)[number];

export default async function LeadProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string; onboard?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [d, s] = await Promise.all([getLeadDetail(id), getIncrementumSnapshot()]);
  if (!d) notFound();
  const l = d.lead;
  const base = `/incrementum/leads/${id}`;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "quote";
  const back = view === "quote" ? base : `${base}?view=${view}`;
  const st = s.state;
  const target = st.settings.responseTargetMinutes ?? 60;
  const waitingMins = l.firstResponseAt ? null : minutesSince(l.receivedAt);
  const replyMins = l.firstResponseAt ? (new Date(l.firstResponseAt).getTime() - new Date(l.receivedAt).getTime()) / 60_000 : null;
  const clockMins = waitingMins ?? replyMins ?? 0;
  const lines = st.needs.filter((n) => n.leadId === id && !n.engagementId);
  const views = lines.map((n) => computeNeed(st, s.services, n));
  const quote = quoteTotals(views);
  // The package their lines were copied from, else the one they asked about; never a guess.
  const pkgId = lines.find((n) => n.packageId)?.packageId ?? l.packageId;
  const pkg = s.packages.find((p) => p.id === pkgId);
  const engagement = st.engagements.find((e) => e.leadId === l.id) ?? null;
  const assigned = views.filter((v) => !v.roleId || v.contractorId).length;
  const price = quote.monthlyPrice || pkg?.totals.monthlyPrice || 0;
  const stage = l.stage as LeadStage;
  const sourceLabel = LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS] ?? l.source;
  const viewHref = (v: View) => (v === "quote" ? base : `${base}?view=${v}`);

  return (
    <div className="screen">
      <Back href="/incrementum/leads" label="Leads" />
      <Console
        side={
          <>
            <IdCard
              tint={tintFor(l.id)}
              art={<Monogram text={l.businessName.trim()[0]?.toUpperCase() ?? "?"} big />}
              strip={l.businessName}
              rows={[
                ["Contact", l.contactName || "—", true],
                ["Source", sourceLabel],
                ["Size", l.businessSize ? BUSINESS_SIZE_LABELS[l.businessSize as BusinessSize] : "Not set"],
                ["Arrived", longDate(l.receivedAt)],
              ]}
            />
            <Blocks
              value={view}
              items={[
                { key: "quote", label: "Services & team", icon: Users, count: quote.unassigned || undefined, href: viewHref("quote") },
                { key: "outreach", label: "Reach out", icon: Mail, href: viewHref("outreach") },
                { key: "timeline", label: "Timeline", icon: History, href: viewHref("timeline") },
                { key: "details", label: "Details", icon: PenLine, href: viewHref("details") },
                !["won", "lost"].includes(stage) && { label: "Mark lost", icon: XCircle, tone: "danger", dialog: "lead-lost" },
              ]}
            />
            {!l.firstResponseAt && (
              <form action={markLeadRespondedAction} className="blocks">
                <BackTo path={back} />
                <HiddenFields values={{ id }} />
                <button type="submit" className="block">
                  <Reply size={15} strokeWidth={1.75} />
                  <span>I&apos;ve replied</span>
                </button>
              </form>
            )}
          </>
        }
      >
        <Csec>
          <TermStatus label="Lead status" value={LEAD_STAGE_LABELS[stage] ?? l.stage} tone={stage === "lost" ? "bad" : stage === "won" ? undefined : "warn"}>
            {waitingMins !== null && stage !== "lost" ? `Waiting ${formatMetric(waitingMins, "minutes")}` : replyMins !== null ? `Replied in ${formatMetric(replyMins, "minutes")}` : ""}
          </TermStatus>
        </Csec>
        <Csec className="tight">
          <Stepper
            steps={LEAD_STAGES.map((x) => ({ key: x, label: LEAD_STAGE_LABELS[x], off: stage === "lost" }))}
            current={stage}
            disabled={["won", "lost"]}
            action={setLeadStageAction}
            hidden={{ _back: back, id }}
          />
          <p className="muted small" style={{ marginTop: 8 }}>
            &quot;Won&quot; is set by Onboard client. Any move past New stops the response clock.{l.lostReason && ` Lost because: ${l.lostReason}`}
          </p>
        </Csec>
        <Csec>
          <LevelBars
            rows={[
              {
                label: waitingMins !== null ? "Reply clock" : "First reply",
                value: Math.min(1, clockMins / (target * 2)),
                marks: [0.5],
                tone: clockMins > target ? "bad" : "good",
                right: `${formatMetric(clockMins, "minutes")} / ${target} min target`,
              },
              {
                label: "Quote profit",
                value: quote.monthlyProfit / (PASS_LINE * 1.5),
                marks: [1 / 1.5],
                tone: quote.monthlyPrice ? (quote.monthlyProfit >= PASS_LINE ? "good" : "bad") : "neutral",
                right: <Priv>{`${money(quote.monthlyProfit)} / ${money(PASS_LINE)} pass`}</Priv>,
              },
              { label: "Contractors assigned", value: views.length ? assigned / views.length : 0, right: `${assigned}/${views.length} lines` },
            ]}
          />
        </Csec>
        {l.message && view === "quote" && (
          <Csec className="tight">
            <p className="brief-title">
              <MessageSquare size={13} /> Their message
            </p>
            <p className="brief-text">
              <Priv>{l.message}</Priv>
            </p>
          </Csec>
        )}
        <Csec className="inset">
          {view === "quote" && (engagement || l.convertedClientId ? <p className="muted">Onboarded: the lines moved to the client.</p> : <ServicesTeam s={s} leadId={id} back={back} />)}
          {view === "outreach" && (
            <Outreach
              entityType="lead"
              entityId={id}
              back={back}
              drafts={LEAD_DRAFTS}
              name={l.contactName}
              business={l.businessName}
              email={l.email}
              meetingTitle={`Discovery call · ${l.businessName} × Gray Horizon`}
              today={st.today}
            />
          )}
          {view === "timeline" && <Timeline activities={d.activities} stageEvents={d.stageEvents} labels={LEAD_STAGE_LABELS} />}
          {view === "details" && <LeadDetails l={l} s={s} back={back} />}
        </Csec>
        {engagement ? (
          <BigAction label="Open the client" sub="This lead is now a client" value="→" href={`/incrementum/clients/${engagement.id}`} />
        ) : l.convertedClientId ? (
          <BigAction label="Open the client record" sub="This lead is now a GrayPortal client" value="→" href={`/clients/${l.convertedClientId}`} />
        ) : (
          <BigAction
            label="Onboard client"
            sub="Creates the client in GrayPortal and Incrementum, and starts the work at this price"
            value={<Priv>{`${money(price)}/mo`}</Priv>}
            disabled={stage === "lost"}
            dialog="lead-onboard"
          />
        )}
      </Console>

      {!engagement && !l.convertedClientId && stage !== "lost" && (
        <Dialog id="lead-onboard" title={`Onboard ${l.businessName}`} wide openOnLoad={sp.onboard === "1"}>
          <form className="form-grid g3" action={onboardLeadAction}>
            <BackTo path={base} />
            <HiddenFields values={{ id }} />
            <p className="muted small" style={{ gridColumn: "1 / -1" }}>
              Any term, including month to month. The price is locked from here on; Services &amp; Pricing changes never move it.
            </p>
            <Field label="Portal login email">
              <input className="input" type="email" name="portalEmail" defaultValue={l.email ?? ""} required />
            </Field>
            <Field label="Display name">
              <input className="input" name="displayName" defaultValue={l.contactName ?? ""} />
            </Field>
            <Field label="Package">
              <select className="select" name="packageId" defaultValue={pkg?.id ?? ""}>
                <option value="">None</option>
                {s.packages
                  .filter((p) => p.status !== "retired")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.totals.monthlyPrice)}/mo
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Start date">
              <input className="input" type="date" name="startDate" defaultValue={st.today} required />
            </Field>
            <Field label="Signed monthly (blank = quote)">
              <input className="input" name="monthlyPrice" placeholder={quote.monthlyPrice ? String(quote.monthlyPrice) : ""} inputMode="decimal" />
            </Field>
            <Field label="Signed setup (blank = quote)">
              <input className="input" name="setupPrice" placeholder={quote.oneOffPrice ? String(quote.oneOffPrice) : ""} inputMode="decimal" />
            </Field>
            <Field label="Minimum term">
              <select className="select" name="minTermMonths" defaultValue={String(pkg?.minTermMonths ?? 3)}>
                <option value="0">None (month to month)</option>
                {[1, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} month{m === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <GrayPortalChecklist />
            </div>
            <div className="form-actions">
              <SubmitButton className="btn btn-primary" pendingLabel="Onboarding…">
                Onboard into GrayPortal + Incrementum
              </SubmitButton>
            </div>
          </form>
        </Dialog>
      )}

      {!["won", "lost"].includes(stage) && (
        <Dialog id="lead-lost" title={`Mark ${l.businessName} as lost`}>
          <form className="form-grid" action={setLeadStageAction}>
            <BackTo path={back} />
            <HiddenFields values={{ id, stage: "lost" }} />
            <Field label="Why lost?" wide>
              <input className="input" name="note" required placeholder="e.g. Budget under $300/mo" />
            </Field>
            <div className="form-actions">
              <SubmitButton className="btn btn-danger" pendingLabel="…">
                Mark lost
              </SubmitButton>
            </div>
          </form>
        </Dialog>
      )}
      <IncrementumReadySignal />
    </div>
  );
}

function LeadDetails({ l, s, back }: { l: NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>["lead"]; s: Awaited<ReturnType<typeof getIncrementumSnapshot>>; back: string }) {
  return (
    <>
      <form className="form-grid g3" action={updateLeadAction}>
        <BackTo path={back} />
        <HiddenFields values={{ id: l.id, message: l.message ?? "" }} />
        {(l.gclid || l.utm) && (
          <p className="muted small" style={{ gridColumn: "1 / -1" }}>
            Tracking: {l.gclid ? `gclid ${l.gclid.slice(0, 12)}…` : ""} {l.utm ? Object.entries(l.utm).map(([k, v]) => `${k}=${v}`).join(" · ") : ""}
          </p>
        )}
        {(
          [
            ["businessName", "Business", l.businessName],
            ["contactName", "Contact", l.contactName],
            ["email", "Email", l.email],
            ["phone", "Phone", l.phone],
            ["website", "Website", l.website],
            ["serviceInterest", "Service interest", l.serviceInterest],
            ["adBudget", "Ad budget", l.adBudget],
          ] as const
        ).map(([k, label, v]) => (
          <Field key={k} label={label}>
            <input className="input" name={k} type={k === "email" ? "email" : undefined} defaultValue={v ?? ""} required={k === "businessName"} />
          </Field>
        ))}
        <Field label="Source">
          <select className="select" name="source" defaultValue={l.source}>
            {LEAD_SOURCES.map((x) => (
              <option key={x} value={x}>
                {LEAD_SOURCE_LABELS[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Package of interest">
          <select className="select" name="packageId" defaultValue={l.packageId ?? ""}>
            <option value="">—</option>
            {s.packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Business size">
          <select className="select" name="businessSize" defaultValue={l.businessSize ?? ""}>
            <option value="">Not set</option>
            {BUSINESS_SIZES.map((z) => (
              <option key={z} value={z}>
                {BUSINESS_SIZE_LABELS[z]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" wide>
          <textarea className="textarea" name="notes" defaultValue={l.notes ?? ""} />
        </Field>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save
          </SubmitButton>
          {l.convertedClientId && (
            <Link className="btn" href={`/clients/${l.convertedClientId}`}>
              GrayPortal client record ↗
            </Link>
          )}
        </div>
      </form>
      <form action={deleteLeadAction} className="row">
        <BackTo path="/incrementum/leads" />
        <HiddenFields values={{ id: l.id }} />
        <span className="spacer" />
        <button type="submit" className="linkbtn danger">
          Delete lead (spam / duplicate)
        </button>
      </form>
    </>
  );
}
