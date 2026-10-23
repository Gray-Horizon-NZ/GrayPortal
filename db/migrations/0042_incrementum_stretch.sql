ALTER TABLE "incrementum_goals" ADD COLUMN "is_stretch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_needs" ADD COLUMN "invoiced_at" date;--> statement-breakpoint
ALTER TABLE "incrementum_services" ADD COLUMN "is_addon" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "freedom_by_date" date DEFAULT '2027-12-31';--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "reinvest_retainer_pct" numeric(6, 2) DEFAULT '25' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "reinvest_one_off_pct" numeric(6, 2) DEFAULT '50' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "max_payback_months" numeric(6, 2) DEFAULT '3' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "partner_pass_line" numeric(12, 2) DEFAULT '700' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "partner_kill_line" numeric(12, 2) DEFAULT '400' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "essentials_pass_line" numeric(12, 2) DEFAULT '450' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "essentials_kill_line" numeric(12, 2) DEFAULT '300' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "weekly_outreach_target" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "am_hours_trigger" numeric(6, 2) DEFAULT '25' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "search_ceiling" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_profit_per_client" numeric(12, 2) DEFAULT '850' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_stay_months" numeric(6, 2) DEFAULT '12' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_close_rate_pct" numeric(6, 2) DEFAULT '15' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_partner_share_pct" numeric(6, 2) DEFAULT '60' NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementum_settings" ADD COLUMN "plan_addon_attach_pct" numeric(6, 2) DEFAULT '50' NOT NULL;