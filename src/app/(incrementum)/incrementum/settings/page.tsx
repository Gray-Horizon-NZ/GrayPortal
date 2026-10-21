import Link from "next/link";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listRecentHours } from "@/lib/dal/incrementum/planning";
import { shortDate, todayNz } from "@/lib/incrementum/format";
import { PageHead, Flash } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { saveSettingsAction, logHoursAction, createRoleAction, updateRoleAction, deleteRoleAction } from "../actions";

const BACK = "/incrementum/settings";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const [s, hours] = await Promise.all([getIncrementumSnapshot(), listRecentHours(15)]);
  const st = s.state.settings;
  const roles = s.state.roles.filter((r) => !r.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const servicesOn = (roleId: string) => s.services.filter((x) => x.status === "active" && x.roleId === roleId).map((x) => x.name);
  const contractorsOn = (roleId: string) => s.state.profiles.filter((p) => (p.roleIds ?? []).includes(roleId)).length;

  return (
    <>
      <PageHead eyebrow="Learn" title={<>Settings</>} lede="The assumptions everything else is calculated from. Every change is in the audit log." />
      <Flash ok={ok} error={error} />

      <section className="inc-panel">
        <form action={saveSettingsAction} className="inc-form">
          <input type="hidden" name="_back" value={BACK} />
          <p className="gh-eyebrow inc-field--wide">Pricing</p>
          <label className="inc-field">
            Default markup on contractor quotes (%)
            <input className="gh-input" name="defaultMarkupPct" defaultValue={st.defaultMarkupPct} />
          </label>
          <p className="gh-eyebrow inc-field--wide">Freedom number (monthly Incrementum profit)</p>
          <label className="inc-field">
            Target
            <input className="gh-input" name="freedomTarget" defaultValue={st.freedomTarget} />
          </label>
          <label className="inc-field">
            Gold
            <input className="gh-input" name="freedomGold" defaultValue={st.freedomGold} />
          </label>
          <label className="inc-field">
            Diamond
            <input className="gh-input" name="freedomDiamond" defaultValue={st.freedomDiamond} />
          </label>
          <p className="gh-eyebrow inc-field--wide">Ads &amp; leads</p>
          <label className="inc-field">
            Ad budget (runway, $)
            <input className="gh-input" name="adBudgetTotal" defaultValue={st.adBudgetTotal} />
          </label>
          <label className="inc-field">
            Lead response target (minutes)
            <input className="gh-input" type="number" name="responseTargetMinutes" defaultValue={st.responseTargetMinutes} />
          </label>
          <label className="inc-field">
            Ads go live (sets every launch-relative date)
            <input className="gh-input" type="date" name="launchDate" defaultValue={st.launchDate ?? ""} />
          </label>
          <label className="inc-field">
            Home mode
            <select className="gh-input" name="homeModeOverride" defaultValue={st.homeModeOverride ?? ""}>
              <option value="">Automatic (live from launch date)</option>
              <option value="pre">Always pre-launch</option>
              <option value="live">Always live</option>
            </select>
          </label>
          <p className="gh-eyebrow inc-field--wide">Capacity assumptions</p>
          <label className="inc-field">
            Client slots per contractor (until declared)
            <input className="gh-input" name="defaultSlotsPerContractor" defaultValue={st.defaultSlotsPerContractor} />
          </label>
          <label className="inc-field">
            Days to recruit (until measured)
            <input className="gh-input" type="number" name="defaultRecruitDays" defaultValue={st.defaultRecruitDays} />
          </label>
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
        </form>
      </section>

      <section className="inc-panel" id="roles">
        <div className="inc-cell-head">
          <h2 className="inc-cell-title">
            Contractor <em>roles</em>
          </h2>
          <span className="inc-small">Each service picks one role (Services &amp; Pricing); each contractor ticks the roles they fill (their profile)</span>
        </div>
        <div className="inc-list">
          {roles.map((r) => (
            <div className="inc-row" key={r.id} style={{ flexWrap: "wrap" }}>
              <form action={updateRoleAction} className="inc-inline" style={{ flex: "1 1 320px" }}>
                <input type="hidden" name="_back" value={`${BACK}#roles`} />
                <input type="hidden" name="id" value={r.id} />
                <input className="gh-input" name="sortOrder" type="number" defaultValue={r.sortOrder} aria-label="Order" style={{ width: 64 }} />
                <input className="gh-input" name="name" defaultValue={r.name} aria-label="Role name" required style={{ flex: 1 }} />
                <SubmitButton className="gh-btn-secondary" pendingLabel="…">
                  Save
                </SubmitButton>
              </form>
              <span className="inc-small" style={{ flex: "1 1 240px" }}>
                {contractorsOn(r.id)} contractor{contractorsOn(r.id) === 1 ? "" : "s"} · {servicesOn(r.id).join(", ") || "no services yet"}
              </span>
              <form action={deleteRoleAction}>
                <input type="hidden" name="_back" value={`${BACK}#roles`} />
                <input type="hidden" name="id" value={r.id} />
                <button className="gh-link-btn gh-link-btn--danger" type="submit">
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={createRoleAction} className="inc-inline">
          <input type="hidden" name="_back" value={`${BACK}#roles`} />
          <input className="gh-input" name="name" placeholder="New role, e.g. Copywriter" required aria-label="New role" style={{ flex: 1 }} />
          <SubmitButton className="gh-btn-secondary" pendingLabel="…">
            Add role
          </SubmitButton>
        </form>
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">
          Your <em>hours</em> (not tied to a client)
        </h2>
        <p className="inc-small">Recruiting, sales calls, admin. Client-specific hours are logged on each engagement.</p>
        <form action={logHoursAction} className="inc-inline">
          <input type="hidden" name="_back" value={BACK} />
          <input className="gh-input" type="date" name="workDate" defaultValue={todayNz()} aria-label="Date" />
          <input className="gh-input" name="hours" placeholder="Hours" inputMode="decimal" required style={{ width: 90 }} />
          <input className="gh-input" name="note" placeholder="What for" style={{ flex: 1 }} />
          <SubmitButton className="gh-btn-secondary" pendingLabel="…">Log</SubmitButton>
        </form>
        <div className="inc-list">
          {hours.map((h) => (
            <div className="inc-row" key={h.id}>
              <span>
                {shortDate(h.workDate)} · {h.hours} h {h.note ? <span className="inc-small">· {h.note}</span> : null}
              </span>
              <span className="inc-small">{h.engagementId ? "client" : "general"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="inc-panel">
        <h2 className="inc-cell-title">Connections</h2>
        <ul className="inc-small" style={{ paddingLeft: "var(--gh-space-4)", display: "flex", flexDirection: "column", gap: 4 }}>
          <li>
            Email and meeting invites use the Google account connected in{" "}
            <Link className="inc-link" href="/settings">
              GrayPortal Settings
            </Link>
            . Pick a Google Tasks list for &quot;Project Incrementum&quot; there too, or main-list tasks sync to your default list.
          </li>
          <li>Landing page forms post JSON to /api/incrementum/leads (businessName, contactName, email, phone, message, gclid, utm_*). Optional x-lead-capture-key header if LEAD_CAPTURE_SECRET is set.</li>
          <li>Lead acknowledgement emails only send once you create an email template with key incrementum_lead_acknowledgement (Email Templates). Variables: client_name, business_name.</li>
        </ul>
      </section>
      <IncrementumReadySignal />
    </>
  );
}
