"use server";
// Every Incrementum form posts here. Each action is a thin wrapper: parse
// the form, call the DAL (where all rules live), revalidate the whole
// Incrementum tree, and bounce back with ?ok= / ?error=. Forms carry a
// hidden "_back" path so one action serves several pages.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as planning from "@/lib/dal/incrementum/planning";
import * as itasks from "@/lib/dal/incrementum/tasks";
import * as services from "@/lib/dal/incrementum/services";
import * as contractorsDal from "@/lib/dal/incrementum/contractors";
import * as leads from "@/lib/dal/incrementum/leads";
import * as engagements from "@/lib/dal/incrementum/engagements";
import * as outreach from "@/lib/dal/incrementum/outreach";
import * as needs from "@/lib/dal/incrementum/needs";
import * as grayportal from "@/lib/dal/incrementum/grayportal";
import { setTaskStatus, deleteTask } from "@/lib/dal/tasks";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function nul(fd: FormData, k: string): string | null {
  const v = str(fd, k);
  return v === "" ? null : v;
}
function bool(fd: FormData, k: string): boolean {
  const v = fd.get(k);
  return v === "on" || v === "true" || v === "1";
}

function backPath(fd: FormData, fallback = "/incrementum"): string {
  const b = str(fd, "_back");
  return b.startsWith("/incrementum") ? b : fallback;
}

