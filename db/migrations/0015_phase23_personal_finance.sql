CREATE TABLE "personal_finance_contractor_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"payee" text NOT NULL,
	"amount_nzd" numeric(10, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "personal_finance_expense_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount_nzd" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "personal_finance_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"gross_income_nzd" numeric(12, 2) NOT NULL,
	"tax_reduction_percent" numeric(5, 2) DEFAULT '17.5' NOT NULL,
	"target_weekly_draw_nzd" numeric(10, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "personal_finance_contractor_payments" ADD CONSTRAINT "personal_finance_contractor_payments_period_id_personal_finance_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."personal_finance_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_finance_expense_items" ADD CONSTRAINT "personal_finance_expense_items_period_id_personal_finance_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."personal_finance_periods"("id") ON DELETE no action ON UPDATE no action;