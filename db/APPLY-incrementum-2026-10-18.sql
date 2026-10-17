-- =========================================================================
-- GrayPortal: Project Incrementum + contractor scoping. ONE paste, in order.
-- Generated 2026-10-18 from:
--   1. db/migrations/0037_incrementum.sql   (tables, tasks column, notification type)
--   2. db/sql/030_incrementum.sql           (admin-only security on every new table)
--   3. db/sql/031_contractor_scoping.sql    (contractor lockdown, views, functions)
-- How: Neon console > SQL Editor > paste ALL of this > Run. Run it ONCE.
-- Then deploy the incrementum branch. (Deploying first breaks Tasks/Home.)
-- =========================================================================

-- ---------- 1. db/migrations/0037_incrementum.sql ----------
ALTER TYPE "public"."notification_type" ADD VALUE 'incrementum_lead';
CREATE TABLE "incrementum_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"type" text NOT NULL,
	"subject" text,
	"body" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meeting_start" timestamp with time zone,
	"meeting_end" timestamp with time zone,
	"google_event_id" text,
	"meet_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_ad_months" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"spend" numeric(12, 2) DEFAULT '0' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_contractor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"stage" text DEFAULT 'sourced' NOT NULL,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_name" text,
	"email" text,
	"phone" text,
	"location" text,
	"portfolio_url" text,
	"source" text,
	"skills" text[],
	"gst_registered" boolean,
	"payment_terms" text,
	"quality_rating" integer,
	"photo_url" text,
	"public_title" text,
	"bio" text,
	"pay_when_paid_accepted_at" date,
	"non_solicit_signed_at" date,
	"notice_period_days" integer,
	"agreement_url" text,
	"off_ramp_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "incrementum_contractor_profiles_contractor_id_unique" UNIQUE("contractor_id")
);

