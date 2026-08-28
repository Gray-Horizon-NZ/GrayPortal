"use server";
import { submitGrayscaleRequest } from "@/lib/dal/grayscaleRequests";

export async function submitGrayscaleRequestAction(products: string[], note: string): Promise<void> {
  await submitGrayscaleRequest({ products, note: note || undefined });
}
