import { getCompany } from "@/lib/dal/companies";
import { ONBOARDING_TASK_TEMPLATE } from "@/config/onboarding";
import { StoreData } from "@/terminal/store";
import { OnboardClient } from "@/terminal/screens/Detail";

// Converting a won prospect (?companyId=) reuses that companies row instead
// of creating one — see lib/dal/onboarding.ts. Rendered in the terminal
// concept's parts.
export default async function OnboardClientPage({ searchParams }: { searchParams: Promise<{ onboardError?: string; companyId?: string }> }) {
  const { onboardError, companyId } = await searchParams;
  const existing = companyId ? await getCompany(companyId) : null;
  return (
    <StoreData
      data={{
        onboard: {
          company: existing ? { id: existing.company.id, name: existing.company.name } : null,
          error: onboardError ?? null,
          starterTasks: ONBOARDING_TASK_TEMPLATE.map((t) => ({ title: t.title, dueInDays: t.dueInDays })),
        },
      }}
    >
      <OnboardClient />
    </StoreData>
  );
}
