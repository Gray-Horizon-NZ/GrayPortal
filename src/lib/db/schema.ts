import { STAGES } from "@/config/pipeline";
import {
  boolean,
  check,
  customType,
  date,
  integer,
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
// Phase 8 extends this lifecycle from Phase 2's original 4 generic states
// to the named states the brief specifies — "converted" and
// "discount_applied" are two distinct events (a referred lead becoming a
// client vs. the 20%-off-2-months rule actually landing), even though
// convertReferral() in src/lib/dal/referrals.ts stamps both in the same
// transaction so a converted referral is never left sitting mid-lifecycle.
export const referralStatusEnum = pgEnum("referral_status", [
  "submitted",
  "contacted",
  "converted",
  "discount_applied",
  "declined",
]);
export const ideationStatusEnum = pgEnum("ideation_status", [
  "new",
  "under_review",
  "actioned",
  "archived",
]);
export const roadmapStatusEnum = pgEnum("roadmap_status", ["planned", "in_progress", "done"]);
export const toolStackStatusEnum = pgEnum("tool_stack_status", ["current", "planned"]);
export const clientServiceStatusEnum = pgEnum("client_service_status", ["active", "paused", "ended"]);
export const clientHealthChannelStatusEnum = pgEnum("client_health_channel_status", ["ok", "warn", "off"]);
// Phase 12 — fixed set of trigger types this app actually generates
// (deal_stalled, task_overdue today; payment_due_soon/security_alert/
// reminder_due are reserved for Phases 9/17/19 once those exist), not
// freeform text, so a notification's type is always one the UI knows how
// to render.
export const healthTrendEnum = pgEnum("health_trend", ["up", "down", "flat"]);
export const recurrenceIntervalEnum = pgEnum("recurrence_interval", ["monthly", "quarterly", "custom"]);
// Xero's own Invoice.Status enum (Phase 9) — mirrored verbatim, not
// reinterpreted, so the cache stays a faithful read-only mirror.
export const xeroInvoiceStatusEnum = pgEnum("xero_invoice_status", [
  "DRAFT",
  "SUBMITTED",
  "AUTHORISED",
  "PAID",
  "VOIDED",
  "DELETED",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "deal_stalled",
  "task_overdue",
  "payment_due_soon",
  "security_alert",
  "reminder_due",
]);
export const actorTypeEnum = pgEnum("actor_type", ["user", "agent", "system"]);
// "reveal" is a read, not a mutation — Phase 6 (Credential Vault) is the
// first phase where a read needs its own audit trail (viewing a decrypted
// secret), so it gets its own action value rather than overloading "update".
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "reveal"]);
// Phase 3 (Google Calendar/Tasks sync) — fixed set, not freeform text, so a
// failed sync can only ever be one of these three states in the UI badge
// (brief §4.4: colour is never the only signal, but the state itself still
// has to be a closed set to render consistently).
export const syncStateEnum = pgEnum("sync_state", ["synced", "pending", "failed"]);
// Phase 7 (Pricing Catalogue) — "custom" is a deliberate addition beyond the
// brief's literal one-off/monthly/range trio: the source framework has
// genuinely non-numeric pricing (Yuvi-multiplier SS builds, "Included — not
// sold separately," inclusion-only RA rows) that don't fit any of the other
// three. See priceText on serviceItems below for where that text lives.
export const billingTypeEnum = pgEnum("billing_type", ["one_off", "monthly", "range", "custom"]);
// Phase 10 (Email System) — which side sent the message. Not derived from
// Gmail's own labels at query time because "which mailbox is 'us'" needs to
// stay stable even if the connected admin account changes later.
export const emailDirectionEnum = pgEnum("email_direction", ["inbound", "outbound"]);

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
  // Phase 8 — both admin-configured, iframe-embedded in the portal
  // (Drive/Looker Studio stay the systems of record; GrayPortal never
  // duplicates storage or builds a native reporting engine — brief §1/§4).
  driveFolderUrl: text("drive_folder_url"),
  lookerStudioUrl: text("looker_studio_url"),
  // Phase 9 — deliberately admin-set, never auto-matched by name/email:
  // silently mismatching a client to the wrong Xero contact would show
  // someone else's financial data, so linking is a one-time explicit
  // choice (client detail page), not a fuzzy-match heuristic.
  xeroContactId: text("xero_contact_id"),
  // Public-read Storage URL (not sensitive, unlike documents — no signed
  // URL needed) and an admin-authored blurb shown at the top of this
  // client's portal home page. Both null = no logo / no default copy
  // forced, not an error state.
  logoUrl: text("logo_url"),
  portalWelcomeMessage: text("portal_welcome_message"),
  ...softDelete,
  ...actorColumns,
});

