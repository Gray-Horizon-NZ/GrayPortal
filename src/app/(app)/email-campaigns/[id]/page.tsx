import { redirect, notFound } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { getCampaign, listCampaignRecipients } from "@/lib/dal/campaigns";
import { StoreData } from "@/terminal/store";
import { CampaignDetail } from "@/terminal/screens/Comms";

const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d) : "");

// One campaign: counts, recipients and the draft's send/cancel/edit
// controls, in the concept's parts (the concept has no detail screen).
export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const { id } = await params;
  const [campaign, recipients] = await Promise.all([getCampaign(id), listCampaignRecipients(id)]);
  if (!campaign) notFound();
  return (
    <StoreData
      data={{
        campaign: {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          body: campaign.htmlBody,
          audience: campaign.audience,
          status: campaign.status,
          // ISO (UTC), as the draft action reads the datetime-local field back.
          scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
        },
        recipients: recipients.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, status: r.status, error: r.error ?? "", opened: day(r.openedAt) })),
      }}
    >
      <CampaignDetail />
    </StoreData>
  );
}