function withParam(path: string, key: string, value: string) {
  const [beforeHash, hash] = path.split("#");
  const [base, query = ""] = beforeHash.split("?");
  const params = new URLSearchParams(query);
  params.delete("ok");
  params.delete("error");
  params.set(key, value);
  return `${base}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

function message(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err && Array.isArray((err as { issues: unknown[] }).issues)) {
    const first = (err as { issues: { path?: unknown[]; message?: string }[] }).issues[0];
    return `${first?.path?.join(".") ?? "Field"}: ${first?.message ?? "invalid"}`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

/** redirect() throws, so it must stay outside the try. */
async function act(fd: FormData, fn: () => Promise<unknown>, ok?: string, goTo?: (result: unknown) => string | null) {
  const back = backPath(fd);
  let error: string | null = null;
  let result: unknown;
  try {
    result = await fn();
  } catch (err) {
    error = message(err);
  }
  revalidatePath("/incrementum", "layout");
  revalidatePath("/tasks");
  revalidatePath("/");
  if (error) redirect(withParam(back, "error", error));
  const target = goTo?.(result) ?? back;
  if (ok) redirect(withParam(target, "ok", ok));
  // No message and the target is the page the form sits on: let the
  // revalidation above re-render it in place. Redirecting to the same URL
  // plus a #hash (e.g. waive / remove on a package line) is a hash-only
  // navigation to the router, which left the old rows on screen.
  if (await isCurrentPage(target)) return;
  redirect(target);
}

async function isCurrentPage(target: string): Promise<boolean> {
  const referer = (await headers()).get("referer");
  if (!referer) return false;
  try {
    const current = new URL(referer);
    const next = new URL(target, current.origin);
    return current.pathname === next.pathname && current.search === next.search;
  } catch {
    return false;
  }
}

// --- Settings ---------------------------------------------------------------
export async function saveSettingsAction(fd: FormData) {
  // Each Settings view posts only its own fields; absent keys stay as they are.
  const input: Record<string, unknown> = {};
  for (const k of ["defaultMarkupPct", "freedomTarget", "freedomGold", "freedomDiamond", "adBudgetTotal", "defaultSlotsPerContractor", "launchDate", "homeModeOverride"]) {
    if (fd.has(k)) input[k] = nul(fd, k);
  }
  for (const k of ["responseTargetMinutes", "defaultRecruitDays", "minBench", "lowSlotsWarn"]) {
    if (fd.has(k) && str(fd, k) !== "") input[k] = Number(str(fd, k));
  }
  await act(fd, () => planning.updateIncrementumSettings(input as never), "Settings saved");
}

// Customise Home: the switches post on change, the arrows post `move=<key>:up|down`.
export async function saveHomeLayoutAction(fd: FormData) {
  const order = str(fd, "order").split(",").filter(Boolean);
  const [moveKey, dir] = str(fd, "move").split(":");
  const i = order.indexOf(moveKey);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < order.length) [order[i], order[j]] = [order[j], order[i]];
  const hidden = order.filter((k) => !bool(fd, `show_${k}`));
  await act(fd, () => planning.saveHomeLayout({ order, hidden }));
}

export async function resetHomeLayoutAction(fd: FormData) {
  await act(fd, () => planning.saveHomeLayout(null), "Home layout reset");
}

export async function dismissNextMoveAction(fd: FormData) {
  await act(fd, () => planning.dismissNextMove(str(fd, "moveKey"), nul(fd, "note")));
}

export async function setLaunchDateAction(fd: FormData) {
  const date = bool(fd, "clear") ? null : nul(fd, "launchDate");
  await act(fd, () => planning.setLaunchDate(date), date ? "Ads live date set" : "Ads live date cleared");
}

export async function saveCapacityThresholdsAction(fd: FormData) {
  await act(
    fd,
    () =>
      planning.saveCapacityThresholds({
        defaultSlotsPerContractor: nul(fd, "defaultSlotsPerContractor"),
        minBench: str(fd, "minBench") || 2,
        lowSlotsWarn: str(fd, "lowSlotsWarn") || 1,
        defaultRecruitDays: str(fd, "defaultRecruitDays") || 21,
      }),
    "Thresholds saved"
  );
}

export async function markAccessReviewedAction(fd: FormData) {
  await act(fd, () => contractorsDal.markContractorAccessReviewed(bool(fd, "reviewed")), bool(fd, "reviewed") ? "Contractor access marked as reviewed" : "Review cleared");
}

// --- Launch -----------------------------------------------------------------
export async function updateLaunchItemAction(fd: FormData) {
  const status = nul(fd, "status");
  await act(fd, () =>
    planning.updateLaunchItem(str(fd, "id"), {
      ...(status ? { status: status as never } : {}),
      dueDate: nul(fd, "dueDate"),
      notes: nul(fd, "notes"),
      evidenceUrl: nul(fd, "evidenceUrl"),
      naReason: nul(fd, "naReason"),
    })
  );
}

export async function setLaunchStatusAction(fd: FormData) {
  await act(fd, () => planning.updateLaunchItem(str(fd, "id"), { status: str(fd, "status") as never, naReason: nul(fd, "naReason") }));
}

export async function createLaunchItemAction(fd: FormData) {
  await act(fd, () => planning.createLaunchItem({ gate: str(fd, "gate") as never, title: str(fd, "title"), detail: nul(fd, "detail"), critical: bool(fd, "critical"), dueDate: nul(fd, "dueDate") }), "Item added");
}

export async function deleteLaunchItemAction(fd: FormData) {
  await act(fd, () => planning.deleteLaunchItem(str(fd, "id")), "Item removed");
}

export async function makeTaskFromLaunchAction(fd: FormData) {
  await act(fd, () => planning.makeTaskFromLaunchItem(str(fd, "id"), nul(fd, "listId")), "Task created");
}

// --- Phases / roadmap ---------------------------------------------------------
export async function advancePhaseAction(fd: FormData) {
  await act(fd, () => planning.advancePhase(str(fd, "phaseId"), str(fd, "retro")), "Phase advanced");
}

export async function updatePhaseAction(fd: FormData) {
  await act(
    fd,
    () =>
      planning.updatePhase(str(fd, "id"), {
        name: str(fd, "name"),
        purpose: nul(fd, "purpose"),
        adBudget: nul(fd, "adBudget"),
        services: nul(fd, "services"),
        clientMin: nul(fd, "clientMin") as never,
        clientMax: nul(fd, "clientMax") as never,
        contractorTarget: nul(fd, "contractorTarget") as never,
        targetDate: nul(fd, "targetDate"),
      }),
    "Phase saved"
  );
}

export async function createCriterionAction(fd: FormData) {
  await act(fd, () =>
    planning.createCriterion({ phaseId: str(fd, "phaseId"), label: str(fd, "label"), metricKey: nul(fd, "metricKey"), comparator: (str(fd, "comparator") || "gte") as "gte" | "lte", target: nul(fd, "target") })
  );
}

export async function updateCriterionAction(fd: FormData) {
  await act(fd, () => planning.updateCriterion(str(fd, "id"), { target: nul(fd, "target"), label: str(fd, "label") || undefined }), "Criterion saved");
}

export async function toggleCriterionAction(fd: FormData) {
  await act(fd, () => planning.setCriterionManualDone(str(fd, "id"), bool(fd, "done")));
}

export async function deleteCriterionAction(fd: FormData) {
  await act(fd, () => planning.deleteCriterion(str(fd, "id")));
}

export async function createMilestoneAction(fd: FormData) {
  await act(fd, () => planning.createMilestone({ phaseId: nul(fd, "phaseId"), title: str(fd, "title"), dueDate: nul(fd, "dueDate") }));
}

export async function toggleMilestoneAction(fd: FormData) {
  await act(fd, () => planning.setMilestoneDone(str(fd, "id"), bool(fd, "done")));
}

export async function deleteMilestoneAction(fd: FormData) {
  await act(fd, () => planning.deleteMilestone(str(fd, "id")));
}

// --- Goals ------------------------------------------------------------------
export async function createGoalAction(fd: FormData) {
  await act(
    fd,
    () =>
      planning.createGoal({
        title: str(fd, "title"),
        metricKey: nul(fd, "metricKey"),
        comparator: (str(fd, "comparator") || "gte") as "gte" | "lte",
        target: nul(fd, "target"),
        periodStart: nul(fd, "periodStart"),
        periodEnd: nul(fd, "periodEnd"),
        phaseId: nul(fd, "phaseId"),
      }),
    "Goal added"
  );
}

export async function updateGoalAction(fd: FormData) {
  await act(
    fd,
    () => planning.updateGoal(str(fd, "id"), { title: str(fd, "title"), target: nul(fd, "target"), periodStart: nul(fd, "periodStart"), periodEnd: nul(fd, "periodEnd") }),
    "Goal saved"
  );
}

export async function toggleGoalAction(fd: FormData) {
  await act(fd, () => planning.setGoalManualDone(str(fd, "id"), bool(fd, "done")));
}

export async function deleteGoalAction(fd: FormData) {
  await act(fd, () => planning.deleteGoal(str(fd, "id")), "Goal removed");
}

// --- Experiments ----------------------------------------------------------------
export async function createExperimentAction(fd: FormData) {
  await act(
    fd,
    () =>
      planning.createExperiment({
        type: (str(fd, "type") || "change") as never,
        title: str(fd, "title"),
        body: nul(fd, "body"),
        metricKey: nul(fd, "metricKey"),
        passLine: nul(fd, "passLine"),
        killLine: nul(fd, "killLine"),
        startedAt: nul(fd, "startedAt"),
        endsAt: nul(fd, "endsAt"),
      }),
    "Logged"
  );
}

export async function recordExperimentResultAction(fd: FormData) {
  await act(fd, () => planning.recordExperimentResult(str(fd, "id"), { result: nul(fd, "result"), verdict: nul(fd, "verdict") }), "Result saved");
}

export async function deleteExperimentAction(fd: FormData) {
  await act(fd, () => planning.deleteExperiment(str(fd, "id")));
}

// --- Weekly review ------------------------------------------------------------
export async function completeReviewAction(fd: FormData) {
  await act(
    fd,
    () =>
      planning.completeWeeklyReview({
        notes: nul(fd, "notes"),
        wins: nul(fd, "wins"),
        actions: [str(fd, "action1"), str(fd, "action2"), str(fd, "action3")],
      }),
    "Review saved. Your actions are on the Incrementum main list."
  );
}

// --- Playbooks -----------------------------------------------------------------
export async function createPlaybookAction(fd: FormData) {
  await act(
    fd,
    () => planning.createPlaybook({ title: str(fd, "title"), serviceId: nul(fd, "serviceId"), body: str(fd, "body") }),
    "Playbook created",
    (r) => `/incrementum/playbooks/${(r as { id: string }).id}`
  );
}

export async function updatePlaybookAction(fd: FormData) {
  await act(fd, () => planning.updatePlaybook(str(fd, "id"), { title: str(fd, "title"), body: String(fd.get("body") ?? ""), serviceId: nul(fd, "serviceId") }), "Playbook saved");
}

export async function deletePlaybookAction(fd: FormData) {
  await act(fd, () => planning.deletePlaybook(str(fd, "id")), "Playbook removed", () => "/incrementum/playbooks");
}

// --- Ads + hours -----------------------------------------------------------------
export async function saveAdMonthAction(fd: FormData) {
  await act(
    fd,
    () => planning.upsertAdMonth({ month: str(fd, "month"), spend: nul(fd, "spend"), clicks: Number(str(fd, "clicks") || 0), impressions: Number(str(fd, "impressions") || 0), notes: nul(fd, "notes") }),
    "Ad figures saved"
  );
}

export async function logHoursAction(fd: FormData) {
  await act(fd, () => planning.logHours({ engagementId: nul(fd, "engagementId"), workDate: str(fd, "workDate"), hours: str(fd, "hours"), note: nul(fd, "note") }), "Hours logged");
}

export async function deleteHoursAction(fd: FormData) {
  await act(fd, () => planning.deleteHours(str(fd, "id")));
}

// --- Tasks ------------------------------------------------------------------
export async function createIncTaskAction(fd: FormData) {
  await act(fd, () => itasks.createIncrementumTask({ title: str(fd, "title"), dueDate: nul(fd, "dueDate"), listId: nul(fd, "listId"), priority: bool(fd, "high") ? "high" : "normal" }));
}

export async function setIncTaskStatusAction(fd: FormData) {
  await act(fd, () => setTaskStatus(str(fd, "id"), str(fd, "status") as never));
}

export async function moveIncTaskAction(fd: FormData) {
  await act(fd, () => itasks.moveIncrementumTask(str(fd, "id"), nul(fd, "listId")));
}

export async function updateIncTaskAction(fd: FormData) {
  await act(fd, () => itasks.updateIncrementumTask(str(fd, "id"), { title: str(fd, "title") || undefined, dueDate: nul(fd, "dueDate"), priority: bool(fd, "high") ? "high" : "normal" }));
}

/** The task row's one edit form: title, due, priority, and the list it sits on. */
export async function saveIncTaskAction(fd: FormData) {
  const listId = nul(fd, "listId");
  const moved = listId !== nul(fd, "currentListId");
  await act(
    fd,
    async () => {
      await itasks.updateIncrementumTask(str(fd, "id"), { title: str(fd, "title") || undefined, dueDate: nul(fd, "dueDate"), priority: bool(fd, "high") ? "high" : "normal" });
      if (moved) await itasks.moveIncrementumTask(str(fd, "id"), listId);
    },
    moved ? "Saved and moved" : undefined
  );
}

export async function deleteIncTaskAction(fd: FormData) {
  await act(fd, () => deleteTask(str(fd, "id")));
}

export async function createTaskListAction(fd: FormData) {
  await act(fd, () => itasks.createTaskList(str(fd, "name")), "Sub-list added");
}

export async function renameTaskListAction(fd: FormData) {
  await act(fd, () => itasks.renameTaskList(str(fd, "id"), str(fd, "name")));
}

export async function archiveTaskListAction(fd: FormData) {
  await act(fd, () => itasks.setTaskListArchived(str(fd, "id"), bool(fd, "archived")));
}

export async function deleteTaskListAction(fd: FormData) {
  await act(fd, () => itasks.deleteTaskList(str(fd, "id")), "Sub-list removed. Its tasks moved to the main list.");
}

// --- Services & packages ------------------------------------------------------------
function serviceFromForm(fd: FormData) {
  return {
    name: str(fd, "name"),
    serviceItemId: nul(fd, "serviceItemId"),
    billing: (str(fd, "billing") || "monthly") as never,
    quoteBasis: (str(fd, "quoteBasis") || "highest") as never,
    expectedQuote: nul(fd, "expectedQuote"),
    markupPct: nul(fd, "markupPct"),
    catalogueFloor: bool(fd, "catalogueFloor"),
    manualPrice: nul(fd, "manualPrice"),
    usuallyWaived: bool(fd, "usuallyWaived"),
    gstBasis: (str(fd, "gstBasis") || "exclusive") as "exclusive" | "inclusive",
    competitorNotes: nul(fd, "competitorNotes"),
    notes: nul(fd, "notes"),
    tags: nul(fd, "tags"),
    roleId: nul(fd, "roleId"),
  };
}

export async function createServiceAction(fd: FormData) {
  await act(fd, () => services.createService(serviceFromForm(fd)), "Service added");
}

export async function updateServiceAction(fd: FormData) {
  await act(fd, () => services.updateService(str(fd, "id"), { ...serviceFromForm(fd), reason: nul(fd, "reason") }), "Service saved");
}

export async function setServiceStatusAction(fd: FormData) {
  await act(fd, () => services.setServiceStatus(str(fd, "id"), str(fd, "status") === "retired" ? "retired" : "active"));
}

export async function deleteServiceAction(fd: FormData) {
  await act(fd, () => services.deleteService(str(fd, "id")), "Service removed");
}

function packageFromForm(fd: FormData) {
  return {
    name: str(fd, "name"),
    description: nul(fd, "description"),
    inclusions: nul(fd, "inclusions"),
    exclusions: nul(fd, "exclusions"),
    deliverables: nul(fd, "deliverables"),
    minTermMonths: Number(str(fd, "minTermMonths") || 3),
    noticeDays: Number(str(fd, "noticeDays") || 30),
    landingUrl: nul(fd, "landingUrl"),
    manualMonthlyPrice: nul(fd, "manualMonthlyPrice"),
    manualSetupPrice: nul(fd, "manualSetupPrice"),
    status: (str(fd, "status") || "draft") as "draft" | "live" | "retired",
  };
}

export async function createPackageAction(fd: FormData) {
  await act(fd, () => services.createPackage(packageFromForm(fd)), "Package added");
}

export async function updatePackageAction(fd: FormData) {
  await act(fd, () => services.updatePackage(str(fd, "id"), packageFromForm(fd)), "Package saved");
}

export async function deletePackageAction(fd: FormData) {
  await act(fd, () => services.deletePackage(str(fd, "id")), "Package removed");
}

export async function addPackageServiceAction(fd: FormData) {
  await act(fd, () => services.addPackageService(str(fd, "packageId"), { serviceId: str(fd, "serviceId"), kind: str(fd, "kind") === "setup" ? "setup" : "recurring", waived: bool(fd, "waived") }));
}

export async function togglePackageServiceWaivedAction(fd: FormData) {
  await act(fd, () => services.setPackageServiceWaived(str(fd, "id"), bool(fd, "waived")));
}

export async function removePackageServiceAction(fd: FormData) {
  await act(fd, () => services.removePackageService(str(fd, "id")));
}

// --- Contractors --------------------------------------------------------------
export async function createContractorAction(fd: FormData) {
  await act(
    fd,
    () =>
      contractorsDal.createIncrementumContractor({
        name: str(fd, "name"),
        specialty: nul(fd, "specialty"),
        email: nul(fd, "email"),
        phone: nul(fd, "phone"),
        source: nul(fd, "source"),
        portfolioUrl: nul(fd, "portfolioUrl"),
        stage: (str(fd, "stage") || "sourced") as never,
      }),
    "Contractor added",
    (r) => `/incrementum/contractors/${(r as { id: string }).id}`
  );
}

export async function addExistingContractorAction(fd: FormData) {
  await act(fd, () => contractorsDal.addExistingContractor(str(fd, "contractorId")), "Contractor brought into Incrementum");
}

export async function updateContractorProfileAction(fd: FormData) {
  const gst = str(fd, "gstRegistered");
  await act(
    fd,
    () =>
      contractorsDal.updateContractorProfile(str(fd, "contractorId"), {
        name: str(fd, "name"),
        specialty: nul(fd, "specialty"),
        businessName: nul(fd, "businessName"),
        email: nul(fd, "email"),
        phone: nul(fd, "phone"),
        location: nul(fd, "location"),
        portfolioUrl: nul(fd, "portfolioUrl"),
        source: nul(fd, "source"),
        skills: str(fd, "skills").split(",").map((s) => s.trim()).filter(Boolean),
        roleIds: fd.getAll("roleIds").map(String).filter(Boolean),
        worksWithSizes: fd.getAll("worksWithSizes").map(String).filter(Boolean) as never,
        gstRegistered: gst === "yes" ? true : gst === "no" ? false : null,
        paymentTerms: nul(fd, "paymentTerms"),
        qualityRating: nul(fd, "qualityRating") as never,
        photoUrl: nul(fd, "photoUrl"),
        publicTitle: nul(fd, "publicTitle"),
        bio: nul(fd, "bio"),
        payWhenPaidAcceptedAt: nul(fd, "payWhenPaidAcceptedAt"),
        nonSolicitSignedAt: nul(fd, "nonSolicitSignedAt"),
        noticePeriodDays: nul(fd, "noticePeriodDays") as never,
        agreementUrl: nul(fd, "agreementUrl"),
        notes: nul(fd, "notes"),
      }),
    "Profile saved"
  );
}

export async function setContractorStageAction(fd: FormData) {
  await act(fd, () => contractorsDal.setContractorStage(str(fd, "contractorId"), str(fd, "stage"), nul(fd, "note")));
}

export async function upsertContractorServiceAction(fd: FormData) {
  await act(
    fd,
    () =>
      contractorsDal.upsertContractorService(str(fd, "contractorId"), {
        serviceId: str(fd, "serviceId"),
        rateType: (str(fd, "rateType") || "monthly") as never,
        rate: nul(fd, "rate"),
        capacitySlots: nul(fd, "capacitySlots"),
        notes: nul(fd, "notes"),
      }),
    "Quote saved"
  );
}

export async function setContractorSlotsAction(fd: FormData) {
  await act(fd, () => contractorsDal.setContractorServiceSlots(str(fd, "id"), nul(fd, "slots")));
}

export async function removeContractorServiceAction(fd: FormData) {
  await act(fd, () => contractorsDal.removeContractorService(str(fd, "id")));
}

export async function onboardContractorAction(fd: FormData) {
  await act(
    fd,
    async () => {
      const r = await contractorsDal.onboardContractorToPortal(str(fd, "contractorId"), { email: str(fd, "email"), displayName: nul(fd, "displayName") });
      if (r.passwordEmailError) throw new Error(`Login created, but the password email didn't send: ${r.passwordEmailError}`);
    },
    "Onboarded. They're on the Gray Horizon Team and have a password-setup email."
  );
}

