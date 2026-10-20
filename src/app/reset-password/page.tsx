import { verifyOnboardingToken } from "@/lib/dal/onboardingInvites";
import ResetPasswordForm from "./ResetPasswordForm";

// Two ways in, one screen: a forgot-password/resend email (oobCode only),
// or the portal-setup invite's first step (oobCode + invite, minted by
// /onboard/[token] — see resolveInvitePasswordStep). Either way it's drawn
// in the onboarding wizard's own shell rather than the admin login card, so
// a client going invite → password → wizard never sees the look change.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ oobCode?: string; invite?: string }>;
}) {
  const { oobCode, invite } = await searchParams;

  let clientName: string | null = null;
  if (invite) {
    const resolved = await verifyOnboardingToken(invite);
    if (resolved.status === "valid") clientName = resolved.clientName;
  }

  return <ResetPasswordForm oobCode={oobCode ?? null} invite={clientName ? invite! : null} clientName={clientName} />;
}
