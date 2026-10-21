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
  uniqueIndex,
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
// Independent of task_status above — this is "does this task appear on the
// client's Roadmap widget, and in which column," not "is it done." Nullable,
// no default: the common case is a task that's on nobody's roadmap at all.
// Only meaningful for tasks with a clientId set.
export const taskFunnelStageEnum = pgEnum("task_funnel_stage", ["next", "doing", "done"]);
// A tier above `starred` — starred is a cross-client highlight list,
// priority is urgency. Only "high" surfaces on the dashboard Alerts widget;
// "normal" is the default and never shown there.
export const taskPriorityEnum = pgEnum("task_priority", ["normal", "high"]);
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
  "grayscale_request",
  // Project Incrementum — a new lead arrived through the public Incrementum
  // intake (src/app/api/incrementum/leads/route.ts).
  "incrementum_lead",
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
// Email marketing (Open-Work-Brief.md §2, scoped down — no opt-out/legal
// distinction needed since these are relationship notifications to clients/
// prospects, not cold marketing). "clients_and_prospects" is the only
// audience widening beyond the always-available default of clients alone.
export const campaignAudienceEnum = pgEnum("campaign_audience", ["clients", "clients_and_prospects"]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
  "cancelled",
]);
// "skipped_no_email" is the only skip reason: no marketingOptOut concept
// here, so a queued recipient only ever fails to send because there's
// nothing to send to.
export const campaignRecipientStatusEnum = pgEnum("campaign_recipient_status", [
  "queued",
  "sent",
  "failed",
  "skipped_no_email",
]);
// Client onboarding wizard (Open-Work-Brief.md §4, foundation slice) — a
// resend mints a new row and flips the previous one to "revoked" rather than
// deleting it, so the invite history stays visible. No "expired" status: a
// row can be active but past expiresAt, checked at verify time rather than
// tracked via a background job.
export const onboardingInviteStatusEnum = pgEnum("onboarding_invite_status", [
  "active",
  "revoked",
]);
// Wizard step 3, "Request portal access" (Open-Work-Brief.md §4.2) — a
// client's request never mints a users row directly; it only ever queues
// here until an admin approves it from the client's own detail page.
export const accessRequestStatusEnum = pgEnum("access_request_status", [
  "pending",
  "approved",
  "denied",
]);
// Client portal GrayScale request widget (Open-Work-Brief.md §1.5) — no
// in-app fulfillment, just a manual-follow-up tracking flag Max flips
// after actually contacting the client.
export const grayscaleRequestStatusEnum = pgEnum("grayscale_request_status", [
  "new",
  "contacted",
]);

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
  // Onboarding wizard step 2 (Open-Work-Brief.md §4.3) — captured by admin
  // at onboarding time only if known; otherwise left blank and the client
  // fills them in themselves during the wizard's "Confirm your details"
  // step (updateOnboardingCompanyDetails, src/lib/dal/onboardingInvites.ts).
  mainEmail: text("main_email"),
  phone: text("phone"),
  mainContactPosition: text("main_contact_position"),
  address: text("address"),
  postalAddress: text("postal_address"),
  referredBy: text("referred_by"),
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
  // Applied on top of the sum of active client_services (which may already
  // carry their own per-service discountPercent) — e.g. a $2.4k package
  // with a 33% overall discount nets $1.608k. Two independent knobs: this
  // one for "this client's whole retainer is discounted X%" deals, the
  // per-service one for "this one line item is discounted" deals.
  overallDiscountPercent: numeric("overall_discount_percent", { precision: 5, scale: 2 }),
  // Same precedent as xeroContactId directly above — deliberately admin-set
  // from the client detail page, never auto-matched. Routes this client's
  // synced tasks into their own Google Tasks list instead of the shared
  // @default list — see src/lib/dal/googleConnection.ts's
  // resolveGoogleTasklistId.
  googleTaskListId: text("google_task_list_id"),
  // Admin-set, e.g. for a test-only client that will never have real
  // tasks — keeps Master Task View from carrying a permanently-empty
  // column. Doesn't affect the client portal or anywhere else the client
  // shows up, only Master Task View's own column list.
  hiddenFromTaskView: boolean("hidden_from_task_view").notNull().default(false),
  // Null until this client's portal first-login spotlight tour is skipped
  // or finished (whichever comes first); stamped once by markPortalTourSeen
  // so it never re-plays for this client's portal on later logins.
  portalTourSeenAt: timestamp("portal_tour_seen_at", { withTimezone: true }),
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

