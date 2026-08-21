"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, updateClient, softDeleteClient, setClientFeature, uploadClientLogo, type PortalFeatureKey } from "@/lib/dal/clients";
import { createReferral, setReferralStatus, convertReferral } from "@/lib/dal/referrals";
import { inviteClientUser } from "@/lib/dal/users";
import { uploadDocument, linkDocument, DocType } from "@/lib/dal/documents";
import type { z } from "zod";
import { ReferralStatus } from "@/lib/dal/referrals";
import { createIdeationItem, softDeleteIdeationItem } from "@/lib/dal/ideation";
import { createRoadmapItem, softDeleteRoadmapItem } from "@/lib/dal/roadmap";
import { createMeetingSummary, softDeleteMeetingSummary } from "@/lib/dal/meetingSummaries";
import { createToolStackItem, softDeleteToolStackItem } from "@/lib/dal/toolStack";
import { addClientService, removeClientService, updateClientServicePrice } from "@/lib/dal/clientServices";
import { addClientMetricsSnapshot, softDeleteClientMetricsSnapshot } from "@/lib/dal/clientMetrics";
import { addClientTeamMember, softDeleteClientTeamMember } from "@/lib/dal/clientTeam";
import { addClientHealthChannel, softDeleteClientHealthChannel } from "@/lib/dal/clientHealthChannels";
import { addClientActivityFeedEntry, softDeleteClientActivityFeedEntry } from "@/lib/dal/clientActivityFeed";
import { monthInputToDate } from "@/lib/date";

