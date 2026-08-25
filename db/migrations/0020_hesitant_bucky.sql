ALTER TABLE "clients" ADD COLUMN "hidden_from_task_view" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "google_connections" ADD COLUMN "calendar_settings" jsonb;