export async function linkContractorLoginAction(fd: FormData) {
  await act(fd, () => contractorsDal.linkContractorLogin(str(fd, "contractorId"), str(fd, "userId")), "Login linked. They're on the Gray Horizon Team.");
}

export async function removeContractorAction(fd: FormData) {
  await act(fd, () => contractorsDal.deleteIncrementumContractor(str(fd, "contractorId")), "Removed from Incrementum", () => "/incrementum/contractors");
}

// --- Outreach (contractors + leads) ----------------------------------------------
export async function addActivityAction(fd: FormData) {
  await act(fd, () => outreach.addActivity({ entityType: str(fd, "entityType") as never, entityId: str(fd, "entityId"), type: (str(fd, "type") || "note") as "note" | "call", body: str(fd, "body") }));
}

export async function sendOutreachEmailAction(fd: FormData) {
  await act(
    fd,
    async () => {
      const r = await outreach.sendOutreachEmail({ entityType: str(fd, "entityType") as never, entityId: str(fd, "entityId"), subject: str(fd, "subject"), body: str(fd, "body") });
      return r;
    },
    "Email sent"
  );
}

export async function bookMeetingAction(fd: FormData) {
  await act(
    fd,
    () =>
      outreach.bookMeeting({
        entityType: str(fd, "entityType") as never,
        entityId: str(fd, "entityId"),
        title: str(fd, "title"),
        agenda: nul(fd, "agenda"),
        date: str(fd, "date"),
        time: str(fd, "time"),
        durationMinutes: Number(str(fd, "duration") || 30),
        withMeet: bool(fd, "withMeet"),
      }),
    "Meeting booked. Google has sent the invite."
  );
}

