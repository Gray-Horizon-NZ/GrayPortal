import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { getClient } from "@/lib/dal/clients";
import { paymentStatus } from "@/lib/paymentStatus";
import { listActiveDiscounts } from "@/lib/dal/referrals";
import { getLatestHealthScore } from "@/lib/dal/health";
import { listIdeationItems } from "@/lib/dal/ideation";
import { listRoadmapItems } from "@/lib/dal/roadmap";
import { listMeetingSummaries } from "@/lib/dal/meetingSummaries";
import { listToolStackItems } from "@/lib/dal/toolStack";
import { listClientServices, getActiveMonthlyTotal } from "@/lib/dal/clientServices";
import { listServiceItems } from "@/lib/dal/pricing";
import { listClientMetricsSnapshots } from "@/lib/dal/clientMetrics";
import { listClientTeamMembers } from "@/lib/dal/clientTeam";
import { listClientHealthChannels } from "@/lib/dal/clientHealthChannels";
import { listClientActivityFeed } from "@/lib/dal/clientActivityFeed";
import { listEmailsForClient } from "@/lib/dal/emails";
import { getCompany } from "@/lib/dal/companies";
import { getDefaultOnboardingInviteEmail } from "@/lib/dal/onboardingInvites";
import { ONBOARDING_DOCUMENT_NAMES } from "@/config/onboarding";
import { listPendingAccessRequests } from "@/lib/dal/portalAccessRequests";
import { listGrayscaleRequests } from "@/lib/dal/grayscaleRequests";
import { deleteClientAction } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import RecordHeader from "@/components/ui/RecordHeader";
import Badge from "@/components/ui/Badge";
import ClientDetailTabs from "./ClientDetailTabs";
import OverviewTab from "./tabs/OverviewTab";
import AccessTab from "./tabs/AccessTab";
import CommercialTab from "./tabs/CommercialTab";
import DeliveryTab from "./tabs/DeliveryTab";
import TeamTab from "./tabs/TeamTab";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    inviteError?: string;
    invited?: string;
    onboardingInviteSent?: string;
    onboardingInviteError?: string;
    accessRequestApproved?: string;
    accessRequestDenied?: string;
    accessRequestError?: string;
  }>;
}) {
  const { id } = await params;
  const {
    inviteError,
    invited,
    onboardingInviteSent,
    onboardingInviteError,
    accessRequestApproved,
    accessRequestDenied,
    accessRequestError,
  } = await searchParams;
  const data = await getClient(id);
  if (!data) notFound();
  const { client, referrals, features, portalUsers, documents, onboardingInvites } = data;
  const status = paymentStatus(client.nextPaymentDate);
  const defaultInviteEmail = await getDefaultOnboardingInviteEmail(client.name);

  // Same fixed four-name registry as the "Onboarding documents" checklist
  // below — a portal-setup invite can't send until every one of these is
  // attached (sendOnboardingInvite enforces this too; this is just what lets
  // the UI block before the round trip). documents here already excludes
  // soft-deleted rows (getClient's own query), so no extra filter needed.
  const attachedOnboardingDocNames = new Set(documents.map((d) => d.title));
  const missingOnboardingDocumentNames = ONBOARDING_DOCUMENT_NAMES.filter(
    (name) => !attachedOnboardingDocNames.has(name)
  );

  const [
    activeDiscounts,
    ideas,
    roadmap,
    meetings,
    tools,
    health,
    clientServices,
    serviceCatalogue,
    activeMonthlyTotal,
    metricsSnapshots,
    teamMembers,
    healthChannels,
    activityFeed,
    recentEmails,
    companyData,
    pendingAccessRequests,
    grayscaleRequests,
  ] = await Promise.all([
    listActiveDiscounts(client.id),
    listIdeationItems(client.id),
    listRoadmapItems(client.id),
    listMeetingSummaries(client.id),
    listToolStackItems(client.id),
    getLatestHealthScore(client.id),
    listClientServices(client.id),
    listServiceItems(),
    getActiveMonthlyTotal(client.id),
    listClientMetricsSnapshots(client.id),
    listClientTeamMembers(client.id),
    listClientHealthChannels(client.id),
    listClientActivityFeed(client.id),
    listEmailsForClient(client.id),
    client.companyId ? getCompany(client.companyId) : Promise.resolve(null),
    listPendingAccessRequests(client.id),
    listGrayscaleRequests(client.id),
  ]);

  const overallDiscountPercent = Number(client.overallDiscountPercent ?? 0);
  const finalMonthlyTotal = activeMonthlyTotal * (1 - overallDiscountPercent / 100);

  // Same blocker class as a missing onboarding document — an empty roadmap
  // means the portal isn't ready to hand over (sendOnboardingInvite enforces
  // this too, independently, via its own DB check).
  const missingReadinessItems = roadmap.length > 0 ? missingOnboardingDocumentNames : [...missingOnboardingDocumentNames, "Roadmap"];

  const pendingSignIns = portalUsers.filter((u) => !u.googleUid).length;

  // A server action redirects back here with one of these params after an
  // access/invite mutation — all of that confirmation UI lives in the
  // Access & credentials tab now, so that tab must be the one showing on
  // return, or the message would land on a hidden pane.
  const initialTabId =
    inviteError || invited || onboardingInviteSent || onboardingInviteError || accessRequestApproved || accessRequestDenied || accessRequestError
      ? "access"
      : "overview";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }} className="gh-animate-fade-up">
      <RecordHeader
        icon={Building2}
        title={client.name}
        meta={status && <Badge status={status.tone}>{status.label}</Badge>}
        actions={
          <>
            <Link href={`/clients/${client.id}/portal-preview`} className="gh-btn-secondary">
              View client portal
            </Link>
            <form action={deleteClientAction.bind(null, client.id)}>
              <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>
                Remove client
              </SubmitButton>
            </form>
          </>
        }
      />

      <div className="gh-kpi-strip">
        <div className="gh-kpi">
          <div className="gh-kpi-n">${finalMonthlyTotal.toLocaleString("en-NZ")}</div>
          <div className="gh-kpi-l">Estimated monthly</div>
        </div>
        <div className="gh-kpi">
          <div className="gh-kpi-n">{health ? Math.round(Number(health.score)) : "—"}</div>
          <div className="gh-kpi-l">Health score{health ? ` — ${health.trend}` : ""}</div>
        </div>
        <div className="gh-kpi">
          <div className="gh-kpi-n">{clientServices.length}</div>
          <div className="gh-kpi-l">Active services</div>
        </div>
        <div className="gh-kpi">
          <div className="gh-kpi-n">{pendingSignIns}</div>
          <div className="gh-kpi-l">Invite{pendingSignIns === 1 ? "" : "s"} awaiting sign-in</div>
        </div>
      </div>

      <ClientDetailTabs
        initialTabId={initialTabId}
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: <OverviewTab client={client} companyData={companyData} features={features} />,
          },
          {
            id: "access",
            label: "Access & credentials",
            content: (
              <AccessTab
                client={client}
                pendingAccessRequests={pendingAccessRequests}
                portalUsers={portalUsers}
                onboardingInvites={onboardingInvites}
                defaultInviteEmail={defaultInviteEmail}
                missingReadinessItems={missingReadinessItems}
                documents={documents}
                invited={invited}
                inviteError={inviteError}
                onboardingInviteSent={onboardingInviteSent}
                onboardingInviteError={onboardingInviteError}
                accessRequestApproved={accessRequestApproved}
                accessRequestDenied={accessRequestDenied}
                accessRequestError={accessRequestError}
              />
            ),
          },
          {
            id: "commercial",
            label: "Commercial",
            content: (
              <CommercialTab
                client={client}
                clientServices={clientServices}
                serviceCatalogue={serviceCatalogue}
                activeMonthlyTotal={activeMonthlyTotal}
                overallDiscountPercent={overallDiscountPercent}
                finalMonthlyTotal={finalMonthlyTotal}
                companyData={companyData}
                referrals={referrals}
                activeDiscounts={activeDiscounts}
                grayscaleRequests={grayscaleRequests}
              />
            ),
          },
          {
            id: "delivery",
            label: "Delivery",
            content: <DeliveryTab client={client} documents={documents} roadmap={roadmap} ideas={ideas} tools={tools} />,
          },
          {
            id: "team",
            label: "Team & activity",
            content: (
              <TeamTab
                client={client}
                teamMembers={teamMembers}
                meetings={meetings}
                healthChannels={healthChannels}
                metricsSnapshots={metricsSnapshots}
                recentEmails={recentEmails}
                companyData={companyData}
                activityFeed={activityFeed}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
