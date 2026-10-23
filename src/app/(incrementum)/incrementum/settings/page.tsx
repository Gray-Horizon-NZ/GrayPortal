import Link from "next/link";
import { SlidersHorizontal, Gauge, UserCog, Timer, Plug } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { capacityRules } from "@/lib/incrementum/compute";
import { money } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Field, RowFold, AddRow, Console, Csec, IdCard, Blocks, TermStatus, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { fmtDate, longDate, n0 } from "@/components/incrementum/terminal/helpers";
import { saveSettingsAction, saveCapacityThresholdsAction, logHoursAction, deleteHoursAction, createRoleAction, updateRoleAction, deleteRoleAction } from "../actions";

const BASE = "/incrementum/settings";
const VIEWS = ["assumptions", "capacity", "roles", "hours", "connections"] as const;
type View = (typeof VIEWS)[number];

// ─── Settings (console with views) ──────────────────────────────────────
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const set = st.settings;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "assumptions";
  const back = view === "assumptions" ? BASE : `${BASE}?view=${view}`;
  const viewHref = (v: View) => (v === "assumptions" ? BASE : `${BASE}?view=${v}`);
  const rules = capacityRules(st);
  const generalHours = st.hours.filter((h) => !h.engagementId).sort((a, b) => b.workDate.localeCompare(a.workDate));
  const roles = [...st.roles].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="screen">
      <PageHead title="Settings" sub="The assumptions everything else is calculated from. Every change is in the audit log." />
      <Console
        side={
          <>
            <IdCard
              // eslint-disable-next-line @next/next/no-img-element
              art={<img src="/brand-icon.png" alt="" />}
              strip="System settings"
              rows={[
                ["Markup", `${n0(set.defaultMarkupPct)}%`],
                ["Base · Stretch", `${money(set.freedomTarget)} · ${money(set.freedomDiamond)}`],
                ["Ads live", set.launchDate ? longDate(set.launchDate) : "Date not set"],
              ]}
            />
            <Blocks
              value={view}
              items={[
                { key: "assumptions", label: "Pricing & targets", icon: SlidersHorizontal, href: viewHref("assumptions") },
                { key: "capacity", label: "Capacity thresholds", icon: Gauge, href: viewHref("capacity") },
                { key: "roles", label: "Contractor roles", icon: UserCog, count: roles.length, href: viewHref("roles") },
                { key: "hours", label: "Your hours", icon: Timer, href: viewHref("hours") },
                { key: "connections", label: "Connections", icon: Plug, href: viewHref("connections") },
              ]}
            />
          </>
        }
      >
        {view === "assumptions" && (
          <Csec>
            <TermStatus label="Home mode" value={set.homeModeOverride ? (set.homeModeOverride === "pre" ? "Always pre-launch" : "Always live") : "Automatic"}>
              switches to live on the launch date
            </TermStatus>
            <form className="form-grid g3" style={{ marginTop: 18 }} action={saveSettingsAction}>
              <BackTo path={back} />
              <p className="eyebrow" style={{ gridColumn: "1 / -1" }}>
                Pricing
              </p>
              <Field label="Default markup on contractor quotes (%)">
                <input className="input" name="defaultMarkupPct" defaultValue={set.defaultMarkupPct} inputMode="decimal" />
              </Field>
              <p className="eyebrow" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                Freedom number (monthly recurring Incrementum profit): aim effort at the stretch, judge results against the base
              </p>
              <Field label="Base ($/month)">
                <input className="input" name="freedomTarget" defaultValue={set.freedomTarget} inputMode="decimal" />
              </Field>
              <Field label="Stretch ($/month)">
                <input className="input" name="freedomDiamond" defaultValue={set.freedomDiamond} inputMode="decimal" />
              </Field>
              <Field label="By">
                <input className="input" type="date" name="freedomByDate" defaultValue={set.freedomByDate ?? ""} />
              </Field>
              <p className="eyebrow" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                Proof lines per client per month (pass / kill)
              </p>
              <Field label="Partner pass ($)">
                <input className="input" name="partnerPassLine" defaultValue={set.partnerPassLine} inputMode="decimal" />
              </Field>
              <Field label="Partner kill ($)">
                <input className="input" name="partnerKillLine" defaultValue={set.partnerKillLine} inputMode="decimal" />
              </Field>
              <span />
              <Field label="Essentials pass ($)">
                <input className="input" name="essentialsPassLine" defaultValue={set.essentialsPassLine} inputMode="decimal" />
              </Field>
              <Field label="Essentials kill ($)">
                <input className="input" name="essentialsKillLine" defaultValue={set.essentialsKillLine} inputMode="decimal" />
              </Field>
              <span />
              <p className="eyebrow" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                Ad budget ladder (after the runway)
              </p>
              <Field label="Reinvest % of retainer profit">
                <input className="input" name="reinvestRetainerPct" defaultValue={set.reinvestRetainerPct} inputMode="decimal" />
              </Field>
              <Field label="Reinvest % of one-off profit">
                <input className="input" name="reinvestOneOffPct" defaultValue={set.reinvestOneOffPct} inputMode="decimal" />
              </Field>
              <Field label="Hold the budget when payback is over (months)">
                <input className="input" name="maxPaybackMonths" defaultValue={set.maxPaybackMonths} inputMode="decimal" />
              </Field>
              <Field label="Search-volume ceiling ($/month, blank = not recorded)">
                <input className="input" name="searchCeiling" defaultValue={set.searchCeiling ?? ""} inputMode="decimal" />
              </Field>
              <Field label="Weekly outreach target (businesses)">
                <input className="input" name="weeklyOutreachTarget" type="number" min={0} defaultValue={set.weeklyOutreachTarget} />
              </Field>
              <Field label="Account-manager trigger (your hours / week)">
                <input className="input" name="amHoursTrigger" defaultValue={set.amHoursTrigger} inputMode="decimal" />
              </Field>
              <p className="eyebrow" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                Planning assumptions (the Path view uses these until live numbers exist)
              </p>
              <Field label="Profit per client ($/month)">
                <input className="input" name="planProfitPerClient" defaultValue={set.planProfitPerClient} inputMode="decimal" />
              </Field>
              <Field label="Average stay (months)">
                <input className="input" name="planStayMonths" defaultValue={set.planStayMonths} inputMode="decimal" />
              </Field>
              <Field label="Close rate (%)">
                <input className="input" name="planCloseRatePct" defaultValue={set.planCloseRatePct} inputMode="decimal" />
              </Field>
              <Field label="Partner share (%)">
                <input className="input" name="planPartnerSharePct" defaultValue={set.planPartnerSharePct} inputMode="decimal" />
              </Field>
              <Field label="Add-on attach rate (%)">
                <input className="input" name="planAddonAttachPct" defaultValue={set.planAddonAttachPct} inputMode="decimal" />
              </Field>
              <span />
              <p className="eyebrow" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                Ads &amp; leads
              </p>
              <Field label="Ad budget (runway, $)">
                <input className="input" name="adBudgetTotal" defaultValue={set.adBudgetTotal} inputMode="decimal" />
              </Field>
              <Field label="Lead response target (minutes)">
                <input className="input" name="responseTargetMinutes" type="number" min={1} defaultValue={set.responseTargetMinutes} />
              </Field>
              <Field label="Ads go live (sets every launch-relative date)">
                <input className="input" type="date" name="launchDate" defaultValue={set.launchDate ?? ""} />
              </Field>
              <Field label="Home mode">
                <select className="select" name="homeModeOverride" defaultValue={set.homeModeOverride ?? ""}>
                  <option value="">Automatic (live from launch date)</option>
                  <option value="pre">Always pre-launch</option>
                  <option value="live">Always live</option>
                </select>
              </Field>
              <div className="form-actions">
                <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                  Save settings
                </SubmitButton>
              </div>
            </form>
          </Csec>
        )}
        {view === "capacity" && (
          <Csec>
            <form className="form-grid g3" action={saveCapacityThresholdsAction}>
              <BackTo path={back} />
              <Field label="Client slots per contractor (until declared)">
                <input className="input" name="defaultSlotsPerContractor" type="number" min={1} step="any" defaultValue={rules.slotsPer} />
              </Field>
              <Field label="Minimum bench per service">
                <input className="input" name="minBench" type="number" min={0} defaultValue={rules.minBench} />
              </Field>
              <Field label="Warn when free slots ≤">
                <input className="input" name="lowSlotsWarn" type="number" min={0} defaultValue={rules.lowSlots} />
              </Field>
              <Field label="Days to recruit (until measured)">
                <input className="input" name="defaultRecruitDays" type="number" min={1} defaultValue={rules.recruitDays} />
              </Field>
              <div className="form-actions">
                <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                  Save thresholds
                </SubmitButton>
                <Link className="linkbtn" href="/incrementum/capacity">
                  Per-contractor slots and client slot weights are on Capacity ›
                </Link>
              </div>
            </form>
          </Csec>
        )}
        {view === "roles" && (
          <Csec className="flush">
            <div className="agency-list-head">
              Contractor roles <span className="r">Each service picks one role; each contractor ticks the roles they fill</span>
            </div>
            <div className="rowlist">
              {roles.map((r) => {
                const people = st.profiles.filter((c) => (c.roleIds ?? []).includes(r.id)).length;
                const svcs = s.services.filter((x) => x.status === "active" && x.roleId === r.id).map((x) => x.name);
                return (
                  <RowFold
                    key={r.id}
                    summary={
                      <>
                        <span className="rowfold-main">
                          <span>
                            <span className="strong" style={{ fontWeight: 500 }}>
                              {r.name}
                            </span>
                            <small>{svcs.join(", ") || "no services yet"}</small>
                          </span>
                        </span>
                        <span className="muted small">
                          {people} contractor{people === 1 ? "" : "s"}
                        </span>
                      </>
                    }
                  >
                    <form className="form-grid g3" action={updateRoleAction}>
                      <BackTo path={back} />
                      <HiddenFields values={{ id: r.id }} />
                      <Field label="Name">
                        <input className="input" name="name" defaultValue={r.name} required />
                      </Field>
                      <Field label="Order">
                        <input className="input" name="sortOrder" defaultValue={r.sortOrder} inputMode="numeric" />
                      </Field>
                      <div className="form-actions">
                        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                          Save
                        </SubmitButton>
                      </div>
                    </form>
                    <form action={deleteRoleAction} className="row">
                      <BackTo path={back} />
                      <HiddenFields values={{ id: r.id }} />
                      <span className="spacer" />
                      <button type="submit" className="linkbtn danger">
                        Remove
                      </button>
                    </form>
                  </RowFold>
                );
              })}
              <AddRow label="Add a role">
                <form className="row" action={createRoleAction}>
                  <BackTo path={back} />
                  <input className="input" name="name" placeholder="e.g. Copywriter" required style={{ flex: 1, width: "auto" }} />
                  <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                    Add role
                  </SubmitButton>
                </form>
              </AddRow>
            </div>
          </Csec>
        )}
        {view === "hours" && (
          <Csec>
            <p className="muted small" style={{ marginBottom: 12 }}>
              Recruiting, sales calls, admin. Client hours are logged on each client.
            </p>
            <form className="row" action={logHoursAction}>
              <BackTo path={back} />
              <input className="input" type="date" name="workDate" defaultValue={st.today} style={{ width: 150 }} aria-label="Date" />
              <input className="input" name="hours" placeholder="Hours" required style={{ width: 80 }} inputMode="decimal" />
              <input className="input" name="note" placeholder="What for" style={{ flex: 1, width: "auto" }} />
              <SubmitButton className="btn" pendingLabel="…">
                Log
              </SubmitButton>
            </form>
            <dl className="ledger">
              {generalHours.slice(0, 15).map((h) => (
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
          </Csec>
        )}
        {view === "connections" && (
          <Csec>
            <Ledger
              rows={[
                ["Email and meeting invites", <Link key="g" className="linkbtn" href="/settings">Google account in GrayPortal Settings ›</Link>],
                ["Main-list task sync", 'Google Tasks · "Project Incrementum"'],
                ["Landing page forms", "POST /api/incrementum/leads"],
                ["Lead acknowledgement email", "template incrementum_lead_acknowledgement"],
              ]}
            />
          </Csec>
        )}
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}