export async function createClientAction(formData: FormData) {
  const client = await createClient({
    name: String(formData.get("name") ?? ""),
    nextPaymentDate: monthInputToDate(String(formData.get("nextPaymentDate") ?? "")),
  });
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function deleteClientAction(id: string) {
  await softDeleteClient(id);
  revalidatePath("/clients");
  redirect("/clients");
}

export async function toggleFeatureAction(clientId: string, key: PortalFeatureKey, enabled: boolean) {
  await setClientFeature(clientId, key, enabled);
  revalidatePath(`/clients/${clientId}`);
}

export async function createReferralAction(clientId: string, formData: FormData) {
  await createReferral({
    clientId,
    referredName: String(formData.get("referredName") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function setReferralStatusAction(id: string, clientId: string, status: z.infer<typeof ReferralStatus>) {
  await setReferralStatus(id, status);
  revalidatePath(`/clients/${clientId}`);
}

export async function convertReferralAction(id: string, clientId: string) {
  await convertReferral(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientEmbedsAction(clientId: string, formData: FormData) {
  await updateClient(clientId, {
    driveFolderUrl: String(formData.get("driveFolderUrl") ?? "") || undefined,
    lookerStudioUrl: String(formData.get("lookerStudioUrl") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function updatePortalWelcomeAction(clientId: string, formData: FormData) {
  await updateClient(clientId, {
    portalWelcomeMessage: String(formData.get("portalWelcomeMessage") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function uploadClientLogoAction(clientId: string, formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A logo image is required");
  }
  await uploadClientLogo(clientId, file);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function createIdeationItemAction(clientId: string, formData: FormData) {
  await createIdeationItem({
    clientId,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    status: "new",
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteIdeationItemAction(id: string, clientId: string) {
  await softDeleteIdeationItem(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function createRoadmapItemAction(clientId: string, formData: FormData) {
  await createRoadmapItem({
    clientId,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    targetDate: String(formData.get("targetDate") ?? "") || undefined,
    status: "planned",
    sortOrder: 0,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteRoadmapItemAction(id: string, clientId: string) {
  await softDeleteRoadmapItem(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function createMeetingSummaryAction(clientId: string, formData: FormData) {
  await createMeetingSummary({
    clientId,
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteMeetingSummaryAction(id: string, clientId: string) {
  await softDeleteMeetingSummary(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function createToolStackItemAction(clientId: string, formData: FormData) {
  await createToolStackItem({
    clientId,
    toolName: String(formData.get("toolName") ?? ""),
    category: String(formData.get("category") ?? "") || undefined,
    status: String(formData.get("status") ?? "current") as "current" | "planned",
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteToolStackItemAction(id: string, clientId: string) {
  await softDeleteToolStackItem(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function inviteClientAction(clientId: string, formData: FormData) {
  try {
    await inviteClientUser({
      clientId,
      email: String(formData.get("email") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    redirect(`/clients/${clientId}?inviteError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?invited=1`);
}

export async function addClientServiceAction(clientId: string, formData: FormData) {
  await addClientService({
    clientId,
    serviceItemId: String(formData.get("serviceItemId") ?? ""),
    customSetupPrice: String(formData.get("customSetupPrice") ?? "") || undefined,
    customMonthlyPrice: String(formData.get("customMonthlyPrice") ?? "") || undefined,
    discountPercent: String(formData.get("discountPercent") ?? "") || undefined,
    status: "active",
    startedOn: String(formData.get("startedOn") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function removeClientServiceAction(id: string, clientId: string) {
  await removeClientService(id);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function updateClientServicePriceAction(id: string, clientId: string, formData: FormData) {
  await updateClientServicePrice(id, {
    customMonthlyPrice: String(formData.get("customMonthlyPrice") ?? "") || undefined,
    customSetupPrice: String(formData.get("customSetupPrice") ?? "") || undefined,
    discountPercent: String(formData.get("discountPercent") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function updateClientDiscountAction(clientId: string, formData: FormData) {
  await updateClient(clientId, {
    overallDiscountPercent: String(formData.get("overallDiscountPercent") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal");
}

export async function addClientMetricsSnapshotAction(clientId: string, formData: FormData) {
  await addClientMetricsSnapshot({
    clientId,
    periodLabel: String(formData.get("periodLabel") ?? ""),
    adSpend: String(formData.get("adSpend") ?? "") || undefined,
    leadsGenerated: formData.get("leadsGenerated") ? Number(formData.get("leadsGenerated")) : undefined,
    roas: String(formData.get("roas") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientMetricsSnapshotAction(id: string, clientId: string) {
  await softDeleteClientMetricsSnapshot(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function addClientTeamMemberAction(clientId: string, formData: FormData) {
  await addClientTeamMember({
    clientId,
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? "") || undefined,
    contactEmail: String(formData.get("contactEmail") ?? "") || undefined,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientTeamMemberAction(id: string, clientId: string) {
  await softDeleteClientTeamMember(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function addClientHealthChannelAction(clientId: string, formData: FormData) {
  await addClientHealthChannel({
    clientId,
    channelName: String(formData.get("channelName") ?? ""),
    status: String(formData.get("status") ?? "ok") as "ok" | "warn" | "off",
    statusLabel: String(formData.get("statusLabel") ?? ""),
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientHealthChannelAction(id: string, clientId: string) {
  await softDeleteClientHealthChannel(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function addClientActivityFeedEntryAction(clientId: string, formData: FormData) {
  await addClientActivityFeedEntry({
    clientId,
    body: String(formData.get("body") ?? ""),
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientActivityFeedEntryAction(id: string, clientId: string) {
  await softDeleteClientActivityFeedEntry(id);
  revalidatePath(`/clients/${clientId}`);
}

export async function uploadDocumentAction(clientId: string, formData: FormData) {
  const docType = DocType.parse(String(formData.get("docType") ?? "other"));
  const companyId = String(formData.get("companyId") ?? "") || undefined;
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  const file = formData.get("file");

  if (externalUrl) {
    await linkDocument({ clientId, companyId, docType }, externalUrl);
  } else if (file instanceof File && file.size > 0) {
    await uploadDocument({ clientId, companyId, docType }, file);
  } else {
    throw new Error("A file or a URL is required");
  }
  revalidatePath(`/clients/${clientId}`);
}
