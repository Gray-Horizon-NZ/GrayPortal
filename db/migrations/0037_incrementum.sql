ALTER TYPE "public"."notification_type" ADD VALUE 'incrementum_lead';--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "incrementum_list_id" uuid;--> statement-breakpoint
ALTER TABLE "incrementum_contractor_profiles" ADD CONSTRAINT "incrementum_contractor_profiles_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_contractor_services" ADD CONSTRAINT "incrementum_contractor_services_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_contractor_services" ADD CONSTRAINT "incrementum_contractor_services_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_engagement_contractors" ADD CONSTRAINT "incrementum_engagement_contractors_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_engagement_contractors" ADD CONSTRAINT "incrementum_engagement_contractors_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_engagement_contractors" ADD CONSTRAINT "incrementum_engagement_contractors_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_engagement_cycles" ADD CONSTRAINT "incrementum_engagement_cycles_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_engagements" ADD CONSTRAINT "incrementum_engagements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_engagements" ADD CONSTRAINT "incrementum_engagements_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_engagements" ADD CONSTRAINT "incrementum_engagements_lead_id_incrementum_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."incrementum_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_goals" ADD CONSTRAINT "incrementum_goals_phase_id_incrementum_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."incrementum_phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_home_layouts" ADD CONSTRAINT "incrementum_home_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_hours" ADD CONSTRAINT "incrementum_hours_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_hours" ADD CONSTRAINT "incrementum_hours_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_launch_items" ADD CONSTRAINT "incrementum_launch_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_leads" ADD CONSTRAINT "incrementum_leads_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_leads" ADD CONSTRAINT "incrementum_leads_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_milestones" ADD CONSTRAINT "incrementum_milestones_phase_id_incrementum_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."incrementum_phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_lead_id_incrementum_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."incrementum_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_engagement_id_incrementum_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."incrementum_engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD CONSTRAINT "incrementum_needs_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_package_services" ADD CONSTRAINT "incrementum_package_services_package_id_incrementum_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."incrementum_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_package_services" ADD CONSTRAINT "incrementum_package_services_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_phase_criteria" ADD CONSTRAINT "incrementum_phase_criteria_phase_id_incrementum_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."incrementum_phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_playbooks" ADD CONSTRAINT "incrementum_playbooks_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_price_history" ADD CONSTRAINT "incrementum_price_history_service_id_incrementum_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."incrementum_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementum_services" ADD CONSTRAINT "incrementum_services_service_item_id_service_items_id_fk" FOREIGN KEY ("service_item_id") REFERENCES "public"."service_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "incrementum_ad_months_month_idx" ON "incrementum_ad_months" USING btree ("month") WHERE "incrementum_ad_months"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "incrementum_engagement_cycles_month_idx" ON "incrementum_engagement_cycles" USING btree ("engagement_id","month") WHERE "incrementum_engagement_cycles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "incrementum_weekly_reviews_week_idx" ON "incrementum_weekly_reviews" USING btree ("week_of") WHERE "incrementum_weekly_reviews"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_incrementum_list_id_incrementum_task_lists_id_fk" FOREIGN KEY ("incrementum_list_id") REFERENCES "public"."incrementum_task_lists"("id") ON DELETE no action ON UPDATE no action;