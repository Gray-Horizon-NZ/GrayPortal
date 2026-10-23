import { notFound } from "next/navigation";
import { Tags, Mail, History, IdCard as IdIcon, Briefcase, PauseCircle, Trash2, Link2 } from "lucide-react";
import { getContractorDetail, listUnlinkedContractorLogins } from "@/lib/dal/incrementum/contractors";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { CONTRACTOR_STAGES, ALL_CONTRACTOR_STAGES, CONTRACTOR_STAGE_LABELS, CONTRACTOR_RATE_TYPES, BENCH_STAGES, BUSINESS_SIZES, BUSINESS_SIZE_LABELS, type ContractorStage } from "@/lib/incrementum/registry";
import { CONTRACTOR_DRAFTS } from "@/lib/incrementum/drafts";
import { money } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { Priv, Field, Stepper, Back, RowFold, AddRow, Console, Csec, IdCard, Monogram, Blocks, TermStatus, LevelBars, TotalSplit, BigAction, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog } from "@/components/incrementum/terminal/client";
import { Outreach, Timeline } from "@/components/incrementum/terminal/outreach";
import { fmtDate, longDate, tintFor, n0 } from "@/components/incrementum/terminal/helpers";
import {
  setContractorStageAction,
  updateContractorProfileAction,
  upsertContractorServiceAction,
  removeContractorServiceAction,
  onboardContractorAction,
  removeContractorAction,
  linkContractorLoginAction,
} from "../../actions";

const VIEWS = ["quotes", "outreach", "timeline", "profile", "clients"] as const;
type View = (typeof VIEWS)[number];

