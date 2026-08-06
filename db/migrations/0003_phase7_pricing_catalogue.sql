CREATE TYPE "public"."billing_type" AS ENUM('one_off', 'monthly', 'range', 'custom');--> statement-breakpoint
CREATE TABLE "service_items" (
	"id" text PRIMARY KEY NOT NULL,
	"module_code" text NOT NULL,
	"deliverable" text NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"billing_type" "billing_type" NOT NULL,
	"current_setup_price" numeric(12, 2),
	"current_monthly_price" numeric(12, 2),
	"suggested_setup_price" numeric(12, 2),
	"suggested_monthly_price" numeric(12, 2),
	"price_text" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_modules" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"focus" text
);
--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_module_code_service_modules_code_fk" FOREIGN KEY ("module_code") REFERENCES "public"."service_modules"("code") ON DELETE no action ON UPDATE no action;