// --- Leads ------------------------------------------------------------------------
function leadFromForm(fd: FormData) {
  return {
    businessName: str(fd, "businessName"),
    contactName: nul(fd, "contactName"),
    email: nul(fd, "email"),
    phone: nul(fd, "phone"),
    website: nul(fd, "website"),
    packageId: nul(fd, "packageId"),
    serviceInterest: nul(fd, "serviceInterest"),
    adBudget: nul(fd, "adBudget"),
    businessSize: nul(fd, "businessSize") as never,
    message: nul(fd, "message"),
    source: (str(fd, "source") || "manual") as never,
    notes: nul(fd, "notes"),
  };
}

export async function createLeadAction(fd: FormData) {
  await act(fd, () => leads.createLead(leadFromForm(fd)), "Lead added", (r) => `/incrementum/leads/${(r as { id: string }).id}`);
}

export async function updateLeadAction(fd: FormData) {
  await act(fd, () => leads.updateLead(str(fd, "id"), leadFromForm(fd)), "Lead saved");
}

export async function setLeadStageAction(fd: FormData) {
  await act(fd, () => leads.setLeadStage(str(fd, "id"), str(fd, "stage"), nul(fd, "note")));
}

export async function markLeadRespondedAction(fd: FormData) {
  await act(fd, () => leads.markLeadResponded(str(fd, "id")), "Response time recorded");
}