// Business record for a contractor — name/specialty — independent of
// whether they have login access yet, same relationship clients has to
// portalUsers. Distinct from dal/users.ts's listContractors(), which reads
// login rows (role="contractor") for the task-assignee dropdown; this
// table is the roster those login rows optionally attach to.
export const contractors = pgTable("contractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  ...softDelete,
  ...actorColumns,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  contractorId: uuid("contractor_id").references(() => contractors.id),
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
  // Phase 14 — who a task is assigned to (a contractor, typically). Nothing
  // set this before Phase 14; existing tasks all have it null, which reads
  // as "unassigned," not an error state.
  assignedTo: uuid("assigned_to").references(() => users.id),
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
    // Exactly one of these two is set — fileRef for an internal Storage
    // upload (never a public URL, see getDocumentDownloadUrl), externalUrl
    // for a linked Drive/hosted-PDF document GrayPortal never stores a
    // copy of.
    fileRef: text("file_ref"),
    externalUrl: text("external_url"),
    docType: docTypeEnum("doc_type").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    ...softDelete,
  },
  (table) => [
    check(
      "documents_exactly_one_entity",
      sql`(${table.companyId} IS NOT NULL)::int + (${table.contactId} IS NOT NULL)::int + (${table.dealId} IS NOT NULL)::int = 1`
    ),
    check(
      "documents_exactly_one_source",
      sql`(${table.fileRef} IS NOT NULL)::int + (${table.externalUrl} IS NOT NULL)::int = 1`
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
  status: referralStatusEnum("status").notNull().default("submitted"),
  creditAmountNzd: numeric("credit_amount_nzd", { precision: 12, scale: 2 }),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

// Phase 8 — created automatically by convertReferral() when a referral's
// status moves to "converted" (src/lib/dal/referrals.ts implements the
// documented 20%-off-2-months rule here, rather than that being tracked
// manually elsewhere). "With stacking" per the brief: multiple rows can be
// active for the same client at once from separate referrals — the
// discount they see is the sum of whatever's currently active, not a
// single mutable field.
export const referralDiscounts = pgTable("referral_discounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  referralId: uuid("referral_id")
    .notNull()
    .references(() => referrals.id),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("20"),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  ...softDelete,
  ...actorColumns,
});

// Phase 8 — Ideation/Roadmap/Meeting Summaries/Tool Stack: admin-writable,
// client read-only (matches current real-world usage per the brief — no
// client-side mutation function exists in the DAL for any of these, same
// enforcement-by-omission pattern Phase 2 already uses for portal tasks).
export const ideationItems = pgTable("ideation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  status: ideationStatusEnum("status").notNull().default("new"),
  ...softDelete,
  ...actorColumns,
});

export const roadmapItems = pgTable("roadmap_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  status: roadmapStatusEnum("status").notNull().default("planned"),
  sortOrder: numeric("sort_order", { precision: 6, scale: 0 }).notNull().default("0"),
  ...softDelete,
  ...actorColumns,
});

export const meetingSummaries = pgTable("meeting_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  title: text("title").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  summary: text("summary").notNull(),
  ...softDelete,
  ...actorColumns,
});

