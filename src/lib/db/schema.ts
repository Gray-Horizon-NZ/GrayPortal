import { STAGES } from "@/config/pipeline";
import {
  boolean,
  check,
  customType,
  date,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// pgcrypto's pgp_sym_encrypt returns bytea — Drizzle has no first-class
// bytea helper, so this is a thin passthrough type used only for the
// encrypted refresh token column below (never read/written except via the
// pgp_sym_encrypt/pgp_sym_decrypt raw SQL in src/lib/dal/googleConnection.ts).
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["admin", "contractor", "client"]);
export const stageEnum = pgEnum("stage", STAGES);
export const activityTypeEnum = pgEnum("activity_type", ["call", "email", "meeting", "note"]);
export const docTypeEnum = pgEnum("doc_type", ["proposal", "contract", "deck", "other"]);
export const taskStatusEnum = pgEnum("task_status", [
  "not_started",
  "in_progress",
  "done",
  "ongoing",
]);
export const referralStatusEnum = pgEnum("referral_status", [
  "pending",
  "confirmed",
  "credited",
  "declined",
]);
export const actorTypeEnum = pgEnum("actor_type", ["user", "agent", "system"]);
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete"]);
// Phase 3 (Google Calendar/Tasks sync) — fixed set, not freeform text, so a
// failed sync can only ever be one of these three states in the UI badge
// (brief §4.4: colour is never the only signal, but the state itself still
// has to be a closed set to render consistently).
export const syncStateEnum = pgEnum("sync_state", ["synced", "pending", "failed"]);

// ---------------------------------------------------------------------------
// Soft-delete + audit column helpers
// ---------------------------------------------------------------------------

const softDelete = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

const actorColumns = {
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
};

// ---------------------------------------------------------------------------
// Tenant boundary — `clients` is the ONLY table role=client isolation keys
// off. Internal CRM tables (companies, contacts, deals, activities) carry NO
// client_id: they are internal by definition, gated on role alone. Only
// tables that are deliberately client-portal-visible carry a real client_id
// (tasks, documents, referrals — see below).
// ---------------------------------------------------------------------------

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  industry: text("industry"),
  region: text("region"),
  website: text("website"),
  sizeBand: text("size_band"),
  source: text("source").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  name: text("name").notNull(),
  nextPaymentDate: date("next_payment_date"),
  ...softDelete,
  ...actorColumns,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  displayName: text("display_name"),
  googleUid: text("google_uid").unique(),
  ...softDelete,
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  roleTitle: text("role_title"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  primaryContactId: uuid("primary_contact_id").references(() => contacts.id),
  stage: stageEnum("stage").notNull().default("Identified"),
  valueNzd: numeric("value_nzd", { precision: 12, scale: 2 }),
  packageTier: text("package_tier"),
  closeProbability: numeric("close_probability", { precision: 5, scale: 2 }),
  nextAction: text("next_action").notNull(),
  nextActionDate: date("next_action_date").notNull(),
  source: text("source"),
  closeReason: text("close_reason"),
  // Phase 3: one-way sync of a deal's next action to Google Calendar.
  // syncState defaults null (never synced / not applicable, e.g. no
  // nextActionDate) rather than "pending", so existing rows don't all read
  // as mid-sync the moment this column exists.
  googleEventId: text("google_event_id"),
  syncState: syncStateEnum("sync_state"),
  ...softDelete,
  ...actorColumns,
});

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dealId: uuid("deal_id").references(() => deals.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    type: activityTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    body: text("body"),
    outcome: text("outcome"),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    ...softDelete,
  },
  (table) => [
    check(
      "activities_exactly_one_parent",
      sql`(${table.dealId} IS NOT NULL)::int + (${table.contactId} IS NOT NULL)::int = 1`
    ),
  ]
);

// ---------------------------------------------------------------------------
// Client-visible tables — the only ones that carry a real client_id.
// ---------------------------------------------------------------------------

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").references(() => deals.id),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  status: taskStatusEnum("status").notNull().default("not_started"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  googleTaskId: text("google_task_id"),
  syncState: syncStateEnum("sync_state"),
  ...softDelete,
  ...actorColumns,
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    clientId: uuid("client_id").references(() => clients.id),
    fileRef: text("file_ref").notNull(),
    docType: docTypeEnum("doc_type").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    ...softDelete,
  },
  (table) => [
    check(
      "documents_exactly_one_entity",
      sql`(${table.companyId} IS NOT NULL)::int + (${table.contactId} IS NOT NULL)::int + (${table.dealId} IS NOT NULL)::int = 1`
    ),
  ]
);

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  referredCompanyId: uuid("referred_company_id").references(() => companies.id),
  referredName: text("referred_name").notNull(),
  status: referralStatusEnum("status").notNull().default("pending"),
  creditAmountNzd: numeric("credit_amount_nzd", { precision: 12, scale: 2 }),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

// Per-client toggles for the dynamic portal builder (§ new scope) — the
// portal reads this to decide which sections to render for a given client.
// featureKey values (e.g. "referrals", "grayscale_page", "tasks",
// "documents") are validated at the application layer against a fixed
// registry, not a DB enum, so new features don't require a migration.
export const clientFeatures = pgTable("client_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  featureKey: text("feature_key").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config"),
  ...softDelete,
});

// Phase 3 — one row per admin who has connected Google Calendar/Tasks.
// The refresh token is pgcrypto-encrypted at the SQL layer (never passes
// through the app as plaintext except transiently in memory during a sync
// call) — see src/lib/dal/googleConnection.ts. Admin-only table: no client
// or contractor ever has a reason to read this.
export const googleConnections = pgTable("google_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  encryptedRefreshToken: bytea("encrypted_refresh_token").notNull(),
  scopes: text("scopes").array().notNull(),
  ...softDelete,
});

// ---------------------------------------------------------------------------
// Audit log — append-only. No updatedAt/deletedAt: this table has no update
// or delete path at all. Runtime DB role has SELECT, INSERT only (see
// db/sql/002_audit_lockdown.sql) — enforced at the database, not by
// convention.
// ---------------------------------------------------------------------------

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  actorType: actorTypeEnum("actor_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  fieldChanges: jsonb("field_changes"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});