export async function deleteLeadAction(fd: FormData) {
  await act(fd, () => leads.deleteLead(str(fd, "id")), "Lead removed", () => "/incrementum/leads");
}

export async function onboardLeadAction(fd: FormData) {
  await act(
    fd,
    () =>
      leads.onboardLeadAsClient(str(fd, "id"), {
        portalEmail: str(fd, "portalEmail"),
        displayName: nul(fd, "displayName"),
        packageId: nul(fd, "packageId"),
        startDate: str(fd, "startDate"),
        monthlyPrice: nul(fd, "monthlyPrice"),
        setupPrice: nul(fd, "setupPrice"),
        minTermMonths: nul(fd, "minTermMonths") === null ? null : Number(str(fd, "minTermMonths")),
      }),
    "Client onboarded. They're in GrayPortal too.",
    (r) => `/incrementum/clients/${(r as { engagementId: string }).engagementId}`
  );
}

// --- Engagements & payouts ------------------------------------------------------------
export async function createEngagementAction(fd: FormData) {
  await act(
    fd,
    () =>
      engagements.createEngagement({
        clientId: str(fd, "clientId"),
        packageId: nul(fd, "packageId"),
        name: str(fd, "name"),
        monthlyPrice: str(fd, "monthlyPrice") || "0",
        setupPrice: nul(fd, "setupPrice"),
        startDate: str(fd, "startDate"),
        minTermMonths: Number(str(fd, "minTermMonths") || 3),
      }),
    "Client added",
    (r) => `/incrementum/clients/${(r as { id: string }).id}`
  );
}

