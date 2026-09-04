"use server";
import { submitGrayscaleRequest } from "@/lib/dal/grayscaleRequests";
import { absoluteOriginFromHeaders } from "@/lib/http";

export async function submitGrayscaleRequestAction(products: string[], note: string): Promise<void> {
  const appOrigin = await absoluteOriginFromHeaders();
  await submitGrayscaleRequest({ products, note: note || undefined, appOrigin });
}