// A contact reaching out from more than one address (e.g. a work + personal
// inbox) is one person, not several — this table lets inbound-mail matching
// (syncInboundGmail) and the Client Emails view recognise every address as
// the same contact instead of only ever matching contacts.email. Deliberately
// separate from contacts.email rather than an array column: keeps the
// "canonical address" vs. "also known from" distinction explicit, and gives
// each alias its own createdBy/createdAt for audit purposes.
export const contactEmailAliases = pgTable(
  "contact_email_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    email: text("email").notNull(),
    ...softDelete,
    ...actorColumns,
  },
  // Partial (not plain) unique index: soft-deleting a wrong alias must free
  // the address up for re-adding elsewhere, same as every other soft-delete
  // + unique-key table in this app (e.g. emailTemplates.key has no such
  // index only because it's genuinely meant to be permanent).
  (table) => [
    uniqueIndex("contact_email_aliases_email_lower_idx")
      .on(sql`lower(${table.email})`)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

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
  // The Google Tasks list this task was actually synced into — resolved
  // once at sync time (resolveGoogleTasklistId) and persisted here so
  // later updates/deletes always target the list the task actually lives
  // in, even if the client's or internal list's mapping changes afterward.
  // Not the same as "what would resolve today" — that's a live lookup.
  googleTaskListId: text("google_task_list_id"),
  syncState: syncStateEnum("sync_state"),
  // Cross-client highlight list — independent of status/assignment, so a
  // starred task keeps showing in its own client's column AND in the
  // Starred view, not one or the other.
  starred: boolean("starred").notNull().default(false),
  priority: taskPriorityEnum("priority").notNull().default("normal"),
  // Only meaningful when clientId is null (an internal, non-client task) —
  // which of the two internal Master Task View columns it belongs to.
  // Text + app-layer validation (INTERNAL_LIST_KEYS in dal/tasks.ts),
  // matching the PORTAL_FEATURE_KEYS pattern elsewhere: an internal
  // registry, not a pgEnum, since the list of internal buckets is a UI
  // concern that shouldn't need a migration to extend.
  internalList: text("internal_list"),
  funnelStage: taskFunnelStageEnum("funnel_stage"),
  // Which roadmap phase (roadmap_items row) this task's funnel tagging
  // counts toward — added so RoadmapWidget's Focus Dial can show real
  // completion within the CURRENT phase specifically, not a global
  // done/total ratio across every funnel-tagged task on the roadmap
  // regardless of phase (Max: phase-relative progress reads as more
  // meaningful than whole-roadmap progress). Only meaningful alongside a
  // non-null funnelStage; null means "tagged for the funnel but not tied to
  // a specific phase yet," which the dial treats as not counted either way.
  phaseId: uuid("phase_id").references(() => roadmapItems.id),
  // Project Incrementum sub-list (docs/Project-Incrementum-Plan.md §7.6).
  // Only meaningful alongside internalList = "project_incrementum": null
  // means the Incrementum *main* list (shown in the Master Task View's gold
  // column), non-null means a sub-list task, which the Master Task View
  // deliberately hides. A sub-list task must still carry internalList —
  // a task with no client/deal/internalList falls into the first internal
  // column ("Gray Horizon") instead.
  incrementumListId: uuid("incrementum_list_id").references(() => incrementumTaskLists.id),
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
    // Human-readable name, distinct from docType — added because a
    // linked URL (externalUrl) had nothing to distinguish it from any
    // other "Other" document; a real filename only ever existed for
    // uploads (fileRef), and even that was never surfaced in the UI.
    title: text("title"),
    // Distinct from the row's own createdAt (when it was added to
    // GrayPortal) — this is a document-facing date (e.g. contract signed
    // date, proposal date), admin-set, optional, shown to the client.
    documentDate: date("document_date"),
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
// clientId is nullable so this table can also hold Max's own internal/
// business ideas (Open-Work-Brief.md §3) alongside per-client ideas — a
// null clientId means "internal," not "unset." `category` is a plain text
// column (not a pgEnum) referencing ideationCategories.key below by
// convention, not a real FK — the category list is admin-managed at
// runtime (Settings page), so a hard FK would make deleting a category
// cascade in ways that aren't wanted; the DAL validates the reference
// instead (src/lib/dal/ideation.ts). Only meaningful for internal
// (null-clientId) rows — per-client ideation ignores it.
export const ideationItems = pgTable("ideation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  status: ideationStatusEnum("status").notNull().default("new"),
  category: text("category"),
  ...softDelete,
  ...actorColumns,
});