export async function addClientAction(fd: FormData) {
  const common = {
    packageId: nul(fd, "packageId"),
    monthlyPrice: str(fd, "monthlyPrice") || "0",
    setupPrice: nul(fd, "setupPrice"),
    startDate: str(fd, "startDate"),
    minTermMonths: Number(str(fd, "minTermMonths") || 0),
  };
  const mode = str(fd, "mode");
  await act(
    fd,
    () =>
      mode === "new"
        ? engagements.addNewIncrementumClient({
            ...common,
            businessName: str(fd, "businessName"),
            contactName: nul(fd, "contactName"),
            email: str(fd, "email"),
            phone: nul(fd, "phone"),
            website: nul(fd, "website"),
            businessSize: nul(fd, "businessSize") as never,
          })
        : engagements.startEngagementForClient({ ...common, clientId: str(fd, "clientId"), name: str(fd, "name") }),
    mode === "new" ? "Client added. They're in GrayPortal too." : "Client added",
    (r) => `/incrementum/clients/${(r as { id: string }).id}`
  );
}

export async function setSlotWeightAction(fd: FormData) {
  await act(fd, () => engagements.setEngagementSlotWeight(str(fd, "id"), str(fd, "slotWeight") || "1"));
}

export async function syncClientServicesAction(fd: FormData) {
  await act(fd, () => grayportal.syncEngagementServicesToGrayPortal(str(fd, "id")), "Services synced to GrayPortal");
}