CREATE TABLE "incrementum_contractor_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"rate_type" text DEFAULT 'monthly' NOT NULL,
	"rate" numeric(12, 2),
	"capacity_slots" numeric(6, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_engagement_contractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"service_id" uuid,
	"role" text DEFAULT 'main' NOT NULL,
	"monthly_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"need_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_engagement_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"month" date NOT NULL,
	"delivered_at" date,
	"approved_at" date,
	"report_sent_at" date,
	"invoiced_at" date,
	"xero_invoice_number" text,
	"invoice_amount" numeric(12, 2),
	"client_paid_at" date,
	"contractor_bill_ref" text,
	"payout_amount" numeric(12, 2),
	"payout_due_at" date,
	"payout_paid_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"package_id" uuid,
	"lead_id" uuid,
	"name" text NOT NULL,
	"monthly_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"setup_price" numeric(12, 2),
	"slot_weight" numeric(6, 2) DEFAULT '1' NOT NULL,
	"start_date" date,
	"min_term_end" date,
	"status" text DEFAULT 'active' NOT NULL,
	"ended_at" date,
	"end_reason" text,
	"lessons" text,
	"health" text DEFAULT 'good' NOT NULL,
	"modules" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'change' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"metric_key" text,
	"pass_line" text,
	"kill_line" text,
	"started_at" date,
	"ends_at" date,
	"result" text,
	"verdict" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"metric_key" text,
	"comparator" text DEFAULT 'gte' NOT NULL,
	"target" numeric(12, 2),
	"period_start" date,
	"period_end" date,
	"launch_offset_days" integer,
	"manual_done_at" timestamp with time zone,
	"phase_id" uuid,
	"is_freedom" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_home_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"widgets" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "incrementum_home_layouts_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "incrementum_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid,
	"user_id" uuid,
	"work_date" date NOT NULL,
	"hours" numeric(6, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_launch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gate" text NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"critical" boolean DEFAULT true NOT NULL,
	"due_date" date,
	"notes" text,
	"evidence_url" text,
	"na_reason" text,
	"metric_key" text,
	"metric_target" numeric(12, 2),
	"task_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"website" text,
	"package_id" uuid,
	"service_interest" text,
	"ad_budget" text,
	"message" text,
	"stage" text DEFAULT 'new' NOT NULL,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"utm" jsonb,
	"gclid" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_response_at" timestamp with time zone,
	"lost_reason" text,
	"notes" text,
	"converted_client_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid,
	"title" text NOT NULL,
	"due_date" date,
	"launch_offset_days" integer,
	"done_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"engagement_id" uuid,
	"service_id" uuid NOT NULL,
	"title" text,
	"tags" text[],
	"quantity" numeric(8, 2) DEFAULT '1' NOT NULL,
	"contractor_id" uuid,
	"contractor_rate" numeric(12, 2),
	"markup_pct" numeric(6, 2),
	"sell_price" numeric(12, 2),
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_next_move_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"move_key" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_package_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"kind" text DEFAULT 'recurring' NOT NULL,
	"waived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"inclusions" text,
	"exclusions" text,
	"deliverables" text,
	"min_term_months" integer DEFAULT 3 NOT NULL,
	"notice_days" integer DEFAULT 30 NOT NULL,
	"landing_url" text,
	"manual_monthly_price" numeric(12, 2),
	"manual_setup_price" numeric(12, 2),
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_phase_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"label" text NOT NULL,
	"metric_key" text,
	"comparator" text DEFAULT 'gte' NOT NULL,
	"target" numeric(12, 2),
	"manual_done_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"purpose" text,
	"ad_budget" text,
	"services" text,
	"client_min" integer,
	"client_max" integer,
	"contractor_target" integer,
	"target_date" date,
	"launch_offset_days" integer,
	"entered_at" timestamp with time zone,
	"exited_at" timestamp with time zone,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"retro" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "incrementum_phases_number_unique" UNIQUE("number")
);

CREATE TABLE "incrementum_playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"old_price" numeric(12, 2),
	"new_price" numeric(12, 2),
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_item_id" text,
	"name" text NOT NULL,
	"billing" text DEFAULT 'monthly' NOT NULL,
	"quote_basis" text DEFAULT 'highest' NOT NULL,
	"expected_quote" numeric(12, 2),
	"markup_pct" numeric(6, 2),
	"catalogue_floor" boolean DEFAULT false NOT NULL,
	"manual_price" numeric(12, 2),
	"usually_waived" boolean DEFAULT false NOT NULL,
	"gst_basis" text DEFAULT 'exclusive' NOT NULL,
	"ranges" jsonb,
	"competitor_notes" text,
	"notes" text,
	"tags" text[],
	"status" text DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"default_markup_pct" numeric(6, 2) DEFAULT '33' NOT NULL,
	"freedom_target" numeric(12, 2) DEFAULT '10000' NOT NULL,
	"freedom_gold" numeric(12, 2) DEFAULT '15000' NOT NULL,
	"freedom_diamond" numeric(12, 2) DEFAULT '20000' NOT NULL,
	"ad_budget_total" numeric(12, 2) DEFAULT '2000' NOT NULL,
	"response_target_minutes" integer DEFAULT 60 NOT NULL,
	"default_slots_per_contractor" numeric(6, 2) DEFAULT '4' NOT NULL,
	"default_recruit_days" integer DEFAULT 21 NOT NULL,
	"launch_date" date,
	"home_mode_override" text,
	"contractor_access_reviewed_at" timestamp with time zone,
	"seeded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "incrementum_settings_key_unique" UNIQUE("key")
);

CREATE TABLE "incrementum_stage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_task_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

CREATE TABLE "incrementum_weekly_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_of" date NOT NULL,
	"notes" text,
	"wins" text,
	"actions" text[],
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);