export const toolStackItems = pgTable("tool_stack_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  toolName: text("tool_name").notNull(),
  category: text("category"),
  status: toolStackStatusEnum("status").notNull().default("current"),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

// Catalogue items (service_items) attached to a specific client — what
// they're actually being billed for, distinct from the catalogue's
// suggested pricing. custom*Price overrides that client's effective rate
// when set (a negotiated deal); null means "use the catalogue's current
// price." Feeds the portal's Next Payment $ total (sum of active recurring
// rows) as well as the admin client page.
export const clientServices = pgTable("client_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  serviceItemId: text("service_item_id")
    .notNull()
    .references(() => serviceItems.id),
  customSetupPrice: numeric("custom_setup_price", { precision: 12, scale: 2 }),
  customMonthlyPrice: numeric("custom_monthly_price", { precision: 12, scale: 2 }),
  status: clientServiceStatusEnum("status").notNull().default("active"),
  startedOn: date("started_on"),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

// Monthly-entered performance figures behind the portal's "Performance
// Snapshot" widget — hand-entered, not pulled from any ad platform API
// (no integration exists), one row per period.
export const clientMetricsSnapshots = pgTable("client_metrics_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  periodLabel: text("period_label").notNull(),
  adSpend: numeric("ad_spend", { precision: 12, scale: 2 }),
  leadsGenerated: integer("leads_generated"),
  roas: numeric("roas", { precision: 6, scale: 2 }),
  ...softDelete,
  ...actorColumns,
});

export const clientTeamMembers = pgTable("client_team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  name: text("name").notNull(),
  role: text("role"),
  contactEmail: text("contact_email"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const clientHealthChannels = pgTable("client_health_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  channelName: text("channel_name").notNull(),
  status: clientHealthChannelStatusEnum("status").notNull().default("ok"),
  statusLabel: text("status_label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const clientActivityFeed = pgTable("client_activity_feed", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  body: text("body").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
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
  // Phase 10 — Gmail's incremental sync cursor (users.history.list's
  // startHistoryId). Null until the first successful inbound sync, which
  // bootstraps it via messages.list instead of walking full history from
  // account creation. Lives here rather than a separate table since Gmail
  // reuses the same OAuth grant as Calendar/Tasks (GOOGLE_SYNC_SCOPES).
  gmailHistoryId: text("gmail_history_id"),
  ...softDelete,
});

// Phase 6 — encrypted credential vault. clientId null means a business-wide
// secret (internal tools, the future Mobile Ops Package password); non-null
// scopes it to that client for display/grouping only — this table is
// admin-only regardless of clientId, enforced by RLS (credentials_admin_only
// in db/sql/006_credentials.sql), not by clientId matching a client caller.
// Secret is pgcrypto-encrypted at the SQL layer, same pattern as
// googleConnections.encryptedRefreshToken above — see
// src/lib/dal/credentials.ts.
export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id),
  label: text("label").notNull(),
  username: text("username"),
  encryptedSecret: bytea("encrypted_secret").notNull(),
  url: text("url"),
  notes: text("notes"),
  lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true }),
  ...softDelete,
  ...actorColumns,
});

// Phase 7 — structured copy of gh_pricing_framework_v5.md (the standalone
// Proposer agent's source of truth, see OS/ai-agents/Proposer), loaded by
// scripts/import-pricing.mjs rather than through the DAL — these rows come
// from re-running that importer against the source file, not from a caller
// mutation, so (like googleConnections) there are no actorColumns. The 7
// module codes are fixed by the framework's own architecture (§2 + Part 2),
// not admin-editable.
export const serviceModules = pgTable("service_modules", {
  code: text("code").primaryKey(), // "GS" | "GA" | "AO" | "SS" | "RA" | "GX" | "P2"
  name: text("name").notNull(),
  focus: text("focus"),
});