// Admin-managed registry backing ideationItems.category, editable freely
// from Settings (Open-Work-Brief.md follow-up, 2026-08-26) rather than the
// hardcoded array it started as — `key` is the stable value stored on
// ideation_items.category (derived from `label`, slugified), `label` is
// what's shown in the UI. Admin-only, same as the internal ideas
// themselves (db/sql/023).
export const ideationCategories = pgTable("ideation_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

// AI Agent tab (Open-Work-Brief.md follow-up, 2026-08-26): Max's own
// roadmap of AI agents built for/with the business, same design as the
// internal Ideation tab but a fixed 3-stage lifecycle instead of a
// free-form category list — "active", "in_dev", "planned" are inherent
// pipeline stages, not open-ended tags, so this stays a pgEnum rather than
// an admin-editable registry like ideationCategories above.
export const aiAgentStatusEnum = pgEnum("ai_agent_status", ["planned", "in_dev", "active"]);

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: aiAgentStatusEnum("status").notNull().default("planned"),
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
  // Independent of clients.overallDiscountPercent — this discounts just
  // this one line item (e.g. "10% off Google Ads mgmt only") before the
  // client-wide discount is applied on top of the summed total.
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
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
  // Admin-picked subset of the connected account's calendars (Google
  // Calendar IDs, from calendarList.list) to merge into GrayPortal's
  // calendar reads — e.g. other Gmail accounts already shared/subscribed
  // into this account, or the admin's own personal calendar — plus a
  // display color per calendar, since events from different accounts need
  // to be visually distinguishable. `{ id: string; color: string }[]`.
  // Null means "not configured yet," which the adapter treats as
  // ["primary"] (uncolored) so existing behavior is unchanged until an
  // admin opts in via Settings.
  calendarSettings: jsonb("calendar_settings").$type<{ id: string; color: string }[]>(),
  ...softDelete,
});

// Maps GrayPortal's two fixed internal task-list keys (INTERNAL_LIST_KEYS
// in dal/tasks.ts — "gray_horizon", "gray_horizon_focus") to a Google Tasks
// list ID each, admin-set from Settings. A separate table rather than two
// columns on google_connections for the same reason internalList itself
// isn't a pgEnum: the internal-key set is an app-layer concern, and a table
// keyed by that text doesn't need a migration if the set changes.
export const internalTasklistMappings = pgTable("internal_tasklist_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  internalListKey: text("internal_list_key").notNull().unique(),
  googleTasklistId: text("google_tasklist_id").notNull(),
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
// stays null for unmatched inbound mail (surfaced in the /email-triage
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
// hard-coded strings"). Subject/htmlBody carry {{variable}} placeholders,
// rendered at send time by src/lib/dal/emails.ts — no templating engine
// dependency added for what's simple string substitution. htmlBody is
// hand-written/uploaded HTML (no drag-and-drop builder), rendered through
// src/lib/email/chrome.ts's wrapEmailHtml before it ever reaches Gmail; the
// multipart plain-text fallback is derived from it at send time rather than
// stored separately, so there's one authored source, not two to keep in
// sync.
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // e.g. "proposal_follow_up"
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  ...softDelete,
  ...actorColumns,
});

// Email marketing (Open-Work-Brief.md §2) — audience blast sends built on
// top of the same Gmail adapter/template system above. Deliberately no
// opt-out/unsubscribe machinery: these are relationship notifications to
// existing clients (and optionally pipeline prospects), not cold/unsolicited
// marketing, so the NZ Unsolicited Electronic Messages Act's bulk-marketing
// consent requirements don't apply the way they would for a newsletter.
export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  templateId: uuid("template_id").references(() => emailTemplates.id), // nullable — ad hoc content allowed
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  audience: campaignAudienceEnum("audience").notNull().default("clients"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...softDelete,
  ...actorColumns,
});

