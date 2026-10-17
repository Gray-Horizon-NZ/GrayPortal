"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { markMyMonthDelivered, submitMyInvoiceRef, logMyHours, updateMyProfile, setMyTaskStatus } from "@/lib/dal/contractorPortal";

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function nul(fd: FormData, k: string) {
  const v = str(fd, k);
  return v === "" ? null : v;
}
function back(fd: FormData) {
  const b = str(fd, "_back");
  return b.startsWith("/work") ? b : "/work";
}
function withParam(path: string, key: string, value: string) {
  const [base, query = ""] = path.split("?");
  const p = new URLSearchParams(query);
  p.delete("ok");
  p.delete("error");
  p.set(key, value);
  return `${base}?${p.toString()}`;
}

async function act(fd: FormData, fn: () => Promise<unknown>, ok?: string) {
  const to = back(fd);
  let error: string | null = null;
  try {
    await fn();
  } catch (err) {
    error = err instanceof Error ? err.message.replace(/^.*?ERROR:\s*/, "") : "Something went wrong";
  }
  revalidatePath("/work", "layout");
  if (error) redirect(withParam(to, "error", error));
  redirect(ok ? withParam(to, "ok", ok) : to);
}

export async function markDeliveredAction(fd: FormData) {
  await act(fd, () => markMyMonthDelivered(str(fd, "cycleId")), "Marked as delivered. Max will review it.");
}

export async function submitInvoiceAction(fd: FormData) {
  await act(fd, () => submitMyInvoiceRef(str(fd, "cycleId"), str(fd, "ref")), "Invoice number saved");
}

export async function logHoursAction(fd: FormData) {
  await act(fd, () => logMyHours({ engagementId: nul(fd, "engagementId"), workDate: str(fd, "workDate"), hours: str(fd, "hours"), note: nul(fd, "note") }), "Hours logged");
}

export async function updateProfileAction(fd: FormData) {
  await act(
    fd,
    () =>
      updateMyProfile({
        publicTitle: nul(fd, "publicTitle"),
        bio: nul(fd, "bio"),
        photoUrl: nul(fd, "photoUrl"),
        phone: nul(fd, "phone"),
        location: nul(fd, "location"),
        portfolioUrl: nul(fd, "portfolioUrl"),
        skills: str(fd, "skills"),
      }),
    "Profile saved"
  );
}

export async function setTaskStatusAction(fd: FormData) {
  await act(fd, () => setMyTaskStatus(str(fd, "id"), str(fd, "status")));
}