export async function sendReviewRequestAction(fd: FormData) {
  await act(fd, () => outreach.sendReviewRequest(str(fd, "id"), { to: str(fd, "to"), subject: str(fd, "subject"), body: str(fd, "body") }), "Review email sent");
}

export async function updateEngagementAction(fd: FormData) {
  await act(
    fd,
    () =>
      engagements.updateEngagement(str(fd, "id"), {
        name: str(fd, "name"),
        monthlyPrice: str(fd, "monthlyPrice") || "0",
        setupPrice: nul(fd, "setupPrice"),
        slotWeight: str(fd, "slotWeight") || "1",
        startDate: nul(fd, "startDate"),
        minTermEnd: nul(fd, "minTermEnd"),
        health: (str(fd, "health") || "good") as never,
        businessSize: nul(fd, "businessSize") as never,
        status: str(fd, "status") === "paused" ? "paused" : "active",
        notes: nul(fd, "notes"),
      }),
    "Client saved"
  );
}

export async function setEngagementModulesAction(fd: FormData) {
  const keys = str(fd, "keys").split(",").filter(Boolean);
  await act(fd, () => engagements.setEngagementModules(str(fd, "id"), Object.fromEntries(keys.map((k) => [k, bool(fd, `m_${k}`)]))), "Modules saved");
}

export async function endEngagementAction(fd: FormData) {
  await act(fd, () => engagements.endEngagement(str(fd, "id"), { endReason: str(fd, "endReason"), lessons: nul(fd, "lessons"), endedAt: str(fd, "endedAt") }), "Client ended and archived");
}

export async function reopenEngagementAction(fd: FormData) {
  await act(fd, () => engagements.reopenEngagement(str(fd, "id")), "Client reopened");
}

export async function addEngagementContractorAction(fd: FormData) {
  await act(fd, () =>
    engagements.addEngagementContractor(str(fd, "engagementId"), {
      contractorId: str(fd, "contractorId"),
      serviceId: nul(fd, "serviceId"),
      role: str(fd, "role") === "backup" ? "backup" : "main",
      monthlyCost: str(fd, "monthlyCost") || "0",
    })
  );
}

export async function removeEngagementContractorAction(fd: FormData) {
  await act(fd, () => engagements.removeEngagementContractor(str(fd, "id")));
}

export async function openCycleAction(fd: FormData) {
  await act(fd, () => engagements.openCycle(str(fd, "engagementId"), str(fd, "month")), "Month opened");
}

