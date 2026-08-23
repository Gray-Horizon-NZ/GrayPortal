CREATE TABLE "business_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text,
	"label" text NOT NULL,
	"yearly_amount_nzd" numeric(10, 2),
	"monthly_amount_nzd" numeric(10, 2),
	"is_writeoff" boolean DEFAULT false NOT NULL,
	"gst_yearly_nzd" numeric(10, 2),
	"gst_monthly_nzd" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "internal_list" text;