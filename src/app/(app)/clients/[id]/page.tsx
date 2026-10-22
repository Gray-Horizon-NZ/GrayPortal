import { notFound } from "next/navigation";
import { getClient } from "@/lib/dal/clients";
import { listActiveDiscounts } from "@/lib/dal/referrals";
import { listIdeationItems } from "@/lib/dal/ideation";
import { listRoadmapItems } from "@/lib/dal/roadmap";
import { listMeetingSummaries } from "@/lib/dal/meetingSummaries";
import { listToolStackItems } from "@/lib/dal/toolStack";
import { listServiceItems } from "@/lib/dal/pricing";
import { listClientTeamMembers } from "@/lib/dal/clientTeam";
import { listClientHealthChannels } from "@/lib/dal/clientHealthChannels";
import { listClientActivityFeed } from "@/lib/dal/clientActivityFeed";
import { listEmailsForClient } from "@/lib/dal/emails";
import { getCompany } from "@/lib/dal/companies";
import { getDefaultOnboardingInviteEmail } from "@/lib/dal/onboardingInvites";
import { listPendingAccessRequests } from "@/lib/dal/portalAccessRequests";
import { listGrayscaleRequests } from "@/lib/dal/grayscaleRequests";
import { daysUntil } from "@/lib/date";
import { renderTrustedMarkdown } from "@/lib/markdown";
import { wrapPortalInviteEmailHtml, sanitizeEmailHtml, appUrl } from "@/lib/email/chrome";
import { StoreData } from "@/terminal/store";
import ClientProfile from "@/terminal/screens/ClientProfile";
import { loadClients, loadMoney } from "@/terminal/load";
import CredentialsList from "../../vault/CredentialsList";

