"use server";
import { revalidatePath } from "next/cache";
import { createRecurringTemplate, softDeleteRecurringTemplate, RecurrenceInterval } from "@/lib/dal/recurringTemplates";

export async function createRecurringTemplateAction(formData: FormData) {
  await createRecurringTemplate({
    name: String(formData.get("name") ?? ""),
    interval: RecurrenceInterval.parse(String(formData.get("interval") ?? "monthly")),
    intervalDays: formData.get("intervalDays") ? Number(formData.get("intervalDays")) : undefined,
    nextDueDate: String(formData.get("nextDueDate") ?? ""),
    taskTitle: String(formData.get("taskTitle") ?? ""),
  });
  revalidatePath("/reminders");
}

export async function softDeleteRecurringTemplateAction(id: string) {
  await softDeleteRecurringTemplate(id);
  revalidatePath("/reminders");
}