ALTER TABLE "tasks" ADD COLUMN "incrementum_list_id" uuid;
ALTER TABLE "incrementum_contractor_profiles" ADD CONSTRAINT "incrementum_contractor_profiles_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_contractor_services" ADD CONSTRAINT "incrementum_contractor_services_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_contractor_services" ADD CONSTRAINT "incrementum_contractor_services_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_engagement_contractors" ADD CONSTRAINT "incrementum_engagement_contractors_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_engagement_contractors" ADD CONSTRAINT "incrementum_engagement_contractors_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_engagement_contractors" ADD CONSTRAINT "incrementum_engagement_contractors_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_engagement_cycles" ADD CONSTRAINT "incrementum_engagement_cycles_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_engagements" ADD CONSTRAINT "incrementum_engagements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_engagements" ADD CONSTRAINT "incrementum_engagements_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_engagements" ADD CONSTRAINT "incrementum_engagements_lead_id_incrementum_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."incrementum_leads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_goals" ADD CONSTRAINT "incrementum_goals_phase_id_incrementum_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."incrementum_phases"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_home_layouts" ADD CONSTRAINT "incrementum_home_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_hours" ADD CONSTRAINT "incrementum_hours_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_hours" ADD CONSTRAINT "incrementum_hours_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_launch_items" ADD CONSTRAINT "incrementum_launch_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_leads" ADD CONSTRAINT "incrementum_leads_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_leads" ADD CONSTRAINT "incrementum_leads_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_milestones" ADD CONSTRAINT "incrementum_milestones_phase_id_incrementum_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."incrementum_phases"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_lead_id_incrementum_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."incrementum_leads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_package_services" ADD CONSTRAINT "incrementum_package_services_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_package_services" ADD CONSTRAINT "incrementum_package_services_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_phase_criteria" ADD CONSTRAINT "incrementum_phase_criteria_phase_id_incrementum_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."incrementum_phases"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_playbooks" ADD CONSTRAINT "incrementum_playbooks_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_price_history" ADD CONSTRAINT "incrementum_price_history_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incrementum_services" ADD CONSTRAINT "incrementum_services_service_item_id_service_items_id_fk" FOREIGN KEY ("service_item_id") REFERENCES "public"."service_items"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "incrementum_ad_months_month_idx" ON "incrementum_ad_months" USING btree ("month") WHERE "incrementum_ad_months"."deleted_at" IS NULL;
CREATE UNIQUE INDEX "incrementum_engagement_cycles_month_idx" ON "incrementum_engagement_cycles" USING btree ("engagement_id","month") WHERE "incrementum_engagement_cycles"."deleted_at" IS NULL;
CREATE UNIQUE INDEX "incrementum_weekly_reviews_week_idx" ON "incrementum_weekly_reviews" USING btree ("week_of") WHERE "incrementum_weekly_reviews"."deleted_at" IS NULL;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_incrementum_list_id_incrementum_task_lists_id_fk" FOREIGN KEY ("incrementum_list_id") REFERENCES "public"."incrementum_task_lists"("id") ON DELETE no action ON UPDATE no action;

-- ---------- 2. db/sql/030_incrementum.sql ----------
-- Project Incrementum (docs/Project-Incrementum-Plan.md): every Incrementum
-- table is ADMIN-ONLY. Contractor rates, lead details, margins and payouts
-- are commercial data no contractor or client login may ever read, so this
-- is the same template as onboarding_invites_admin_only (026), applied to
-- every table at once. The public lead intake (api/incrementum/leads) and
-- seeding run under withAdminScope, which sets app.role = 'admin'.
-- Contractors see their own slice only through the contractor_* views in 031.
-- Run once, by hand, against the direct connection (NOT via
-- scripts/migrate.mjs). Apply after db/migrations/0037_incrementum.sql.

ALTER TABLE incrementum_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_activities_admin_only ON incrementum_activities FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_activities TO grayportal_app;

ALTER TABLE incrementum_ad_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_ad_months_admin_only ON incrementum_ad_months FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_ad_months TO grayportal_app;

ALTER TABLE incrementum_contractor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_contractor_profiles_admin_only ON incrementum_contractor_profiles FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_contractor_profiles TO grayportal_app;

ALTER TABLE incrementum_contractor_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_contractor_services_admin_only ON incrementum_contractor_services FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_contractor_services TO grayportal_app;

ALTER TABLE incrementum_engagement_contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_engagement_contractors_admin_only ON incrementum_engagement_contractors FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_engagement_contractors TO grayportal_app;

ALTER TABLE incrementum_engagement_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_engagement_cycles_admin_only ON incrementum_engagement_cycles FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_engagement_cycles TO grayportal_app;

ALTER TABLE incrementum_engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_engagements_admin_only ON incrementum_engagements FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_engagements TO grayportal_app;

ALTER TABLE incrementum_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_experiments_admin_only ON incrementum_experiments FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_experiments TO grayportal_app;

ALTER TABLE incrementum_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_goals_admin_only ON incrementum_goals FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_goals TO grayportal_app;

