"use server";
import { redirect } from "next/navigation";
import { onboardClient } from "@/lib/dal/onboarding";
import { PORTAL_FEATURE_KEYS, type PortalFeatureKey } from "@/lib/dal/clients";

export async function onboardClientAction(formData: FormData) {
  const enabledFeatures = PORTAL_FEATURE_KEYS.filter((key) => formData.get(`feature:${key}`) === "on") as PortalFeatureKey[];

  const result = await onboardClient({
    company: {
      name: String(formData.get("companyName") ?? ""),
      industry: String(formData.get("industry") ?? "") || undefined,
      region: String(formData.get("region") ?? "") || undefined,
      website: String(formData.get("website") ?? "") || undefined,
      source: String(formData.get("source") ?? ""),
    },
    client: {
      nextPaymentDate: String(formData.get("nextPaymentDate") ?? "") || undefined,
    },
    portalInvite: {
      email: String(formData.get("email") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
    },
    enabledFeatures,
  });

  redirect(`/clients/${(result.client as { id: string }).id}`);
}
