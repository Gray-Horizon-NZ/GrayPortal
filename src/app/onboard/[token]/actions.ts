"use server";
import { updateOnboardingCompanyDetails, type UpdateOnboardingCompanyDetailsInputT } from "@/lib/dal/onboardingInvites";
import { submitPortalAccessRequest, type SubmitPortalAccessRequestInputT } from "@/lib/dal/portalAccessRequests";

// Thin wrappers around the token-gated DAL functions, called directly from
// OnboardingWizard (a client component) rather than via <form action> — the
// wizard advances steps client-side, so these just need to return/throw,
// not redirect.

export async function updateOnboardingDetailsAction(
  token: string,
  fields: UpdateOnboardingCompanyDetailsInputT
): Promise<void> {
  await updateOnboardingCompanyDetails(token, fields);
}

export async function submitAccessRequestAction(
  token: string,
  fields: SubmitPortalAccessRequestInputT
): Promise<void> {
  await submitPortalAccessRequest(token, fields);
}