ALTER TABLE incrementum_home_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_home_layouts_admin_only ON incrementum_home_layouts FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_home_layouts TO grayportal_app;

ALTER TABLE incrementum_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_hours_admin_only ON incrementum_hours FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_hours TO grayportal_app;

ALTER TABLE incrementum_launch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_launch_items_admin_only ON incrementum_launch_items FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_launch_items TO grayportal_app;

ALTER TABLE incrementum_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_leads_admin_only ON incrementum_leads FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_leads TO grayportal_app;

ALTER TABLE incrementum_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_milestones_admin_only ON incrementum_milestones FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_milestones TO grayportal_app;

ALTER TABLE incrementum_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_needs_admin_only ON incrementum_needs FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_needs TO grayportal_app;

ALTER TABLE incrementum_next_move_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_next_move_dismissals_admin_only ON incrementum_next_move_dismissals FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_next_move_dismissals TO grayportal_app;

ALTER TABLE incrementum_package_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_package_services_admin_only ON incrementum_package_services FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_package_services TO grayportal_app;

ALTER TABLE incrementum_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_packages_admin_only ON incrementum_packages FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_packages TO grayportal_app;

ALTER TABLE incrementum_phase_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_phase_criteria_admin_only ON incrementum_phase_criteria FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_phase_criteria TO grayportal_app;

ALTER TABLE incrementum_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_phases_admin_only ON incrementum_phases FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_phases TO grayportal_app;

ALTER TABLE incrementum_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_playbooks_admin_only ON incrementum_playbooks FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_playbooks TO grayportal_app;

ALTER TABLE incrementum_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_price_history_admin_only ON incrementum_price_history FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_price_history TO grayportal_app;

ALTER TABLE incrementum_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_services_admin_only ON incrementum_services FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_services TO grayportal_app;

ALTER TABLE incrementum_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_settings_admin_only ON incrementum_settings FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_settings TO grayportal_app;

ALTER TABLE incrementum_stage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_stage_events_admin_only ON incrementum_stage_events FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_stage_events TO grayportal_app;

ALTER TABLE incrementum_task_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_task_lists_admin_only ON incrementum_task_lists FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_task_lists TO grayportal_app;

ALTER TABLE incrementum_weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY incrementum_weekly_reviews_admin_only ON incrementum_weekly_reviews FOR ALL
  USING (current_setting('app.role', true) = 'admin');
GRANT SELECT, INSERT, UPDATE ON incrementum_weekly_reviews TO grayportal_app;

-- No DELETE grants: soft deletes only, consistent with every other table.


-- ---------- 3. db/sql/031_contractor_scoping.sql ----------
-- 031: Contractor scoping (docs/Project-Incrementum-Plan.md §10 gap 1).
--
-- Before this file the contractor role had read AND write on companies,
-- contacts, activities, every client, every task, every client's prices,
-- the pricing catalogue, every email and template (audit 2026-10-18). For a
-- contractor-fulfilled business that hands a contractor the whole client
-- list and your margins. After it:
--
--   * every one of those policies is admin-only (or admin + the client's own
--     rows, for client-portal tables) — contractors lose direct access;
--   * contractors keep: tasks assigned to them, notifications addressed to
--     them, and their own users row (unchanged policy);
--   * everything a contractor legitimately needs comes through the
--     contractor_* views below, which expose ONLY safe columns (never what
--     the client pays, never other clients) for the signed-in contractor;
--   * the few things a contractor can change go through SECURITY DEFINER
--     functions that check the row is theirs.
--
-- Live definitions were read from pg_policies on 2026-10-18 and rewritten
-- with 'contractor' removed; nothing else in each expression changes.
-- Run once, by hand, against the direct connection (Neon SQL editor),
-- AFTER db/migrations/0037_incrementum.sql and db/sql/030_incrementum.sql.
-- Yuvi's existing contractor login has never signed in and has no tasks,
-- so nothing in use breaks.

-- ---------------------------------------------------------------------------
-- Part 1 — lock down the admin+contractor policies
-- ---------------------------------------------------------------------------