// One row per resolved recipient, inserted when a campaign is queued
// (resolveAudience runs at send time, not draft time — a contact added to a
// client company after the draft was created is still included). This is
// what makes sending resumable/auditable per-recipient and what the
// throttled cron sender (api/cron/run-email-campaigns) iterates over in
// small batches rather than sending the whole audience in one request.
export const campaignRecipients = pgTable("campaign_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => emailCampaigns.id),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  status: campaignRecipientStatusEnum("status").notNull().default("queued"),
  gmailMessageId: text("gmail_message_id"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  // First-open signal only (not a count) — set once, by the unauthenticated
  // tracking-pixel route (api/track/open/[recipientId]) embedded in every
  // campaign send's HTML, never touched again after the first hit. Null
  // means "not known to have opened," not "definitely never opened" — many
  // mail clients block remote images by default, so this is a floor on the
  // real open rate, not an exact count.
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Client onboarding wizard — the portal-setup link's token/magic-link table
// (Open-Work-Brief.md §4, foundation slice; no such mechanism existed
// anywhere in the app before this). Only the SHA-256 hash of the token is
// ever stored — the raw token exists only in the URL/email, never at rest.
// Row-per-send, not row-per-client: resending revokes the previous row
// (see onboardingInviteStatusEnum) instead of updating it in place, so the
// send history stays visible for audit.
export const onboardingInvites = pgTable("onboarding_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  status: onboardingInviteStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
});

// Wizard step 3 — see accessRequestStatusEnum above. Never inserted with a
// users row alongside it: submitPortalAccessRequest only ever writes this
// row (src/lib/dal/portalAccessRequests.ts), and the real users row (the
// actual login) is created only on approvePortalAccessRequest.
export const portalAccessRequests = pgTable("portal_access_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  email: text("email").notNull(),
  displayName: text("display_name"),
  status: accessRequestStatusEnum("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: uuid("decided_by").references(() => users.id),
  // Required by auditedUpdate (src/lib/dal/mutate.ts), which unconditionally
  // stamps updatedAt on every row it touches — approvePortalAccessRequest/
  // denyPortalAccessRequest both go through it.
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The first client-writable table in the app — every other portal page is
// read-only for role=client (confirmed while building the onboarding
// wizard). submitGrayscaleRequest (src/lib/dal/grayscaleRequests.ts)
// validates `products` against the real catalogue (src/config/grayscale.ts)
// before insert; never trust this array as pre-validated just because it's
// client-submitted.
// The GrayScale product catalogue — previously a hardcoded array in
// src/config/grayscale.ts (a human copy-paste from the marketing site's own
// structured data). Admin-editable now so the catalogue can change without
// a code deploy. `name` stays the join key grayscale_requests.products
// (a plain text[]) validates against — that table isn't touched by this
// one, so no migration needed there.
export const grayscaleProducts = pgTable("grayscale_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Unique so the one-off backfill script (scripts/import-grayscale-products.mjs)
  // can upsert on it (ON CONFLICT (name) DO NOTHING) and so the admin CRUD
  // page can't accidentally create a duplicate product.
  name: text("name").notNull().unique(),
  category: text("category"),
  description: text("description"),
  // Editable list price, NZD/month — seeded from the live grayhorizon.nz/grayscale
  // catalogue (scripts/backfill-grayscale-pricing.mjs), then admin-editable
  // going forward. Nullable: a product can exist before pricing is settled.
  monthlyPriceNzd: numeric("monthly_price_nzd", { precision: 10, scale: 2 }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const grayscaleRequests = pgTable("grayscale_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  products: text("products").array().notNull(),
  note: text("note"),
  status: grayscaleRequestStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  contactedBy: uuid("contacted_by").references(() => users.id),
  // Required by auditedUpdate — markGrayscaleRequestContacted goes through it.
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Business expenses — recurring software/tool costs (the Notion "Business
// Expenses" table Max already keeps), admin-only per db/sql/018. Feeds the
// personal finance calculator's monthly-expenses figure as a live source
// rather than manual per-period re-entry, and stands alone as a dedicated
// cost/write-off tracker in its own right.
// ---------------------------------------------------------------------------

export const businessExpenses = pgTable("business_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category"), // e.g. "Paperwork", "Finance", "CRM" — free text, matches the reference sheet
  label: text("label").notNull(), // e.g. "Google Workspace", "Xero"
  yearlyAmountNzd: numeric("yearly_amount_nzd", { precision: 10, scale: 2 }),
  monthlyAmountNzd: numeric("monthly_amount_nzd", { precision: 10, scale: 2 }),
  isWriteoff: boolean("is_writeoff").notNull().default(false),
  gstYearlyNzd: numeric("gst_yearly_nzd", { precision: 10, scale: 2 }),
  gstMonthlyNzd: numeric("gst_monthly_nzd", { precision: 10, scale: 2 }),
  ...softDelete,
  ...actorColumns,
});

// Recurring monthly dev/contractor cost splits — e.g. Yuvi gets half of the
// $180/mo DM Rider Training subscription fee ($90/mo), as a standing
// commitment rather than a one-off. Deliberately separate from
// businessExpenses above (that's software/tool write-offs with GST
// tracking; this is a personnel pass-through with neither) and from
// personalFinanceContractorPayments below (that's an ad-hoc payment logged
// against one historical period; this is a live, always-current recurring
// figure the Owner's Cut Calculator subtracts every time it's viewed).
// clientId is optional context — which client's fee this split comes from —
// not a scoping/security boundary.
export const devCosts = pgTable("dev_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  payee: text("payee").notNull(), // e.g. "Yuvi"
  label: text("label").notNull(), // e.g. "DM Rider subscription split"
  monthlyAmountNzd: numeric("monthly_amount_nzd", { precision: 10, scale: 2 }).notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

// ---------------------------------------------------------------------------
// Personal finance (Phase 23) — Max's own income-split calculator, kept
// deliberately separate from the client-facing `clients`/Xero tables above:
// no clientId anywhere here, admin-only per db/sql/017 (same posture as
// credentials, not the admin+contractor posture pricing uses). One period
// per income snapshot (e.g. "May 2025", "Est 2026"), with its expense and
// contractor-payment line items as child rows — mirrors the reference
// model Max supplied rather than a single flat number, since both change
// month to month.
// ---------------------------------------------------------------------------

export const personalFinancePeriods = pgTable("personal_finance_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(), // e.g. "May 2025", "Est 2026"
  // Gross income for the period, before the flat tax-reduction step.
  grossIncomeNzd: numeric("gross_income_nzd", { precision: 12, scale: 2 }).notNull(),
  // Deliberately flat, not bracket math — Max's own choice (overshoot the
  // actual liability on purpose for a year-end refund, not a precise
  // year-end tax bill estimate). Stored per-period, not hardcoded, so a
  // change in strategy doesn't require a code change.
  taxReductionPercent: numeric("tax_reduction_percent", { precision: 5, scale: 2 }).notNull().default("17.5"),
  // Target weekly personal draw used to size the "$600/week"-style buffer
  // goals — optional because not every period has one set.
  targetWeeklyDrawNzd: numeric("target_weekly_draw_nzd", { precision: 10, scale: 2 }),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

export const personalFinanceExpenseItems = pgTable("personal_finance_expense_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => personalFinancePeriods.id),
  label: text("label").notNull(),
  amountNzd: numeric("amount_nzd", { precision: 10, scale: 2 }).notNull(),
  ...softDelete,
});

// Ad-hoc contractor payouts for a period (e.g. "$90 to Yuvi from Dugal") —
// a deduction line item between post-tax cashflow and take-home pay, kept
// separate from the `contractors`/hourly-rate table since this is a record
// of an actual payment made, not a rate card.
export const personalFinanceContractorPayments = pgTable("personal_finance_contractor_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => personalFinancePeriods.id),
  payee: text("payee").notNull(),
  amountNzd: numeric("amount_nzd", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
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

// ---------------------------------------------------------------------------
// Project Incrementum (docs/Project-Incrementum-Plan.md) — the management
// space for the 27ADS contractor-fulfilled retainer scheme. Every table
// below is ADMIN-ONLY at RLS (db/sql/030_incrementum.sql): contractor rates,
// lead details, margins and payouts are commercial data no contractor or
// client login may ever read. That's also why contractor CRM fields live in
// incrementum_contractor_profiles instead of on `contractors` itself —
// `contractors` is readable by every contractor login (db/sql/014).
// Stage/status/metric columns are text + app-layer registries
// (src/lib/incrementum/*), same reasoning as INTERNAL_LIST_KEYS: the lists
// are expected to change without a migration.
// ---------------------------------------------------------------------------

// One row (key = "singleton"). Seeding of every other Incrementum table is
// keyed off this row's existence — see ensureIncrementumSeeded().
export const incrementumSettings = pgTable("incrementum_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  defaultMarkupPct: numeric("default_markup_pct", { precision: 6, scale: 2 }).notNull().default("33"),
  freedomTarget: numeric("freedom_target", { precision: 12, scale: 2 }).notNull().default("10000"),
  freedomGold: numeric("freedom_gold", { precision: 12, scale: 2 }).notNull().default("15000"),
  freedomDiamond: numeric("freedom_diamond", { precision: 12, scale: 2 }).notNull().default("20000"),
  adBudgetTotal: numeric("ad_budget_total", { precision: 12, scale: 2 }).notNull().default("2000"),
  responseTargetMinutes: integer("response_target_minutes").notNull().default(60),
  // Assumption used by Capacity until real contractor capacity exists.
  defaultSlotsPerContractor: numeric("default_slots_per_contractor", { precision: 6, scale: 2 }).notNull().default("4"),
  defaultRecruitDays: integer("default_recruit_days").notNull().default(21),
  launchDate: date("launch_date"),
  // null = automatic (pre-launch until launchDate is set), else "pre"/"live".
  homeModeOverride: text("home_mode_override"),
  // Set when Max confirms contractor-role access has been reviewed (plan
  // §7.4's blocker). "Onboard to GrayPortal" stays disabled until then.
  contractorAccessReviewedAt: timestamp("contractor_access_reviewed_at", { withTimezone: true }),
  seededAt: timestamp("seeded_at", { withTimezone: true }),
  ...softDelete,
  ...actorColumns,
});

// Services & Pricing (plan §7.1). A layer over the main catalogue
// (service_items) — never overwrites it.
// Contractor roles (Max, 2026-10-21): the fixed, Settings-managed list of
// contractor types (Ads specialist, Website contractor, Designer, Tech).
// Each service needs one role; each contractor covers one or more. A
// client's lines are grouped by role, one contractor per role.
export const incrementumContractorRoles = pgTable("incrementum_contractor_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const incrementumServices = pgTable("incrementum_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceItemId: text("service_item_id").references(() => serviceItems.id),
  name: text("name").notNull(),
  // monthly | one_off | range
  billing: text("billing").notNull().default("monthly"),
  // highest | average | lowest | manual — which contractor quote prices are built on.
  quoteBasis: text("quote_basis").notNull().default("highest"),
  // The expected contractor quote, used when no bench contractor has quoted
  // yet (or always, when quoteBasis = "manual").
  expectedQuote: numeric("expected_quote", { precision: 12, scale: 2 }),
  markupPct: numeric("markup_pct", { precision: 6, scale: 2 }), // null = settings default
  // When true, sell price = max(quote × markup, catalogue Current price).
  catalogueFloor: boolean("catalogue_floor").notNull().default(false),
  manualPrice: numeric("manual_price", { precision: 12, scale: 2 }),
  usuallyWaived: boolean("usually_waived").notNull().default(false),
  gstBasis: text("gst_basis").notNull().default("exclusive"),
  // Page-count bands etc. for range services.
  ranges: jsonb("ranges").$type<{ label: string; min: number | null; max: number | null }[]>(),
  competitorNotes: text("competitor_notes"),
  notes: text("notes"),
  // Identifiers used to match client needs to contractors (lower-case slugs,
  // e.g. "google-ads", "shopify"). A contractor matches a need when they've
  // quoted the need's service, or when their skills share one of its tags.
  tags: text("tags").array(),
  // The contractor role that delivers it; null = no contractor (e.g. Max's own Creative Strategy).
  roleId: uuid("role_id").references(() => incrementumContractorRoles.id),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const incrementumPriceHistory = pgTable("incrementum_price_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => incrementumServices.id),
  oldPrice: numeric("old_price", { precision: 12, scale: 2 }),
  newPrice: numeric("new_price", { precision: 12, scale: 2 }),
  reason: text("reason"),
  ...softDelete,
  ...actorColumns,
});

export const incrementumPackages = pgTable("incrementum_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  inclusions: text("inclusions"),
  exclusions: text("exclusions"),
  deliverables: text("deliverables"),
  minTermMonths: integer("min_term_months").notNull().default(3),
  noticeDays: integer("notice_days").notNull().default(30),
  landingUrl: text("landing_url"),
  // Optional hand-set prices; null = calculated from the package's services.
  manualMonthlyPrice: numeric("manual_monthly_price", { precision: 12, scale: 2 }),
  manualSetupPrice: numeric("manual_setup_price", { precision: 12, scale: 2 }),
  // draft | live | retired
  status: text("status").notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const incrementumPackageServices = pgTable("incrementum_package_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").notNull().references(() => incrementumPackages.id),
  serviceId: uuid("service_id").notNull().references(() => incrementumServices.id),
  // recurring | setup
  kind: text("kind").notNull().default("recurring"),
  waived: boolean("waived").notNull().default(false),
  ...softDelete,
  ...actorColumns,
});

// Contractor CRM data (plan §7.4). 1:1 with `contractors`.
export const incrementumContractorProfiles = pgTable("incrementum_contractor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: uuid("contractor_id").notNull().unique().references(() => contractors.id),
  stage: text("stage").notNull().default("sourced"),
  stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).notNull().defaultNow(),
  businessName: text("business_name"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  portfolioUrl: text("portfolio_url"),
  source: text("source"),
  skills: text("skills").array(),
  // incrementum_contractor_roles ids this contractor can fill.
  roleIds: uuid("role_ids").array(),
  gstRegistered: boolean("gst_registered"),
  paymentTerms: text("payment_terms"),
  qualityRating: integer("quality_rating"),
  photoUrl: text("photo_url"),
  publicTitle: text("public_title"),
  bio: text("bio"),
  payWhenPaidAcceptedAt: date("pay_when_paid_accepted_at"),
  nonSolicitSignedAt: date("non_solicit_signed_at"),
  noticePeriodDays: integer("notice_period_days"),
  agreementUrl: text("agreement_url"),
  offRampReason: text("off_ramp_reason"),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

export const incrementumContractorServices = pgTable("incrementum_contractor_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractorId: uuid("contractor_id").notNull().references(() => contractors.id),
  serviceId: uuid("service_id").notNull().references(() => incrementumServices.id),
  // monthly | hourly | project
  rateType: text("rate_type").notNull().default("monthly"),
  rate: numeric("rate", { precision: 12, scale: 2 }),
  capacitySlots: numeric("capacity_slots", { precision: 6, scale: 2 }),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

// Leads (plan §7.2) — kept separate from the main CRM until "Onboard client".
export const incrementumLeads = pgTable("incrementum_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  packageId: uuid("package_id").references(() => incrementumPackages.id),
  serviceInterest: text("service_interest"),
  adBudget: text("ad_budget"),
  message: text("message"),
  stage: text("stage").notNull().default("new"),
  stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull().default("manual"),
  utm: jsonb("utm").$type<Record<string, string>>(),
  gclid: text("gclid"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  lostReason: text("lost_reason"),
  notes: text("notes"),
  convertedClientId: uuid("converted_client_id").references(() => clients.id),
  ...softDelete,
  ...actorColumns,
});

// Stage history for contractors and leads (entityType "contractor" | "lead").
export const incrementumStageEvents = pgTable("incrementum_stage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  note: text("note"),
  ...softDelete,
  ...actorColumns,
});

// Timeline for contractors, leads and engagements: note | call | email | meeting.
export const incrementumActivities = pgTable("incrementum_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  type: text("type").notNull(),
  subject: text("subject"),
  body: text("body"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  meetingStart: timestamp("meeting_start", { withTimezone: true }),
  meetingEnd: timestamp("meeting_end", { withTimezone: true }),
  googleEventId: text("google_event_id"),
  meetLink: text("meet_link"),
  ...softDelete,
  ...actorColumns,
});

// Engagements (plan §7.3): client + package + contractors + signed price.
export const incrementumEngagements = pgTable("incrementum_engagements", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  packageId: uuid("package_id").references(() => incrementumPackages.id),
  leadId: uuid("lead_id").references(() => incrementumLeads.id),
  name: text("name").notNull(),
  // Signed prices — never recalculated from Services & Pricing afterwards.
  monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  setupPrice: numeric("setup_price", { precision: 12, scale: 2 }),
  slotWeight: numeric("slot_weight", { precision: 6, scale: 2 }).notNull().default("1"),
  startDate: date("start_date"),
  minTermEnd: date("min_term_end"),
  // active | paused | ended
  status: text("status").notNull().default("active"),
  endedAt: date("ended_at"),
  endReason: text("end_reason"),
  lessons: text("lessons"),
  // good | watch | at_risk
  health: text("health").notNull().default("good"),
  modules: jsonb("modules").$type<Record<string, boolean>>(),
  notes: text("notes"),
  ...softDelete,
  ...actorColumns,
});

export const incrementumEngagementContractors = pgTable("incrementum_engagement_contractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  engagementId: uuid("engagement_id").notNull().references(() => incrementumEngagements.id),
  contractorId: uuid("contractor_id").notNull().references(() => contractors.id),
  serviceId: uuid("service_id").references(() => incrementumServices.id),
  // main | backup
  role: text("role").notNull().default("main"),
  monthlyCost: numeric("monthly_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  // Set when this assignment came from a client need (quote builder).
  needId: uuid("need_id"),
  ...softDelete,
  ...actorColumns,
});

// One row per engagement per month: deliver → approve → report → invoice →
// client paid → contractor payout (the pay-when-paid ledger, plan §7.9).
export const incrementumEngagementCycles = pgTable(
  "incrementum_engagement_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    engagementId: uuid("engagement_id").notNull().references(() => incrementumEngagements.id),
    month: date("month").notNull(), // first day of the month
    deliveredAt: date("delivered_at"),
    approvedAt: date("approved_at"),
    reportSentAt: date("report_sent_at"),
    invoicedAt: date("invoiced_at"),
    xeroInvoiceNumber: text("xero_invoice_number"),
    invoiceAmount: numeric("invoice_amount", { precision: 12, scale: 2 }),
    clientPaidAt: date("client_paid_at"),
    contractorBillRef: text("contractor_bill_ref"),
    payoutAmount: numeric("payout_amount", { precision: 12, scale: 2 }),
    payoutDueAt: date("payout_due_at"),
    payoutPaidAt: date("payout_paid_at"),
    notes: text("notes"),
    ...softDelete,
    ...actorColumns,
  },
  (table) => [
    uniqueIndex("incrementum_engagement_cycles_month_idx")
      .on(table.engagementId, table.month)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const incrementumHours = pgTable("incrementum_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  engagementId: uuid("engagement_id").references(() => incrementumEngagements.id),
  userId: uuid("user_id").references(() => users.id),
  workDate: date("work_date").notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  note: text("note"),
  ...softDelete,
  ...actorColumns,
});

// Launch Readiness checklist (plan §6). metricKey + metricTarget make an
// item automatic (it ticks itself from live data and can't be ticked by hand).
export const incrementumLaunchItems = pgTable("incrementum_launch_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  gate: text("gate").notNull(),
  title: text("title").notNull(),
  detail: text("detail"),
  // not_started | in_progress | done | na | blocked
  status: text("status").notNull().default("not_started"),
  critical: boolean("critical").notNull().default(true),
  dueDate: date("due_date"),
  notes: text("notes"),
  evidenceUrl: text("evidence_url"),
  naReason: text("na_reason"),
  metricKey: text("metric_key"),
  metricTarget: numeric("metric_target", { precision: 12, scale: 2 }),
  taskId: uuid("task_id").references(() => tasks.id),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const incrementumTaskLists = pgTable("incrementum_task_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...softDelete,
  ...actorColumns,
});

// Growth phases (plan §1.2) — also the roadmap's phases.
export const incrementumPhases = pgTable("incrementum_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  purpose: text("purpose"),
  adBudget: text("ad_budget"),
  services: text("services"),
  clientMin: integer("client_min"),
  clientMax: integer("client_max"),
  contractorTarget: integer("contractor_target"),
  targetDate: date("target_date"),
  // When set, targetDate = launch date + this many days (resolved at read
  // time from incrementum_settings.launch_date; "TBD" until it's set).
  launchOffsetDays: integer("launch_offset_days"),
  enteredAt: timestamp("entered_at", { withTimezone: true }),
  exitedAt: timestamp("exited_at", { withTimezone: true }),
  // upcoming | active | done
  status: text("status").notNull().default("upcoming"),
  retro: text("retro"),
  ...softDelete,
  ...actorColumns,
});

export const incrementumPhaseCriteria = pgTable("incrementum_phase_criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id").notNull().references(() => incrementumPhases.id),
  label: text("label").notNull(),
  metricKey: text("metric_key"), // null = manual
  comparator: text("comparator").notNull().default("gte"),
  target: numeric("target", { precision: 12, scale: 2 }),
  manualDoneAt: timestamp("manual_done_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const incrementumMilestones = pgTable("incrementum_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id").references(() => incrementumPhases.id),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  launchOffsetDays: integer("launch_offset_days"),
  doneAt: timestamp("done_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const incrementumGoals = pgTable("incrementum_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  metricKey: text("metric_key"), // null = manual
  comparator: text("comparator").notNull().default("gte"),
  target: numeric("target", { precision: 12, scale: 2 }),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  // Launch-relative goals: period runs from the launch date to launch + N days.
  launchOffsetDays: integer("launch_offset_days"),
  manualDoneAt: timestamp("manual_done_at", { withTimezone: true }),
  phaseId: uuid("phase_id").references(() => incrementumPhases.id),
  isFreedom: boolean("is_freedom").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});

export const incrementumAdMonths = pgTable(
  "incrementum_ad_months",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    month: date("month").notNull(),
    spend: numeric("spend", { precision: 12, scale: 2 }).notNull().default("0"),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    notes: text("notes"),
    ...softDelete,
    ...actorColumns,
  },
  (table) => [
    uniqueIndex("incrementum_ad_months_month_idx").on(table.month).where(sql`${table.deletedAt} IS NULL`),
  ]
);

// Experiments (plan §7.12): change log, pass/kill tests, retros.
export const incrementumExperiments = pgTable("incrementum_experiments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // change | test | retro
  type: text("type").notNull().default("change"),
  title: text("title").notNull(),
  body: text("body"),
  metricKey: text("metric_key"),
  passLine: text("pass_line"),
  killLine: text("kill_line"),
  startedAt: date("started_at"),
  endsAt: date("ends_at"),
  result: text("result"),
  // pass | fail | inconclusive
  verdict: text("verdict"),
  ...softDelete,
  ...actorColumns,
});

export const incrementumPlaybooks = pgTable("incrementum_playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").references(() => incrementumServices.id),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  version: integer("version").notNull().default(1),
  ...softDelete,
  ...actorColumns,
});

export const incrementumWeeklyReviews = pgTable(
  "incrementum_weekly_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekOf: date("week_of").notNull(), // the Monday
    notes: text("notes"),
    wins: text("wins"),
    actions: text("actions").array(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...softDelete,
    ...actorColumns,
  },
  (table) => [
    uniqueIndex("incrementum_weekly_reviews_week_idx").on(table.weekOf).where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const incrementumHomeLayouts = pgTable("incrementum_home_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  // Ordered widget keys + hidden set.
  widgets: jsonb("widgets").$type<{ order: string[]; hidden: string[] }>().notNull(),
  ...softDelete,
  ...actorColumns,
});

export const incrementumNextMoveDismissals = pgTable("incrementum_next_move_dismissals", {
  id: uuid("id").primaryKey().defaultRandom(),
  moveKey: text("move_key").notNull(),
  note: text("note"),
  ...softDelete,
  ...actorColumns,
});

// Client needs (quote builder): what a lead/client is after, one row per
// service line. Assigning a contractor snapshots their rate; the estimated
// sell price is rate × (1 + markup), or a hand-set override. On "Onboard
// client" the needs move onto the engagement (engagementId set) and become
// its contractor team and signed price.
export const incrementumNeeds = pgTable("incrementum_needs", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").references(() => incrementumLeads.id),
  engagementId: uuid("engagement_id").references(() => incrementumEngagements.id),
  // Exactly one of serviceId (an Incrementum service) or serviceItemId (an
  // off-list GrayPortal catalogue item, on this client only, priced from
  // the catalogue into sellPrice).
  serviceId: uuid("service_id").references(() => incrementumServices.id),
  serviceItemId: text("service_item_id").references(() => serviceItems.id),
  // Overrides the service's role (and is the only role an off-list line has).
  roleId: uuid("role_id").references(() => incrementumContractorRoles.id),
  // Set when the line was copied in from a package: its bundle discount applies.
  packageId: uuid("package_id").references(() => incrementumPackages.id),
  // recurring | setup — from the package line; null = the service's own billing.
  kind: text("kind"),
  waived: boolean("waived").notNull().default(false),
  title: text("title"),
  tags: text("tags").array(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
  contractorId: uuid("contractor_id").references(() => contractors.id),
  contractorRate: numeric("contractor_rate", { precision: 12, scale: 2 }),
  markupPct: numeric("markup_pct", { precision: 6, scale: 2 }),
  sellPrice: numeric("sell_price", { precision: 12, scale: 2 }),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...softDelete,
  ...actorColumns,
});