export const serviceItems = pgTable("service_items", {
  id: text("id").primaryKey(), // the framework's own id, e.g. "ga-google-ads-mgmt" — stable and human-readable, so future consumers (onboardClient, the Proposer agent) can reference it directly
  moduleCode: text("module_code")
    .notNull()
    .references(() => serviceModules.code),
  deliverable: text("deliverable").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  billingType: billingTypeEnum("billing_type").notNull(),
  currentSetupPrice: numeric("current_setup_price", { precision: 12, scale: 2 }),
  currentMonthlyPrice: numeric("current_monthly_price", { precision: 12, scale: 2 }),
  suggestedSetupPrice: numeric("suggested_setup_price", { precision: 12, scale: 2 }),
  suggestedMonthlyPrice: numeric("suggested_monthly_price", { precision: 12, scale: 2 }),
  priceText: text("price_text"),
  notes: text("notes"),
  ...softDelete,
});

// Phase 12 — generated by generateNotifications() (src/lib/dal/notifications.ts),
// run on a schedule the same way purgeOldDoneTasks is (src/lib/dal/tasks.ts).
// recipientUserId null means "visible to any admin" — single-admin-scale
// per the brief, not a per-user targeting system. Email delivery of
// notifications themselves (as opposed to Phase 10's CRM-record email log)
// is still not built — this table remains in-app only.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientUserId: uuid("recipient_user_id").references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  payload: jsonb("payload"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Phase 13 — append-only, one row per computeClientHealthScores() run
// (src/lib/dal/health.ts), not an update-in-place "current score" field —
// trend (up/down/flat) is derived by comparing against the immediately
// preceding row for that client, so the history has to actually exist.
// Payment lateness uses clients.nextPaymentDate (already tracked since
// Phase 0/1) as a proxy — real Xero-sourced payment data is Phase 9,
// not built yet.
export const clientHealthScores = pgTable("client_health_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  trend: healthTrendEnum("trend").notNull(),
  paymentComponent: numeric("payment_component", { precision: 5, scale: 2 }).notNull(),
  taskComponent: numeric("task_component", { precision: 5, scale: 2 }).notNull(),
  activityComponent: numeric("activity_component", { precision: 5, scale: 2 }).notNull(),
  dealMomentumComponent: numeric("deal_momentum_component", { precision: 5, scale: 2 }).notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

// Phase 17 — general recurring-obligation scheduler (brief §13: "not a
// workflow/automation builder," deliberately narrow — fixed interval
// types, one task template per row, reusing the tasks table rather than
// inventing a second task mechanism, same as Phase 5's onboarding task
// generation). runDueRecurringTemplates() (src/lib/dal/recurringTemplates.ts)
// creates a task + notification and advances nextDueDate when a template
// comes due.
export const recurringTemplates = pgTable("recurring_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  interval: recurrenceIntervalEnum("interval").notNull(),
  intervalDays: numeric("interval_days", { precision: 5, scale: 0 }), // only meaningful when interval = "custom"
  nextDueDate: date("next_due_date").notNull(),
  taskTitle: text("task_title").notNull(),
  ...softDelete,
  ...actorColumns,
});

// Phase 18 — Mobile Operations Package. Deliberately NOT soft-deleted like
// every other table: the brief is explicit that old archives are hard-
// deleted (row + Storage object) the moment a new one supersedes them,
// specifically to minimize how many copies of "everything sensitive in
// one file" exist at once (db/sql/010_mop_and_login_events.sql grants
// this one table's app role DELETE, an intentional carve-out from the
// no-DELETE-grant rule everywhere else).
export const mopArchives = pgTable("mop_archives", {
  id: uuid("id").primaryKey().defaultRandom(),
  storagePath: text("storage_path").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  generatedBy: uuid("generated_by").references(() => users.id),
});

