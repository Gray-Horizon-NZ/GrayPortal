CREATE TABLE "internal_tasklist_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_list_key" text NOT NULL,
	"google_tasklist_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "internal_tasklist_mappings_internal_list_key_unique" UNIQUE("internal_list_key")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "google_task_list_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "google_task_list_id" text;