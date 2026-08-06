CREATE TYPE "public"."ideation_status" AS ENUM('new', 'under_review', 'actioned', 'archived');--> statement-breakpoint
CREATE TYPE "public"."roadmap_status" AS ENUM('planned', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."tool_stack_status" AS ENUM('current', 'planned');--> statement-breakpoint
CREATE TABLE "ideation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "ideation_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "meeting_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "referral_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"referral_id" uuid NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '20' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_date" date,
	"status" "roadmap_status" DEFAULT 'planned' NOT NULL,
	"sort_order" numeric(6, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "tool_stack_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"category" text,
	"status" "tool_stack_status" DEFAULT 'current' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "referrals" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'submitted'::text;--> statement-breakpoint
-- Hand-added: drizzle-kit's generated diff doesn't know the old enum's
-- values no longer exist in the new one — remap any existing rows (Phase 2
-- shipped with pending/confirmed/credited/declined) while the column is
-- still plain text, before the enum swap below, or the cast on the final
-- line throws "invalid input value for enum" on any row using an old value.
UPDATE "referrals" SET "status" = CASE "status"
  WHEN 'pending' THEN 'submitted'
  WHEN 'confirmed' THEN 'contacted'
  WHEN 'credited' THEN 'discount_applied'
  ELSE "status"
END;--> statement-breakpoint
DROP TYPE "public"."referral_status";--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('submitted', 'contacted', 'converted', 'discount_applied', 'declined');--> statement-breakpoint
ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'submitted'::"public"."referral_status";--> statement-breakpoint
ALTER TABLE "referrals" ALTER COLUMN "status" SET DATA TYPE "public"."referral_status" USING "status"::"public"."referral_status";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "drive_folder_url" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "looker_studio_url" text;--> statement-breakpoint
ALTER TABLE "ideation_items" ADD CONSTRAINT "ideation_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_summaries" ADD CONSTRAINT "meeting_summaries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_discounts" ADD CONSTRAINT "referral_discounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_discounts" ADD CONSTRAINT "referral_discounts_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_stack_items" ADD CONSTRAINT "tool_stack_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;