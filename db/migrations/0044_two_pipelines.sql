CREATE TYPE "public"."pipeline" AS ENUM('services', 'software');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'demo_opened';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'walkthrough_request';--> statement-breakpoint
ALTER TYPE "public"."stage" ADD VALUE 'Inquired';--> statement-breakpoint
ALTER TYPE "public"."stage" ADD VALUE 'Discovery call';--> statement-breakpoint
ALTER TYPE "public"."stage" ADD VALUE 'Demo sent';--> statement-breakpoint
ALTER TYPE "public"."stage" ADD VALUE 'Walkthrough';--> statement-breakpoint
ALTER TYPE "public"."stage" ADD VALUE 'Signed';--> statement-breakpoint
ALTER TYPE "public"."stage" ADD VALUE 'Setting up';--> statement-breakpoint
ALTER TYPE "public"."stage" ADD VALUE 'Live';--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "pipeline" "pipeline" DEFAULT 'services' NOT NULL;