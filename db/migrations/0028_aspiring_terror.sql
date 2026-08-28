CREATE TYPE "public"."grayscale_request_status" AS ENUM('new', 'contacted');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'grayscale_request';--> statement-breakpoint
CREATE TABLE "grayscale_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"products" text[] NOT NULL,
	"note" text,
	"status" "grayscale_request_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contacted_at" timestamp with time zone,
	"contacted_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grayscale_requests" ADD CONSTRAINT "grayscale_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grayscale_requests" ADD CONSTRAINT "grayscale_requests_contacted_by_users_id_fk" FOREIGN KEY ("contacted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;