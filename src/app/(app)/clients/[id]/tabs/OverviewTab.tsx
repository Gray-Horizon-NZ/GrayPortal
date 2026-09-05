import { PORTAL_FEATURE_KEYS } from "@/lib/dal/clients";
import SubmitButton from "@/components/ui/SubmitButton";
import { updateCompanyDetailsAction, uploadClientLogoAction, updatePortalWelcomeAction } from "../../actions";
import FeatureToggle from "../FeatureToggle";
import TasklistLink from "../TasklistLink";
import HideFromTaskViewToggle from "../HideFromTaskViewToggle";
import type { ClientRecord, CompanyDetailData, ClientFeatureRow } from "./types";

export default function OverviewTab({
  client,
  companyData,
  features,
}: {
  client: ClientRecord;
  companyData: CompanyDetailData | null;
  features: ClientFeatureRow[];
}) {
  return (
    <div className="gh-tab-grid">
      <div className="gh-tab-grid-col">
      {companyData && (
        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Company details</p>
          {/* onboardClient() only sets the business name; the six fields below are normally filled in by
              the client themselves on the onboarding wizard's "Confirm your details" step (§4.3 step 2),
              but editable here too so an admin can correct or fill them in directly. */}
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
            Normally filled in by the client during onboarding — editable here if it needs correcting.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span style={{ color: "var(--gh-text-muted)" }}>Business name</span>
            <span>{companyData.company.name}</span>
          </div>
          <form
            action={updateCompanyDetailsAction.bind(null, companyData.company.id, client.id)}
            style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Main email</span>
              <input className="gh-input" name="mainEmail" type="email" defaultValue={companyData.company.mainEmail ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Phone</span>
              <input className="gh-input" name="phone" defaultValue={companyData.company.phone ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Position</span>
              <input className="gh-input" name="mainContactPosition" defaultValue={companyData.company.mainContactPosition ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Address</span>
              <input className="gh-input" name="address" defaultValue={companyData.company.address ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Postal address</span>
              <input className="gh-input" name="postalAddress" defaultValue={companyData.company.postalAddress ?? ""} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Referred by</span>
              <input className="gh-input" name="referredBy" defaultValue={companyData.company.referredBy ?? ""} />
            </label>
            <SubmitButton style={{ alignSelf: "flex-start" }}>Save company details</SubmitButton>
          </form>
        </section>
      )}

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Google Tasks list</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Route this client&apos;s synced tasks into their own Google Tasks list instead of the shared
          default list.
        </p>
        <TasklistLink clientId={client.id} currentTasklistId={client.googleTaskListId} />
        <HideFromTaskViewToggle clientId={client.id} hidden={client.hiddenFromTaskView} />
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Portal appearance</p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-4)" }}>
          {client.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external signed Storage URL, not a local asset
            <img src={client.logoUrl} alt={`${client.name} logo`} style={{ width: 48, height: 48, objectFit: "contain" }} />
          )}
          <form action={uploadClientLogoAction.bind(null, client.id)} encType="multipart/form-data" style={{ display: "flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
            <input className="gh-input" name="logo" type="file" accept="image/*" required />
            <SubmitButton className="gh-btn-secondary">Upload logo</SubmitButton>
          </form>
        </div>
        <form action={updatePortalWelcomeAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <textarea
            className="gh-input"
            name="portalWelcomeMessage"
            defaultValue={client.portalWelcomeMessage ?? ""}
            placeholder="Welcome message shown at the top of this client's portal home page (optional)"
            rows={3}
          />
          <SubmitButton style={{ alignSelf: "flex-start" }}>Save</SubmitButton>
        </form>
      </section>
      </div>

      <div className="gh-tab-grid-col">
      <section className="gh-card">
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>
          Portal features
          <span style={{ float: "right", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            {features.filter((f) => f.enabled).length} of {PORTAL_FEATURE_KEYS.length} on
          </span>
        </p>
        <div>
          {PORTAL_FEATURE_KEYS.map((key) => {
            const row = features.find((f) => f.featureKey === key);
            return (
              <FeatureToggle
                key={key}
                clientId={client.id}
                featureKey={key}
                enabled={row?.enabled ?? false}
              />
            );
          })}
        </div>
      </section>
      </div>
    </div>
  );
}
