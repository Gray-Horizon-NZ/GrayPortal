"use server";
import { revalidatePath } from "next/cache";
import {
  createIdeationItem,
  updateIdeationItem,
  softDeleteIdeationItem,
  IdeationStatus,
  InternalIdeationCategory,
} from "@/lib/dal/ideation";

export async function createInternalIdeationItemAction(formData: FormData) {
  await createIdeationItem({
    clientId: null,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    status: "new",
    category: InternalIdeationCategory.parse(formData.get("category")),
  });
  revalidatePath("/ideation");
}

export async function updateIdeationItemStatusAction(id: string, status: string) {
  await updateIdeationItem(id, { status: IdeationStatus.parse(status) });
  revalidatePath("/ideation");
}

export async function deleteInternalIdeationItemAction(id: string) {
  await softDeleteIdeationItem(id);
  revalidatePath("/ideation");
}
