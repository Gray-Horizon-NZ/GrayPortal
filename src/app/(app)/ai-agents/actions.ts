"use server";
import { revalidatePath } from "next/cache";
import { createAiAgent, updateAiAgent, softDeleteAiAgent, AiAgentStatus } from "@/lib/dal/aiAgents";

export async function createAiAgentAction(formData: FormData) {
  await createAiAgent({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    status: AiAgentStatus.parse(formData.get("status")),
  });
  revalidatePath("/ai-agents");
}

export async function updateAiAgentStatusAction(id: string, status: string) {
  await updateAiAgent(id, { status: AiAgentStatus.parse(status) });
  revalidatePath("/ai-agents");
}

export async function deleteAiAgentAction(id: string) {
  await softDeleteAiAgent(id);
  revalidatePath("/ai-agents");
}
