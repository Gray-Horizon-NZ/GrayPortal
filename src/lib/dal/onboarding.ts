import "server-only";
import { companies, clients, clientFeatures, users, tasks } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { auditedInsert } from "./mutate";
import { PORTAL_FEATURE_KEYS, type PortalFeatureKey } from "./clients";
import { syncTaskToGoogle } from "@/lib/google/adapter";
import { resolveGoogleTasklistId } from "./googleConnection";
import { ONBOARDING_TASK_TEMPLATE } from "@/config/onboarding";
import { z } from "zod";

export const OnboardClientInput = z
  .object({
    // Set when converting an already-existing prospect (a companies row with
    // a Won deal, no client yet) instead of onboarding a brand-new company —
    // reuses that row rather than inserting a duplicate. `company` is
    // ignored (and not required) when this is set.
    companyId: z.string().uuid().optional(),
    company: z
      .object({
        name: z.string().min(1),
        industry: z.string().optional(),
        region: z.string().optional(),
        website: z.string().optional(),
        sizeBand: z.string().optional(),
        source: z.string().min(1),
      })
      .optional(),
    client: z
      .object({
        name: z.string().min(1).optional(),
        nextPaymentDate: z.string().optional(),
      })
      .optional(),
    portalInvite: z.object({
      email: z.string().email(),
      displayName: z.string().optional(),
    }),
    enabledFeatures: z.array(z.enum(PORTAL_FEATURE_KEYS)).default(["tasks", "documents", "referrals"]),
  })
  .refine((data) => data.companyId || data.company, {
    message: "Either companyId (existing prospect) or company (new company) is required",
    path: ["company"],
  });
export type OnboardClientInputT = z.infer<typeof OnboardClientInput>;

/**
 * One transactional operation replacing the several disconnected manual
 * steps onboarding used to take (Phase 5 brief §2): company, client,
 * portal-login invite, default feature flags, and a starter task list, all
 * in the same withCaller transaction — a failure partway through rolls
 * back everything, not just some of it. Admin-only: this creates a new
 * login-capable identity, same sensitivity as inviteClientUser.
 */
export async function onboardClient(input: OnboardClientInputT) {
  const data = OnboardClientInput.parse(input);

  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.portalInvite.email), isNull(users.deletedAt)))
      .limit(1);
    if (existingUser) {
      throw new Error(`${data.portalInvite.email} is already on the allowlist`);
    }

    let company: unknown;
    let companyId: string;
    if (data.companyId) {
      const [existingCompany] = await tx.select().from(companies).where(eq(companies.id, data.companyId)).limit(1);
      if (!existingCompany) throw new Error("Company not found");

      const [existingClientForCompany] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.companyId, data.companyId), isNull(clients.deletedAt)))
        .limit(1);
      if (existingClientForCompany) throw new Error(`${existingCompany.name} has already been onboarded`);

      company = existingCompany;
      companyId = existingCompany.id;
    } else {
      company = await auditedInsert(
        tx,
        companies,
        {
          ...data.company!,
          status: "active",
          createdBy: caller.userId,
          updatedBy: caller.userId,
        },
        { caller, entityType: "company" }
      );
      companyId = (company as { id: string }).id;
    }

    const client = await auditedInsert(
      tx,
      clients,
      {
        name: data.client?.name ?? data.company?.name ?? (company as { name: string }).name,
        companyId,
        nextPaymentDate: data.client?.nextPaymentDate,
        createdBy: caller.userId,
        updatedBy: caller.userId,
      },
      { caller, entityType: "client" }
    );
    const clientId = (client as { id: string }).id;

    for (const key of PORTAL_FEATURE_KEYS) {
      await auditedInsert(
        tx,
        clientFeatures,
        { clientId, featureKey: key, enabled: data.enabledFeatures.includes(key as PortalFeatureKey) },
        { caller, entityType: "client_feature" }
      );
    }

    const portalUser = await auditedInsert(
      tx,
      users,
      {
        email: data.portalInvite.email,
        role: "client" as const,
        clientId,
        displayName: data.portalInvite.displayName ?? null,
        googleUid: null,
      },
      { caller, entityType: "user" }
    );

    const createdTasks = [];
    for (const item of ONBOARDING_TASK_TEMPLATE) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + item.dueInDays);
      const [task] = await tx
        .insert(tasks)
        .values({
          clientId,
          title: item.title,
          dueDate: dueDate.toISOString().slice(0, 10),
          status: "not_started",
          createdBy: caller.userId,
          updatedBy: caller.userId,
        })
        .returning();

      const tasklistId = await resolveGoogleTasklistId(task);
      const result = await syncTaskToGoogle(task, tasklistId);
      if (result.status === "skipped") {
        createdTasks.push(task);
      } else {
        const [updated] = await tx
          .update(tasks)
          .set({
            googleTaskId: result.status === "synced" ? result.googleId : null,
            googleTaskListId: result.status === "synced" ? tasklistId : null,
            syncState: result.status,
          })
          .where(eq(tasks.id, task.id))
          .returning();
        createdTasks.push(updated);
      }
    }

    return { company, client, portalUser, tasks: createdTasks };
  });
}
