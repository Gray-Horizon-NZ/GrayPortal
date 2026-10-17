import "server-only";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { auditLog } from "@/lib/db/schema";
import { withCaller } from "./auth";
import { assertRole, type Caller, type Tx } from "./session";
import { setTaskStatus, TaskStatus } from "./tasks";

/**
 * The contractor workspace (/work). Contractors have no direct access to
 * any commercial table (db/sql/031_contractor_scoping.sql): everything here
 * reads the contractor_* views, which expose only safe columns for the
 * signed-in contractor, and writes go through SECURITY DEFINER functions
 * that check the row is theirs. Never what a client pays, never another
 * client, never another contractor's rates.
 */
async function asContractor<T>(fn: (caller: Caller, tx: Tx) => Promise<T>): Promise<T> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "contractor");
    return fn(caller, tx);
  });
}

async function rows<T>(tx: Tx, query: ReturnType<typeof sql>): Promise<T[]> {
  const res = await tx.execute(query);
  return (res as unknown as { rows: T[] }).rows;
}

async function audit(tx: Tx, caller: Caller, entityType: string, entityId: string, changes: Record<string, unknown>) {
  await tx.insert(auditLog).values({ actorUserId: caller.userId, actorType: "user", entityType, entityId, action: "update", fieldChanges: changes });
}

export type ContractorMe = {
  contractor_id: string;
  name: string;
  specialty: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  portfolio_url: string | null;
  skills: string[] | null;
  public_title: string | null;
  bio: string | null;
  photo_url: string | null;
  payment_terms: string | null;
  pay_when_paid_accepted_at: string | null;
  non_solicit_signed_at: string | null;
  notice_period_days: number | null;
  stage: string;
  stage_changed_at: string;
};
export type MyEngagement = {
  assignment_id: string;
  engagement_id: string;
  client_name: string;
  service_name: string | null;
  role: string;
  my_monthly_rate: string;
  status: string;
  start_date: string | null;
  health: string;
};
export type MyCycle = {
  id: string;
  engagement_id: string;
  client_name: string;
  month: string;
  delivered_at: string | null;
  approved_at: string | null;
  report_sent_at: string | null;
  client_paid: boolean;
  payout_due_at: string | null;
  payout_paid_at: string | null;
  contractor_bill_ref: string | null;
  my_amount: string;
};
export type MyTask = { id: string; title: string; status: string; due_date: string | null; priority: string; completed_at: string | null; client_name: string | null };
export type MyPlaybook = { id: string; title: string; body: string; version: number; updated_at: string; service_name: string | null };
export type TeamMember = { contractor_id: string; name: string; public_title: string | null; photo_url: string | null; bio: string | null; team_since: string; services: string[] };
export type MyQuote = { id: string; service_name: string; rate_type: string; rate: string | null; capacity_slots: string | null };
export type MyHours = { id: string; engagement_id: string | null; work_date: string; hours: string; note: string | null };

/** Everything the workspace shows, in one contractor-scoped transaction. */
export async function getMyWorkspace() {
  return asContractor(async (caller, tx) => {
    const [me] = await rows<ContractorMe>(tx, sql`select * from contractor_me`);
    const engagements = await rows<MyEngagement>(tx, sql`select * from contractor_my_engagements order by client_name`);
    const cycles = await rows<MyCycle>(tx, sql`select * from contractor_my_cycles order by month desc, client_name`);
    const tasks = await rows<MyTask>(tx, sql`select * from contractor_my_tasks order by (status = 'done'), due_date nulls last`);
    const playbooks = await rows<MyPlaybook>(tx, sql`select * from contractor_my_playbooks order by title`);
    const team = await rows<TeamMember>(tx, sql`select * from contractor_team order by name`);
    const quotes = await rows<MyQuote>(tx, sql`select * from contractor_my_quotes order by service_name`);
    const hours = await rows<MyHours>(tx, sql`select * from contractor_my_hours order by work_date desc limit 60`);
    return { caller, me: me ?? null, engagements, cycles, tasks, playbooks, team, quotes, hours };
  });
}

export type MyWorkspace = Awaited<ReturnType<typeof getMyWorkspace>>;

export async function markMyMonthDelivered(cycleId: string) {
  const id = z.string().uuid().parse(cycleId);
  return asContractor(async (caller, tx) => {
    await tx.execute(sql`select contractor_mark_delivered(${id}::uuid)`);
    await audit(tx, caller, "incrementum_engagement_cycle", id, { deliveredAt: { old: null, new: "today (contractor)" } });
  });
}

export async function submitMyInvoiceRef(cycleId: string, ref: string) {
  const data = z.object({ id: z.string().uuid(), ref: z.string().trim().min(1).max(200) }).parse({ id: cycleId, ref });
  return asContractor(async (caller, tx) => {
    await tx.execute(sql`select contractor_submit_bill(${data.id}::uuid, ${data.ref})`);
    await audit(tx, caller, "incrementum_engagement_cycle", data.id, { contractorBillRef: { old: null, new: data.ref } });
  });
}

export async function logMyHours(input: { engagementId: string | null; workDate: string; hours: string; note: string | null }) {
  const data = z
    .object({ engagementId: z.string().uuid().nullable(), workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), hours: z.coerce.number().positive().max(24), note: z.string().max(500).nullable() })
    .parse(input);
  return asContractor(async (caller, tx) => {
    const res = await rows<{ contractor_log_hours: string }>(
      tx,
      sql`select contractor_log_hours(${data.engagementId}::uuid, ${data.workDate}::date, ${data.hours}::numeric, ${data.note})`
    );
    const id = res[0]?.contractor_log_hours;
    if (id) await audit(tx, caller, "incrementum_hours", id, { hours: { old: null, new: data.hours } });
  });
}

export async function updateMyProfile(input: { publicTitle: string | null; bio: string | null; photoUrl: string | null; phone: string | null; location: string | null; portfolioUrl: string | null; skills: string }) {
  const data = z
    .object({
      publicTitle: z.string().max(120).nullable(),
      bio: z.string().max(1000).nullable(),
      photoUrl: z.string().url().max(500).nullable(),
      phone: z.string().max(50).nullable(),
      location: z.string().max(120).nullable(),
      portfolioUrl: z.string().max(500).nullable(),
      skills: z.string().max(500),
    })
    .parse(input);
  const skills = [...new Set(data.skills.split(",").map((x) => x.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))];
  return asContractor(async (caller, tx) => {
    await tx.execute(
      sql`select contractor_update_profile(${data.publicTitle}, ${data.bio}, ${data.photoUrl}, ${data.phone}, ${data.location}, ${data.portfolioUrl}, ${skills}::text[])`
    );
    const [me] = await rows<{ contractor_id: string }>(tx, sql`select contractor_id from contractor_me`);
    if (me) await audit(tx, caller, "incrementum_contractor_profile", me.contractor_id, { profile: { old: null, new: "updated by contractor" } });
  });
}

/** Ticking off an assigned task: tasks RLS (031) only lets a contractor write their own. */
export async function setMyTaskStatus(taskId: string, status: string) {
  const parsed = TaskStatus.parse(status);
  await asContractor(async () => undefined);
  return setTaskStatus(taskId, parsed);
}