export default async function ContractorProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [d, s, unlinked] = await Promise.all([getContractorDetail(id), getIncrementumSnapshot(), listUnlinkedContractorLogins()]);
  if (!d) notFound();
  const { profile: p, contractor: c } = d;
  const st = s.state;
  const base = `/incrementum/contractors/${id}`;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "quotes";
  const back = view === "quotes" ? base : `${base}?view=${view}`;
  const viewHref = (v: View) => (v === "quotes" ? base : `${base}?view=${v}`);
  const stage = p.stage as ContractorStage;
  const idx = (CONTRACTOR_STAGES as readonly string[]).indexOf(stage);
  const nextStage = idx >= 0 && idx < CONTRACTOR_STAGES.length - 2 ? CONTRACTOR_STAGES[idx + 1] : null;
  const agreements = [p.payWhenPaidAcceptedAt, p.nonSolicitSignedAt].filter(Boolean).length;
  const lockdown = Boolean(st.contractorLockdownApplied);
  const login = d.portalUsers[0] ?? null;
  const canOnboard = stage === "confirmed" && agreements === 2 && lockdown && !login;
  const activeIds = new Set(st.engagements.filter((e) => e.status === "active").map((e) => e.id));
  const activeClients = new Set(st.engagementContractors.filter((ec) => ec.contractorId === id && activeIds.has(ec.engagementId)).map((ec) => ec.engagementId)).size;
  const openLeadIds = new Set(st.leads.filter((l) => !l.convertedClientId && l.stage !== "lost").map((l) => l.id));
  const openQuotes = new Set(st.needs.filter((n) => n.contractorId === id && n.leadId && !n.engagementId && openLeadIds.has(n.leadId)).map((n) => n.leadId)).size;
  const defaultSlots = n0(st.settings.defaultSlotsPerContractor) || 4;
  const slotsTotal = d.services.filter((x) => x.link.rateType === "monthly").reduce((a, x) => a + (n0(x.link.capacitySlots) || defaultSlots), 0);
  const engs = [...new Map(d.engagements.map((e) => [e.link.engagementId, e])).values()];
  const roles = st.roles.filter((r) => !r.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const activeServices = s.services.filter((x) => x.status === "active");

  const action: React.ComponentProps<typeof BigAction> = nextStage
    ? {
        label: `Advance → ${CONTRACTOR_STAGE_LABELS[nextStage]}`,
        sub: `${CONTRACTOR_STAGE_LABELS[stage]} since ${fmtDate(p.stageChangedAt)}`,
        value: `${idx + 1}/6`,
        action: setContractorStageAction,
        hidden: { _back: back, contractorId: id, stage: nextStage },
      }
    : stage === "confirmed"
      ? {
          label: "Onboard to GrayPortal",
          sub: canOnboard ? "Sends their login invite; they join the Gray Horizon Team" : `Needs: ${[agreements < 2 && "both agreements", !lockdown && "contractor lockdown"].filter(Boolean).join(", ")}`,
          value: "6/6",
          disabled: !canOnboard,
          dialog: "contractor-onboard",
        }
      : stage === "onboarded"
        ? { label: "On the Gray Horizon Team", sub: login ? `${login.email} · ${login.googleUid ? "active" : "invited, awaiting first sign-in"}` : "", value: "◆", variant: "ghost", href: viewHref("outreach") }
        : { label: "Bring back into the pipeline", sub: p.offRampReason ?? "", value: "→", variant: "ghost", action: setContractorStageAction, hidden: { _back: back, contractorId: id, stage: "contacted" } };

  return (
    <div className="screen">
      <Back href="/incrementum/contractors" label="Contractor bench" />
      <Console
        side={
          <>
            <IdCard
              tint={tintFor(id)}
              art={
                <Monogram
                  text={c.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                  big
                />
              }
              strip={c.name}
              rows={[
                ["Specialty", c.specialty || "—"],
                ["Location", p.location || "—"],
                ["Found via", p.source || "—"],
                ["GST registered", p.gstRegistered === null ? "Unknown" : p.gstRegistered ? "Yes" : "No"],
              ]}
            />
            <Blocks
              value={view}
              items={[
                { key: "quotes", label: "Quotes & capacity", icon: Tags, count: d.services.length || undefined, href: viewHref("quotes") },
                { key: "outreach", label: "Reach out", icon: Mail, href: viewHref("outreach") },
                { key: "timeline", label: "Timeline", icon: History, href: viewHref("timeline") },
                { key: "profile", label: "Profile & agreements", icon: IdIcon, href: viewHref("profile") },
                engs.length > 0 && { key: "clients", label: "Clients", icon: Briefcase, count: engs.length, href: viewHref("clients") },
                { label: "Pause or not a fit", icon: PauseCircle, tone: "danger", dialog: "contractor-move" },
              ]}
            />
          </>
        }
      >
        <Csec>
          <TermStatus label="Contractor status" value={CONTRACTOR_STAGE_LABELS[stage] ?? stage} tone={stage === "not_a_fit" ? "bad" : stage === "paused" ? "warn" : BENCH_STAGES.includes(stage) ? undefined : "warn"}>
            {stage === "onboarded" ? "◆ Gray Horizon Team" : `since ${longDate(p.stageChangedAt)}`}
          </TermStatus>
        </Csec>
        <Csec className="tight">
          <Stepper steps={CONTRACTOR_STAGES.map((x) => ({ key: x, label: CONTRACTOR_STAGE_LABELS[x] }))} current={stage} disabled={["onboarded"]} action={setContractorStageAction} hidden={{ _back: back, contractorId: id }} />
          {p.offRampReason && (
            <p className="muted small" style={{ marginTop: 8 }}>
              Reason: {p.offRampReason}
            </p>
          )}
        </Csec>
        <Csec>
          <LevelBars
            rows={[
              { label: "Recruiting progress", value: idx >= 0 ? (idx + 1) / 6 : 0, right: idx >= 0 ? `${idx + 1}/6` : (CONTRACTOR_STAGE_LABELS[stage] ?? stage), tone: idx === 5 ? "good" : undefined },
              { label: "Agreements signed", value: agreements / 2, right: `${agreements}/2`, tone: agreements === 2 ? "good" : "warn" },
              { label: "Capacity used", value: slotsTotal ? activeClients / slotsTotal : 0, right: `${activeClients}/${slotsTotal || "—"} client slots`, tone: "neutral" },
              { label: "Quality", value: (p.qualityRating ?? 0) / 5, right: p.qualityRating ? `${p.qualityRating}/5` : "Not rated" },
            ]}
          />
        </Csec>
        <TotalSplit
          items={[
            { label: "Active clients", value: activeClients },
            { label: "Open quotes", value: openQuotes },
            { label: "Services quoted", value: d.services.length },
          ]}
        />
        <Csec className="inset">
          {view === "quotes" && (
            <>
              <p className="muted small" style={{ marginBottom: 10 }}>
                Their quote per service. Bench quotes (Confirmed/Onboarded) drive sell prices in Services &amp; Pricing; capacity drives the Capacity forecast.
              </p>
              <div className="rowlist bordered">
                {d.services.map(({ link, serviceName }) => (
                  <RowFold
                    key={link.id}
                    summary={
                      <>
                        <span className="rowfold-main">
                          <span>
                            <span className="strong" style={{ fontWeight: 500 }}>
                              {serviceName}
                            </span>
                            <small>
                              {link.capacitySlots ?? "?"} client slots{link.notes ? ` · ${link.notes}` : ""}
                            </small>
                          </span>
                        </span>
                        <span className="num strong">
                          <Priv>{`${money(link.rate)}/${link.rateType === "monthly" ? "mo" : link.rateType}`}</Priv>
                        </span>
                      </>
                    }
                  >
                    <QuoteForm id={id} back={back} services={activeServices} x={{ serviceId: link.serviceId, rateType: link.rateType, rate: link.rate, capacitySlots: link.capacitySlots, notes: link.notes }} />
                    <form action={removeContractorServiceAction} className="row">
                      <BackTo path={back} />
                      <HiddenFields values={{ id: link.id }} />
                      <span className="spacer" />
                      <button type="submit" className="linkbtn danger">
                        Remove quote
                      </button>
                    </form>
                  </RowFold>
                ))}
                <AddRow label="Add a quote">
                  <QuoteForm id={id} back={back} services={activeServices} />
                </AddRow>
              </div>
            </>
          )}
          {view === "outreach" && <Outreach entityType="contractor" entityId={id} back={back} drafts={CONTRACTOR_DRAFTS} name={c.name} email={p.email} meetingTitle={`Gray Horizon × ${c.name}`} today={st.today} />}
          {view === "timeline" && <Timeline activities={d.activities} stageEvents={d.stageEvents} labels={CONTRACTOR_STAGE_LABELS} />}
          {view === "profile" && (
            <>
              <form className="form-grid" action={updateContractorProfileAction}>
                <BackTo path={back} />
                <HiddenFields values={{ contractorId: id }} />
                {(
                  [
                    ["name", "Name", c.name],
                    ["specialty", "Specialty", c.specialty],
                    ["businessName", "Business", p.businessName],
                    ["email", "Email", p.email],
                    ["phone", "Phone", p.phone],
                    ["location", "Location", p.location],
                    ["portfolioUrl", "Portfolio", p.portfolioUrl],
                    ["source", "Found via", p.source],
                  ] as const
                ).map(([k, lbl, v]) => (
                  <Field key={k} label={lbl}>
                    <input className="input" name={k} type={k === "email" ? "email" : undefined} defaultValue={v ?? ""} required={k === "name"} />
                  </Field>
                ))}
                <fieldset className="field" data-wide="">
                  <span>Roles (which contractor types they can fill)</span>
                  <span className="row">
                    {roles.map((r) => (
                      <label key={r.id} className="inline-check">
                        <input type="checkbox" name="roleIds" value={r.id} defaultChecked={(p.roleIds ?? []).includes(r.id)} /> {r.name}
                      </label>
                    ))}
                  </span>
                </fieldset>
                <fieldset className="field" data-wide="">
                  <span>Works with (business sizes; none ticked = any)</span>
                  <span className="row">
                    {BUSINESS_SIZES.map((z) => (
                      <label key={z} className="inline-check">
                        <input type="checkbox" name="worksWithSizes" value={z} defaultChecked={(p.worksWithSizes ?? []).includes(z)} /> {BUSINESS_SIZE_LABELS[z]}
                      </label>
                    ))}
                  </span>
                </fieldset>
                <Field label="Skills (comma-separated)" wide>
                  <input className="input" name="skills" defaultValue={(p.skills ?? []).join(", ")} />
                </Field>
                <Field label="GST registered">
                  <select className="select" name="gstRegistered" defaultValue={p.gstRegistered === null ? "" : p.gstRegistered ? "yes" : "no"}>
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
                <Field label="Quality (1–5)">
                  <select className="select" name="qualityRating" defaultValue={p.qualityRating ?? ""}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment terms" wide>
                  <input className="input" name="paymentTerms" defaultValue={p.paymentTerms ?? ""} />
                </Field>
                <Field label="Pay-when-paid accepted">
                  <input className="input" type="date" name="payWhenPaidAcceptedAt" defaultValue={p.payWhenPaidAcceptedAt ?? ""} />
                </Field>
                <Field label="Non-solicit signed">
                  <input className="input" type="date" name="nonSolicitSignedAt" defaultValue={p.nonSolicitSignedAt ?? ""} />
                </Field>
                <Field label="Notice (days)">
                  <input className="input" name="noticePeriodDays" defaultValue={p.noticePeriodDays ?? ""} inputMode="numeric" />
                </Field>
                <Field label="Signed agreement link">
                  <input className="input" name="agreementUrl" defaultValue={p.agreementUrl ?? ""} />
                </Field>
                <Field label="Public title (team card)">
                  <input className="input" name="publicTitle" defaultValue={p.publicTitle ?? ""} />
                </Field>
                <Field label="Photo URL (team card)">
                  <input className="input" name="photoUrl" defaultValue={p.photoUrl ?? ""} />
                </Field>
                <Field label="Bio" wide>
                  <textarea className="textarea" name="bio" defaultValue={p.bio ?? ""} />
                </Field>
                <Field label="Notes" wide>
                  <textarea className="textarea" name="notes" defaultValue={p.notes ?? ""} />
                </Field>
                <div className="form-actions">
                  <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                    Save profile
                  </SubmitButton>
                </div>
              </form>
              <form action={removeContractorAction} style={{ marginTop: 16 }}>
                <BackTo path={back} />
                <HiddenFields values={{ contractorId: id }} />
                <button type="submit" className="linkbtn danger">
                  <Trash2 size={12} /> Remove from Incrementum (keeps the GrayPortal record)
                </button>
              </form>
            </>
          )}
          {view === "clients" && <Ledger rows={engs.map((e) => [e.clientName ?? e.engagementName, `${e.status} · ${e.link.role}`, e.status === "active" ? undefined : "muted", `/incrementum/clients/${e.link.engagementId}`])} />}
        </Csec>
        <BigAction {...action} />
      </Console>

      <Dialog id="contractor-move" title={`Move ${c.name}`}>
        <form className="form-grid" action={setContractorStageAction}>
          <BackTo path={back} />
          <HiddenFields values={{ contractorId: id }} />
          <Field label="Stage">
            <select className="select" name="stage" defaultValue="paused">
              {ALL_CONTRACTOR_STAGES.filter((x) => x !== "onboarded").map((x) => (
                <option key={x} value={x}>
                  {CONTRACTOR_STAGE_LABELS[x]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note (required for Not a fit)">
            <input className="input" name="note" />
          </Field>
          <div className="form-actions">
            <SubmitButton className="btn btn-primary" pendingLabel="…">
              Move
            </SubmitButton>
          </div>
        </form>
      </Dialog>

      {stage === "confirmed" && !login && (
        <Dialog id="contractor-onboard" title={`Onboard ${c.name} to GrayPortal`}>
          <form className="form-grid" action={onboardContractorAction}>
            <BackTo path={back} />
            <HiddenFields values={{ contractorId: id }} />
            <Field label="Login email">
              <input className="input" type="email" name="email" defaultValue={p.email ?? ""} required />
            </Field>
            <Field label="Display name">
              <input className="input" name="displayName" defaultValue={c.name} />
            </Field>
            <div className="form-actions">
              <SubmitButton className="btn btn-primary" pendingLabel="Sending…">
                Send invite
              </SubmitButton>
            </div>
          </form>
          {unlinked.length > 0 && (
            <form className="row" action={linkContractorLoginAction}>
              <BackTo path={back} />
              <HiddenFields values={{ contractorId: id }} />
              <span className="muted small">Or link a login that already exists:</span>
              <select className="select" name="userId" aria-label="Existing login" style={{ flex: 1, width: "auto" }}>
                {unlinked.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                    {u.active ? "" : " (never signed in)"}
                  </option>
                ))}
              </select>
              <SubmitButton className="btn" pendingLabel="…">
                <Link2 size={13} /> Link
              </SubmitButton>
            </form>
          )}
        </Dialog>
      )}
      <IncrementumReadySignal />
    </div>
  );
}

function QuoteForm({
  id,
  back,
  services,
  x,
}: {
  id: string;
  back: string;
  services: { id: string; name: string }[];
  x?: { serviceId: string; rateType: string; rate: string | null; capacitySlots: string | null; notes: string | null };
}) {
  return (
    <form className="form-grid g3" action={upsertContractorServiceAction}>
      <BackTo path={back} />
      <HiddenFields values={{ contractorId: id }} />
      <Field label="Service">
        <select className="select" name="serviceId" defaultValue={x?.serviceId}>
          {services.map((sv) => (
            <option key={sv.id} value={sv.id}>
              {sv.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Rate type">
        <select className="select" name="rateType" defaultValue={x?.rateType ?? "monthly"}>
          {CONTRACTOR_RATE_TYPES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Rate ($)">
        <input className="input" name="rate" defaultValue={x?.rate ?? ""} required inputMode="decimal" />
      </Field>
      <Field label="Capacity (clients)">
        <input className="input" name="capacitySlots" defaultValue={x?.capacitySlots ?? ""} inputMode="decimal" />
      </Field>
      <Field label="Notes" wide>
        <input className="input" name="notes" defaultValue={x?.notes ?? ""} />
      </Field>
      <div className="form-actions">
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          Save quote
        </SubmitButton>
      </div>
    </form>
  );
}
