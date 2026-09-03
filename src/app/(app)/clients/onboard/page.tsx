import { PORTAL_FEATURE_KEYS } from "@/lib/dal/clients";
import { getCompany } from "@/lib/dal/companies";
import { ONBOARDING_TASK_TEMPLATE } from "@/config/onboarding";
import { onboardClientAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";

const DEFAULT_ENABLED = new Set(["tasks", "documents", "referrals"]);

export default async function OnboardClientPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardError?: string; companyId?: string }>;
}) {
  const { onboardError, companyId } = await searchParams;
  // Converting a won prospect (a companies row that already exists, from
  // the pipeline) reuses that row instead of creating a new one — see
  // lib/dal/onboarding.ts's companyId branch. The company section below is
  // skipped in that case since there's nothing new to collect for it.
  const existingCompanyData = companyId ? await getCompany(companyId) : null;
  const existingCompany = existingCompanyData?.company ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 560 }}>
      <div>
        <p className="gh-eyebrow">Clients</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
          Onboard <em>client</em>
        </h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-2)" }}>
          {existingCompany
            ? `Converting ${existingCompany.name} from prospect to client — creates the client record, portal login invite, selected features, and a starter task list. The company itself isn't duplicated.`
            : "Creates the company, client record, portal login invite, selected features, and a starter task list in one step."}
        </p>
        {onboardError && (
          <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)", marginTop: "var(--gh-space-3)" }}>
            Couldn&apos;t onboard: {onboardError}
          </p>
        )}
      </div>

      <form action={onboardClientAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
        {existingCompany ? (
          <input type="hidden" name="companyId" value={existingCompany.id} />
        ) : (
          <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <p className="gh-eyebrow">Company</p>
            <input className="gh-input" name="companyName" placeholder="Company name" required />
            <input className="gh-input" name="source" placeholder="Source (e.g. referral, cold outreach)" required />
            <input className="gh-input" name="industry" placeholder="Industry (optional)" />
            <input className="gh-input" name="region" placeholder="Region (optional)" />
            <input className="gh-input" name="website" placeholder="Website (optional)" />
          </section>
        )}

        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Billing</p>
          <input className="gh-input" name="nextPaymentDate" type="month" placeholder="Next payment month" />
        </section>

        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <p className="gh-eyebrow">Portal login</p>
          <input className="gh-input" name="email" type="email" placeholder="Client email" required />
          <input className="gh-input" name="displayName" placeholder="Display name (optional)" />
        </section>

        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Portal features</p>
          {PORTAL_FEATURE_KEYS.map((key) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)" }}>
              <input type="checkbox" name={`feature:${key}`} defaultChecked={DEFAULT_ENABLED.has(key)} />
              <span style={{ fontSize: "var(--gh-text-sm)" }}>{key.replace("_", " ")}</span>
            </label>
          ))}
        </section>

        <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Starter tasks (automatic)</p>
          {ONBOARDING_TASK_TEMPLATE.map((t) => (
            <p key={t.title} style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
              {t.title} — due in {t.dueInDays}d
            </p>
          ))}
        </section>

        <SubmitButton pendingLabel="Creating client…">Create client</SubmitButton>
      </form>
    </div>
  );
}
