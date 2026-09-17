"use server";
import { submitGrayscaleRequest } from "@/lib/dal/grayscaleRequests";
import { absoluteOriginFromHeaders } from "@/lib/http";
import { markPortalTourSeen } from "@/lib/dal/portal";

export async function submitGrayscaleRequestAction(products: string[], note: string): Promise<void> {
  const appOrigin = await absoluteOriginFromHeaders();
  await submitGrayscaleRequest({ products, note: note || undefined, appOrigin });
}

export async function markPortalTourSeenAction(): Promise<void> {
  await markPortalTourSeen();
}