// Phase 19 — rules-based anomaly monitoring (brief §15: "not ML, not
// geographic impossible-travel heuristics — simple new-device/new-IP
// flagging"). Written from /api/auth/session (both the success and
// allowlist-rejection paths) via src/lib/dal/security.ts, since that's the
// one place every login attempt — successful or not — actually passes
// through.
export const loginEvents = pgTable("login_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

// Phase 9 — one admin's OAuth grant to Gray Horizon's single Xero
// organisation (standard interactive OAuth2, not a Custom Connection —
// Max's explicit choice over the $10/mo machine-to-machine alternative).
// Same encrypted-refresh-token pattern as googleConnections, own
// encryption key (XERO_TOKEN_ENCRYPTION_KEY) so rotating one integration's
// key never touches another's data. Org-wide, not per-user — Gray Horizon
// has exactly one Xero tenant, so there's no multi-tenant selection to
// model, unlike Calendar/Tasks which really are per-admin.
export const xeroConnections = pgTable("xero_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  tenantName: text("tenant_name"),
  encryptedRefreshToken: bytea("encrypted_refresh_token").notNull(),
  connectedBy: uuid("connected_by").references(() => users.id),
  ...softDelete,
});

// Phase 9 — read-only cache of Xero AR invoices (brief §5: "no new
// financial ledger... cache Xero API responses against client_id,
// refreshed on a schedule"). clientId is null until an admin links
// clients.xeroContactId to the matching Xero contact; unlinked invoices
// still get cached (so the business-wide rollup is complete) but won't
// show on any individual client's page until linked.
export const xeroInvoices = pgTable("xero_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  xeroInvoiceId: text("xero_invoice_id").notNull().unique(),
  clientId: uuid("client_id").references(() => clients.id),
  xeroContactId: text("xero_contact_id").notNull(),
  contactName: text("contact_name").notNull(),
  status: xeroInvoiceStatusEnum("status").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }),
  amountDue: numeric("amount_due", { precision: 12, scale: 2 }),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }),
  invoiceDate: date("invoice_date"),
  dueDate: date("due_date"),
  currencyCode: text("currency_code"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
});

// Phase 10 — Gmail send/receive against the same Google grant Phase 3
// establishes (extended scopes, not a second auth flow — see
// GOOGLE_SYNC_SCOPES in src/lib/google/oauth.ts). Every email is logged
// here regardless of whether it could be matched to a Contact; activityId
// stays null for unmatched inbound mail (surfaced in the /inbox triage
// view per brief §6) since activities' exactly-one-parent check has
// nothing to attach to until an admin links it to a Contact. Outbound
// email always has a contact/deal target and gets its Activity row in the
// same transaction as the send (brief §6: "sending *is* logging").
export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gmailMessageId: text("gmail_message_id").notNull().unique(),
    gmailThreadId: text("gmail_thread_id").notNull(),
    direction: emailDirectionEnum("direction").notNull(),
    fromAddress: text("from_address").notNull(),
    toAddresses: text("to_addresses").array().notNull(),
    subject: text("subject"),
    snippet: text("snippet"),
    contactId: uuid("contact_id").references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    activityId: uuid("activity_id").references(() => activities.id),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").references(() => users.id), // set for outbound only
    ...softDelete,
  },
  (table) => [
    check(
      "emails_at_most_one_parent",
      sql`(${table.dealId} IS NOT NULL)::int + (${table.contactId} IS NOT NULL)::int <= 1`
    ),
  ]
);

// Phase 10 — recurring send templates (brief §6: "stored as data... not
// hard-coded strings"). Body/subject carry {{variable}} placeholders,
// rendered at send time by src/lib/dal/emails.ts — no templating engine
// dependency added for what's simple string substitution.
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // e.g. "proposal_follow_up"
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  ...softDelete,
  ...actorColumns,
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
  // text, not uuid: every entity audited before Phase 7 happens to have a
  // uuid PK, but service_items uses the pricing framework's own
  // human-readable string ids (e.g. "ga-google-ads-mgmt") — this column was
  // never a real FK (entityType varies per row), so widening it to text
  // costs nothing for the existing uuid-keyed rows and fixes a real
  // insert-time type error for the new ones.
  entityId: text("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  fieldChanges: jsonb("field_changes"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});