export async function stampCycleAction(fd: FormData) {
  await act(fd, () => engagements.stampCycle(str(fd, "id"), str(fd, "field") as never, str(fd, "date")));
}

/** Payouts' "Mark <month> settled": the optional tick on every invoiced, unticked month in one go. */
export async function settleMonthAction(fd: FormData) {
  const ids = str(fd, "ids").split(",").filter(Boolean);
  const date = str(fd, "date");
  await act(
    fd,
    async () => {
      for (const id of ids) await engagements.stampCycle(id, "settled", date);
    },
    ids.length === 1 ? "Month ticked settled" : `${ids.length} months ticked settled`
  );
}

export async function updateCycleAction(fd: FormData) {
  // Payments aren't tracked: the one optional "Settled" date stamps both
  // sides, which is what the contractor workspace reads as paid.
  const settledAt = nul(fd, "settledAt");
  await act(
    fd,
    () =>
      engagements.updateCycle(str(fd, "id"), {
        deliveredAt: nul(fd, "deliveredAt"),
        approvedAt: nul(fd, "approvedAt"),
        reportSentAt: nul(fd, "reportSentAt"),
        invoicedAt: nul(fd, "invoicedAt"),
        xeroInvoiceNumber: nul(fd, "xeroInvoiceNumber"),
        invoiceAmount: nul(fd, "invoiceAmount"),
        clientPaidAt: settledAt,
        contractorBillRef: nul(fd, "contractorBillRef"),
        payoutAmount: nul(fd, "payoutAmount"),
        payoutDueAt: nul(fd, "payoutDueAt") ?? settledAt,
        payoutPaidAt: settledAt,
        notes: nul(fd, "notes"),
      }),
    "Month saved"
  );
}

export async function deleteCycleAction(fd: FormData) {
  await act(fd, () => engagements.deleteCycle(str(fd, "id")));
}

// --- Client lines (services & team on a lead / engagement profile) -------------
// Add / assign actions carry no flash on purpose: they refresh the profile
// in place (see act), so the popup they're fired from stays open.
function scopeFromForm(fd: FormData) {
  return { leadId: nul(fd, "leadId"), engagementId: nul(fd, "engagementId") };
}

export async function createNeedAction(fd: FormData) {
  await act(fd, () =>
    needs.createNeed({
      ...scopeFromForm(fd),
      serviceId: nul(fd, "serviceId"),
      serviceItemId: nul(fd, "serviceItemId"),
      roleId: nul(fd, "roleId"),
      title: nul(fd, "title"),
      tags: nul(fd, "tags"),
      quantity: nul(fd, "quantity"),
      notes: nul(fd, "notes"),
    })
  );
}

export async function addPackageLinesAction(fd: FormData) {
  await act(fd, () => needs.addPackageLines(scopeFromForm(fd), str(fd, "packageId")));
}

export async function setNeedWaivedAction(fd: FormData) {
  await act(fd, () => needs.setNeedWaived(str(fd, "id"), bool(fd, "waived")));
}

export async function assignRoleAction(fd: FormData) {
  await act(fd, () => needs.assignRole(scopeFromForm(fd), nul(fd, "roleId"), str(fd, "contractorId")));
}

export async function unassignRoleAction(fd: FormData) {
  await act(fd, () => needs.unassignRole(scopeFromForm(fd), nul(fd, "roleId")));
}

// --- Contractor roles (Settings) -------------------------------------------------
export async function createRoleAction(fd: FormData) {
  await act(fd, () => services.createRole(str(fd, "name")), "Role added");
}

export async function updateRoleAction(fd: FormData) {
  await act(fd, () => services.updateRole(str(fd, "id"), { name: str(fd, "name"), sortOrder: Number(str(fd, "sortOrder") || 0) }), "Role saved");
}

export async function deleteRoleAction(fd: FormData) {
  await act(fd, () => services.deleteRole(str(fd, "id")), "Role removed");
}

export async function updateNeedAction(fd: FormData) {
  await act(
    fd,
    () =>
      needs.updateNeed(str(fd, "id"), {
        title: nul(fd, "title"),
        tags: nul(fd, "tags"),
        quantity: nul(fd, "quantity"),
        contractorRate: nul(fd, "contractorRate"),
        markupPct: nul(fd, "markupPct"),
        sellPrice: nul(fd, "sellPrice"),
        notes: nul(fd, "notes"),
      }),
    "Quote line saved"
  );
}

export async function deleteNeedAction(fd: FormData) {
  await act(fd, () => needs.deleteNeed(str(fd, "id")));
}