-- Internal tables: admin only.
ALTER POLICY activities_internal ON activities USING (current_setting('app.role', true) = 'admin');
ALTER POLICY client_health_scores_internal ON client_health_scores USING (current_setting('app.role', true) = 'admin');
ALTER POLICY companies_internal ON companies USING (current_setting('app.role', true) = 'admin');
ALTER POLICY contacts_internal ON contacts USING (current_setting('app.role', true) = 'admin');
ALTER POLICY contractors_internal ON contractors USING (current_setting('app.role', true) = 'admin');
ALTER POLICY email_templates_internal ON email_templates USING (current_setting('app.role', true) = 'admin');
ALTER POLICY emails_internal ON emails USING (current_setting('app.role', true) = 'admin');
ALTER POLICY recurring_templates_internal ON recurring_templates USING (current_setting('app.role', true) = 'admin');
ALTER POLICY service_items_internal ON service_items USING (current_setting('app.role', true) = 'admin');
ALTER POLICY service_modules_internal ON service_modules USING (current_setting('app.role', true) = 'admin');

-- Notifications: admins see all; a contractor only sees ones addressed to them.
ALTER POLICY notifications_internal ON notifications
  USING (
    current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'contractor'
        AND recipient_user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  );

-- Client-portal tables: admin, or the client's own rows (contractor removed).
ALTER POLICY client_activity_feed_scoped ON client_activity_feed
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_features_scoped ON client_features
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_health_channels_scoped ON client_health_channels
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_metrics_snapshots_scoped ON client_metrics_snapshots
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_services_scoped ON client_services
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY client_team_members_scoped ON client_team_members
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY documents_scoped ON documents
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY meeting_summaries_scoped ON meeting_summaries
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY referral_discounts_scoped ON referral_discounts
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY referrals_scoped ON referrals
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY roadmap_items_scoped ON roadmap_items
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));
ALTER POLICY tool_stack_items_scoped ON tool_stack_items
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));

-- Ideation: internal (client_id IS NULL) stays admin-only; per-client rows admin or own client.
ALTER POLICY ideation_items_scoped ON ideation_items
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));

-- Clients: admin, or a client's own row.
ALTER POLICY clients_internal_or_own ON clients
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'client' AND id = nullif(current_setting('app.client_id', true), '')::uuid));

-- Tasks: admin; a contractor's own assigned tasks (they can tick them off);
-- a client's own client's tasks. With no separate WITH CHECK, the same rule
-- applies to writes, so a contractor can only ever write tasks assigned to them.
ALTER POLICY tasks_scoped ON tasks
  USING (current_setting('app.role', true) = 'admin'
    OR (current_setting('app.role', true) = 'contractor' AND assigned_to = nullif(current_setting('app.user_id', true), '')::uuid)
    OR (current_setting('app.role', true) = 'client' AND client_id = nullif(current_setting('app.client_id', true), '')::uuid));

-- ---------------------------------------------------------------------------
-- Part 2 — who is the signed-in contractor?
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can read users past RLS; returns NULL for anyone
-- who isn't a contractor session, which makes every view below empty for
-- admins and clients.
CREATE OR REPLACE FUNCTION app_contractor_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.contractor_id
  FROM users u
  WHERE current_setting('app.role', true) = 'contractor'
    AND u.id = nullif(current_setting('app.user_id', true), '')::uuid
    AND u.deleted_at IS NULL
$$;

-- ---------------------------------------------------------------------------
-- Part 3 — contractor views (safe columns only, rows for the signed-in
-- contractor only). Views run as their owner, so they read past the
-- admin-only RLS on the incrementum_* tables; the WHERE clauses are the
-- boundary, and security_barrier stops predicates being pushed past them.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW contractor_me WITH (security_barrier = true) AS
  SELECT c.id AS contractor_id, c.name, c.specialty,
         p.business_name, p.email, p.phone, p.location, p.portfolio_url, p.skills,
         p.public_title, p.bio, p.photo_url, p.payment_terms,
         p.pay_when_paid_accepted_at, p.non_solicit_signed_at, p.notice_period_days,
         p.stage, p.stage_changed_at
  FROM contractors c
  JOIN incrementum_contractor_profiles p ON p.contractor_id = c.id AND p.deleted_at IS NULL
  WHERE c.id = app_contractor_id() AND c.deleted_at IS NULL;

