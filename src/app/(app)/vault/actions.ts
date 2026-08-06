"use server";
import { revalidatePath } from "next/cache";
import {
  createCredential,
  rotateCredentialSecret,
  updateCredentialMeta,
  softDeleteCredential,
  revealCredential,
} from "@/lib/dal/credentials";
import { generateMop, downloadMop } from "@/lib/dal/mop";

function revalidateFor(clientId: string | null) {
  revalidatePath(clientId ? `/clients/${clientId}` : "/vault");
}

export async function createCredentialAction(clientId: string | null, formData: FormData) {
  await createCredential({
    clientId,
    label: String(formData.get("label") ?? ""),
    username: String(formData.get("username") ?? "") || undefined,
    secret: String(formData.get("secret") ?? ""),
    url: String(formData.get("url") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidateFor(clientId);
}

export async function rotateCredentialAction(id: string, clientId: string | null, formData: FormData) {
  await rotateCredentialSecret(id, String(formData.get("secret") ?? ""));
  revalidateFor(clientId);
}

export async function updateCredentialMetaAction(id: string, clientId: string | null, formData: FormData) {
  await updateCredentialMeta(id, {
    label: String(formData.get("label") ?? "") || undefined,
    username: String(formData.get("username") ?? "") || undefined,
    url: String(formData.get("url") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidateFor(clientId);
}

export async function softDeleteCredentialAction(id: string, clientId: string | null) {
  await softDeleteCredential(id);
  revalidateFor(clientId);
}

// Not a <form action> — called directly from RevealButton.tsx after it
// establishes a vault-verified session, so it can return the plaintext
// secret to render client-side rather than redirecting/revalidating.
export async function revealCredentialAction(id: string) {
  return revealCredential(id);
}

export async function generateMopAction() {
  const result = await generateMop();
  revalidatePath("/vault");
  return result;
}

export async function downloadMopAction() {
  return downloadMop();
}
