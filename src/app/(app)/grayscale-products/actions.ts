"use server";
import { revalidatePath } from "next/cache";
import { createGrayscaleProduct, updateGrayscaleProduct, softDeleteGrayscaleProduct } from "@/lib/dal/grayscaleProducts";

export async function createGrayscaleProductAction(formData: FormData) {
  const sortOrder = formData.get("sortOrder");
  const monthlyPriceNzd = formData.get("monthlyPriceNzd");
  await createGrayscaleProduct({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    monthlyPriceNzd: monthlyPriceNzd ? String(monthlyPriceNzd) : undefined,
    sortOrder: sortOrder ? Number(sortOrder) : undefined,
  });
  revalidatePath("/grayscale-products");
}

export async function updateGrayscaleProductAction(id: string, formData: FormData) {
  const sortOrder = formData.get("sortOrder");
  const monthlyPriceNzd = formData.get("monthlyPriceNzd");
  await updateGrayscaleProduct(id, {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    monthlyPriceNzd: monthlyPriceNzd ? String(monthlyPriceNzd) : undefined,
    sortOrder: sortOrder ? Number(sortOrder) : undefined,
  });
  revalidatePath("/grayscale-products");
}

export async function softDeleteGrayscaleProductAction(id: string) {
  await softDeleteGrayscaleProduct(id);
  revalidatePath("/grayscale-products");
}
