import { notFound } from "next/navigation";
import { loadOnboardingWizardPreviewData } from "@/lib/dal/onboardingInvites";
import OnboardingWizard from "@/components/onboardingWizard/OnboardingWizard";

// Admin-only "see it as a client would" mode — same wizard shell and step
// components as the real /onboard/[token] flow, but no token exists: the
// route sits behind the normal cookie-gated fallthrough in proxy.ts (it's
// on no public-path list), and loadOnboardingWizardPreviewData's own
// assertRole("admin") is the real boundary, same as everywhere else in this
// app. Next never persists anything in preview mode — see OnboardingWizard.
export default async function OnboardingPreviewPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const result = await loadOnboardingWizardPreviewData(clientId);

  if (result.status !== "valid") notFound();

  return <OnboardingWizard mode="preview" data={result} />;
}
