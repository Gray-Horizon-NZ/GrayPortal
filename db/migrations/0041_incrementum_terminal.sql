ALTER TABLE "incrementum_engagements" ADD COLUMN "review_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "min_bench" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "low_slots_warn" integer DEFAULT 1 NOT NULL;