CREATE OR REPLACE VIEW contractor_my_quotes WITH (security_barrier = true) AS
  SELECT cs.id, s.name AS service_name, cs.rate_type, cs.rate, cs.capacity_slots
  FROM incrementum_contractor_services cs
  JOIN incrementum_services s ON s.id = cs.service_id
  WHERE cs.contractor_id = app_contractor_id() AND cs.deleted_at IS NULL;

-- One row per (engagement, service) this contractor works on. monthly_cost
-- is what THEY are paid; what the client pays is never exposed.
CREATE OR REPLACE VIEW contractor_my_engagements WITH (security_barrier = true) AS
  SELECT ec.id AS assignment_id, e.id AS engagement_id, cl.name AS client_name,
         s.name AS service_name, ec.role, ec.monthly_cost AS my_monthly_rate,
         e.status, e.start_date, e.health
  FROM incrementum_engagement_contractors ec
  JOIN incrementum_engagements e ON e.id = ec.engagement_id AND e.deleted_at IS NULL
  JOIN clients cl ON cl.id = e.client_id
  LEFT JOIN incrementum_services s ON s.id = ec.service_id
  WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL AND e.status <> 'ended';

CREATE OR REPLACE VIEW contractor_my_cycles WITH (security_barrier = true) AS
  SELECT cy.id, cy.engagement_id, cl.name AS client_name, cy.month,
         cy.delivered_at, cy.approved_at, cy.report_sent_at,
         (cy.client_paid_at IS NOT NULL) AS client_paid,
         cy.payout_due_at, cy.payout_paid_at, cy.contractor_bill_ref,
         (SELECT coalesce(sum(ec2.monthly_cost), 0)
            FROM incrementum_engagement_contractors ec2
           WHERE ec2.engagement_id = cy.engagement_id
             AND ec2.contractor_id = app_contractor_id()
             AND ec2.deleted_at IS NULL) AS my_amount
  FROM incrementum_engagement_cycles cy
  JOIN incrementum_engagements e ON e.id = cy.engagement_id AND e.deleted_at IS NULL
  JOIN clients cl ON cl.id = e.client_id
  WHERE cy.deleted_at IS NULL
    AND cy.engagement_id IN (
      SELECT ec.engagement_id FROM incrementum_engagement_contractors ec
      WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL
    );

CREATE OR REPLACE VIEW contractor_my_tasks WITH (security_barrier = true) AS
  SELECT t.id, t.title, t.status, t.due_date, t.priority, t.completed_at, cl.name AS client_name
  FROM tasks t
  LEFT JOIN clients cl ON cl.id = t.client_id
  WHERE current_setting('app.role', true) = 'contractor'
    AND t.assigned_to = nullif(current_setting('app.user_id', true), '')::uuid
    AND t.deleted_at IS NULL;

-- Playbooks for the services this contractor has quoted, plus general ones
-- (e.g. the welcome pack).
CREATE OR REPLACE VIEW contractor_my_playbooks WITH (security_barrier = true) AS
  SELECT pb.id, pb.title, pb.body, pb.version, pb.updated_at, s.name AS service_name
  FROM incrementum_playbooks pb
  LEFT JOIN incrementum_services s ON s.id = pb.service_id
  WHERE pb.deleted_at IS NULL
    AND app_contractor_id() IS NOT NULL
    AND (pb.service_id IS NULL OR pb.service_id IN (
      SELECT cs.service_id FROM incrementum_contractor_services cs
      WHERE cs.contractor_id = app_contractor_id() AND cs.deleted_at IS NULL
    ));

-- The Gray Horizon Team directory: name, title, photo, bio, services only.
CREATE OR REPLACE VIEW contractor_team WITH (security_barrier = true) AS
  SELECT c.id AS contractor_id, c.name, p.public_title, p.photo_url, p.bio,
         p.stage_changed_at AS team_since,
         ARRAY(SELECT s.name FROM incrementum_contractor_services cs
               JOIN incrementum_services s ON s.id = cs.service_id
               WHERE cs.contractor_id = c.id AND cs.deleted_at IS NULL) AS services
  FROM incrementum_contractor_profiles p
  JOIN contractors c ON c.id = p.contractor_id AND c.deleted_at IS NULL
  WHERE p.stage = 'onboarded' AND p.deleted_at IS NULL
    AND app_contractor_id() IS NOT NULL;

