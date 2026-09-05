import type { getClient } from "@/lib/dal/clients";
import type { getCompany } from "@/lib/dal/companies";
import type { listActiveDiscounts } from "@/lib/dal/referrals";
import type { listIdeationItems } from "@/lib/dal/ideation";
import type { listRoadmapItems } from "@/lib/dal/roadmap";
import type { listMeetingSummaries } from "@/lib/dal/meetingSummaries";
import type { listToolStackItems } from "@/lib/dal/toolStack";
import type { listClientServices } from "@/lib/dal/clientServices";
import type { listServiceItems } from "@/lib/dal/pricing";
import type { listClientMetricsSnapshots } from "@/lib/dal/clientMetrics";
import type { listClientTeamMembers } from "@/lib/dal/clientTeam";
import type { listClientHealthChannels } from "@/lib/dal/clientHealthChannels";
import type { listClientActivityFeed } from "@/lib/dal/clientActivityFeed";
import type { listEmailsForClient } from "@/lib/dal/emails";
import type { listPendingAccessRequests } from "@/lib/dal/portalAccessRequests";
import type { listGrayscaleRequests } from "@/lib/dal/grayscaleRequests";
import type { getLatestHealthScore } from "@/lib/dal/health";

// Types are derived straight from each DAL function's return shape (rather
// than re-declared field-by-field) so this file can't silently drift from
// the actual query shape as the schema evolves.
export type ClientDetailData = NonNullable<Awaited<ReturnType<typeof getClient>>>;
export type ClientRecord = ClientDetailData["client"];
export type ClientFeatureRow = ClientDetailData["features"][number];
export type PortalUser = ClientDetailData["portalUsers"][number];
export type ClientDocument = ClientDetailData["documents"][number];
export type ClientReferral = ClientDetailData["referrals"][number];
export type OnboardingInvite = ClientDetailData["onboardingInvites"][number];
export type CompanyDetailData = NonNullable<Awaited<ReturnType<typeof getCompany>>>;

export type ActiveDiscount = Awaited<ReturnType<typeof listActiveDiscounts>>[number];
export type IdeationItem = Awaited<ReturnType<typeof listIdeationItems>>[number];
export type RoadmapItem = Awaited<ReturnType<typeof listRoadmapItems>>[number];
export type MeetingSummary = Awaited<ReturnType<typeof listMeetingSummaries>>[number];
export type ToolStackItem = Awaited<ReturnType<typeof listToolStackItems>>[number];
export type ClientServiceItem = Awaited<ReturnType<typeof listClientServices>>[number];
export type ServiceCatalogueItem = Awaited<ReturnType<typeof listServiceItems>>[number];
export type MetricsSnapshot = Awaited<ReturnType<typeof listClientMetricsSnapshots>>[number];
export type TeamMember = Awaited<ReturnType<typeof listClientTeamMembers>>[number];
export type HealthChannel = Awaited<ReturnType<typeof listClientHealthChannels>>[number];
export type ActivityFeedEntry = Awaited<ReturnType<typeof listClientActivityFeed>>[number];
export type EmailRow = Awaited<ReturnType<typeof listEmailsForClient>>[number];
export type PendingAccessRequest = Awaited<ReturnType<typeof listPendingAccessRequests>>[number];
export type GrayscaleRequest = Awaited<ReturnType<typeof listGrayscaleRequests>>[number];
export type HealthScore = Awaited<ReturnType<typeof getLatestHealthScore>>;