const nz = (d: Date | string) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(d));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:${p("minute")}`;
};

// What each server action's redirect param means, shown above the tabs.
const FLASH: Record<string, [string, string | null]> = {
  invited: ["good", "Login added. Nothing's been emailed yet — send the portal-setup invite when they're ready."],
  inviteError: ["bad", "Couldn't add that login"],
  onboardingInviteSent: ["good", "Portal-setup invite sent."],
  onboardingInviteError: ["bad", "Couldn't send the invite"],
  accessRequestApproved: ["good", "Access approved."],
  accessRequestDenied: ["neutral", "Request denied."],
  accessRequestError: ["bad", "Couldn't approve"],
  passwordEmailSent: ["good", "Password setup email sent."],
  passwordEmailError: ["bad", "Couldn't send the password email"],
};

// Rendered by the terminal concept's ClientProfile (five tabs). Every
// control is wired to the real actions in ../actions.ts.
export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const data = await getClient(id);
  if (!data) notFound();
  const { client, referrals, features, portalUsers, documents, onboardingInvites } = data;

  const clientsP = loadClients();
  const [
    clients,
    money,
    activeDiscounts,
    ideas,
    roadmap,
    meetings,
    tools,
    catalogue,
    teamMembers,
    healthChannels,
    activityFeed,
    recentEmails,
    companyData,
    pendingAccessRequests,
    grayscaleRequests,
    defaultInviteEmail,
  ] = await Promise.all([
    clientsP,
    clientsP.then(loadMoney),
    listActiveDiscounts(client.id),
    listIdeationItems(client.id),
    listRoadmapItems(client.id),
    listMeetingSummaries(client.id),
    listToolStackItems(client.id),
    listServiceItems(),
    listClientTeamMembers(client.id),
    listClientHealthChannels(client.id),
    listClientActivityFeed(client.id),
    listEmailsForClient(client.id),
    client.companyId ? getCompany(client.companyId) : Promise.resolve(null),
    listPendingAccessRequests(client.id),
    listGrayscaleRequests(client.id),
    getDefaultOnboardingInviteEmail(client.name),
  ]);
  const me = clients.find((c) => c.id === client.id);
  if (!me) notFound();

  const flashKey = Object.keys(FLASH).find((k) => sp[k]);
  const flash = flashKey
    ? { tone: FLASH[flashKey][0], text: sp[flashKey] && sp[flashKey] !== "1" ? `${FLASH[flashKey][1]}: ${sp[flashKey]}` : FLASH[flashKey][1] }
    : null;
  // A second param can ride along (approved, but the password email failed).
  const flash2 = flashKey === "accessRequestApproved" && sp.passwordEmailError ? { tone: "bad", text: `Couldn't send the password email: ${sp.passwordEmailError}` } : null;

  const contacts = companyData?.contacts ?? [];
  const awaiting = portalUsers.find((u) => !u.googleUid);

  const profile = {
    companyId: client.companyId,
    welcome: client.portalWelcomeMessage ?? "",
    driveUrl: client.driveFolderUrl ?? "",
    lookerUrl: client.lookerStudioUrl ?? "",
    taskListLinked: !!client.googleTaskListId,
    hidden: client.hiddenFromTaskView,
    companyName: companyData?.company.name ?? client.name,
    postalAddress: companyData?.company.postalAddress ?? "",
    features: features.filter((f) => f.enabled).map((f) => f.featureKey as string),
    accessRequests: pendingAccessRequests.map((r) => ({ id: r.id, email: r.email, name: r.displayName ?? "", at: nz(r.requestedAt).slice(0, 10) })),
    portalUsers: portalUsers.map((u) => {
      const invite = onboardingInvites.find((i) => i.email === u.email);
      return { id: u.id, email: u.email, name: u.displayName ?? "", active: !!u.googleUid, inviteDaysLeft: invite ? daysUntil(invite.expiresAt) : null };
    }),
    invite: {
      to: awaiting?.email ?? "",
      subject: defaultInviteEmail.subject,
      previewHtml: wrapPortalInviteEmailHtml({
        clientName: client.name,
        introHtml: sanitizeEmailHtml(defaultInviteEmail.body),
        ctaHref: `${appUrl()}/onboard/preview-token`,
        expiresInDays: 14,
      }),
      resend: !!(awaiting && onboardingInvites.some((i) => i.email === awaiting.email)),
    },
    documents: documents.map((d) => ({ id: d.id, title: d.title ?? d.docType, type: d.docType, date: d.documentDate ?? "", external: !!d.externalUrl })),
    roadmap: roadmap.map((r) => ({ id: r.id, title: r.title, narrative: r.description ?? "", target: r.targetDate ?? "", status: r.status })),
    ideas: ideas.map((i) => ({ id: i.id, title: i.title, status: i.status })),
    tools: tools.map((t) => ({ id: t.id, name: t.toolName, category: t.category ?? "", status: t.status })),
    referrals: referrals.map((r) => ({ id: r.id, name: r.referredName, status: r.status })),
    activeDiscount: activeDiscounts.reduce((sum, d) => sum + Number(d.discountPercent), 0),
    grayscaleRequests: grayscaleRequests.map((r) => ({ id: r.id, product: r.products.join(", "), note: r.note ?? "", at: nz(r.createdAt).slice(0, 10), status: r.status })),
    deals: (companyData?.deals ?? []).map((d) => ({ id: d.id, label: d.packageTier || d.nextAction, value: Number(d.valueNzd ?? 0), stage: d.stage, next: d.nextActionDate })),
    contacts: contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
    catalogue: catalogue.map((s) => ({ id: s.id, label: `${s.moduleCode} — ${s.deliverable}` })),
    team: teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role ?? "", email: m.contactEmail ?? "" })),
    channels: healthChannels.map((c) => ({ id: c.id, name: c.channelName, status: c.status, label: c.statusLabel })),
    emails: recentEmails.map((e) => ({
      id: e.id,
      subject: e.subject || "(no subject)",
      from: `${e.contactFirstName ?? ""} ${e.contactLastName ?? ""}`.trim(),
      direction: e.direction,
      at: nz(e.sentAt).slice(0, 10),
    })),
    activity: activityFeed.map((a) => ({ id: a.id, at: nz(a.occurredAt), body: a.body })),
    meetings: meetings.map((m) => ({ id: m.id, title: m.title, at: nz(m.occurredAt).slice(0, 10), html: renderTrustedMarkdown(m.summary) })),
    flash: [flash, flash2].filter(Boolean),
    initialTab: flashKey ? "access" : "overview",
  };

  return (
    <StoreData data={{ clients: [me], oneOffs: money.oneOffs.filter((p) => p.clientId === client.id), profile }}>
      <ClientProfile id={client.id} credentials={<CredentialsList clientId={client.id} />} />
    </StoreData>
  );
}