CREATE OR REPLACE VIEW contractor_my_hours WITH (security_barrier = true) AS
  SELECT h.id, h.engagement_id, h.work_date, h.hours, h.note
  FROM incrementum_hours h
  WHERE current_setting('app.role', true) = 'contractor'
    AND h.user_id = nullif(current_setting('app.user_id', true), '')::uuid
    AND h.deleted_at IS NULL;

GRANT SELECT ON contractor_me, contractor_my_quotes, contractor_my_engagements, contractor_my_cycles,
  contractor_my_tasks, contractor_my_playbooks, contractor_team, contractor_my_hours TO grayportal_app;

-- ---------------------------------------------------------------------------
-- Part 4 — the few writes a contractor can make, each checking the row is theirs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION contractor_mark_delivered(p_cycle uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  UPDATE incrementum_engagement_cycles cy
     SET delivered_at = coalesce(cy.delivered_at, current_date), updated_at = now()
   WHERE cy.id = p_cycle AND cy.deleted_at IS NULL
     AND cy.engagement_id IN (SELECT ec.engagement_id FROM incrementum_engagement_contractors ec
                               WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL);
  IF NOT FOUND THEN RAISE EXCEPTION 'Not your month to update'; END IF;
END $$;

CREATE OR REPLACE FUNCTION contractor_submit_bill(p_cycle uuid, p_ref text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  IF length(coalesce(p_ref, '')) = 0 OR length(p_ref) > 200 THEN RAISE EXCEPTION 'Enter your invoice number'; END IF;
  UPDATE incrementum_engagement_cycles cy
     SET contractor_bill_ref = p_ref, updated_at = now()
   WHERE cy.id = p_cycle AND cy.deleted_at IS NULL AND cy.payout_paid_at IS NULL
     AND cy.engagement_id IN (SELECT ec.engagement_id FROM incrementum_engagement_contractors ec
                               WHERE ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL);
  IF NOT FOUND THEN RAISE EXCEPTION 'Not your month to update, or it is already paid'; END IF;
END $$;

CREATE OR REPLACE FUNCTION contractor_log_hours(p_engagement uuid, p_date date, p_hours numeric, p_note text) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  IF p_hours IS NULL OR p_hours <= 0 OR p_hours > 24 THEN RAISE EXCEPTION 'Hours must be between 0 and 24'; END IF;
  IF p_engagement IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM incrementum_engagement_contractors ec
        WHERE ec.engagement_id = p_engagement AND ec.contractor_id = app_contractor_id() AND ec.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Not your client';
  END IF;
  INSERT INTO incrementum_hours (engagement_id, user_id, work_date, hours, note, created_by, updated_by)
  VALUES (p_engagement, nullif(current_setting('app.user_id', true), '')::uuid, p_date, p_hours, p_note,
          nullif(current_setting('app.user_id', true), '')::uuid, nullif(current_setting('app.user_id', true), '')::uuid)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- Only the team-card / contact fields. Rates, stage, agreements and quality
-- stay Max's to set.
CREATE OR REPLACE FUNCTION contractor_update_profile(
  p_public_title text, p_bio text, p_photo_url text, p_phone text, p_location text, p_portfolio_url text, p_skills text[]
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_contractor_id() IS NULL THEN RAISE EXCEPTION 'Forbidden: not a contractor session'; END IF;
  UPDATE incrementum_contractor_profiles p
     SET public_title = p_public_title, bio = p_bio, photo_url = p_photo_url, phone = p_phone,
         location = p_location, portfolio_url = p_portfolio_url, skills = p_skills,
         updated_at = now(), updated_by = nullif(current_setting('app.user_id', true), '')::uuid
   WHERE p.contractor_id = app_contractor_id() AND p.deleted_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION app_contractor_id(), contractor_mark_delivered(uuid), contractor_submit_bill(uuid, text),
  contractor_log_hours(uuid, date, numeric, text),
  contractor_update_profile(text, text, text, text, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_contractor_id(), contractor_mark_delivered(uuid), contractor_submit_bill(uuid, text),
  contractor_log_hours(uuid, date, numeric, text),
  contractor_update_profile(text, text, text, text, text, text, text[]) TO grayportal_app;
