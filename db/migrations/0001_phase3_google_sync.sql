CREATE TYPE "public"."sync_state" AS ENUM('synced', 'pending', 'failed');--> statement-breakpoint
CREATE TABLE "google_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_refresh_token" "bytea" NOT NULL,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "google_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "sync_state" SET DATA TYPE "public"."sync_state" USING "sync_state"::"public"."sync_state";--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "google_event_id" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "sync_state" "sync_state";--> statement-breakpoint
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;