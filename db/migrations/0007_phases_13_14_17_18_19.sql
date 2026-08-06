CREATE TYPE "public"."health_trend" AS ENUM('up', 'down', 'flat');--> statement-breakpoint
CREATE TYPE "public"."recurrence_interval" AS ENUM('monthly', 'quarterly', 'custom');--> statement-breakpoint
CREATE TABLE "client_health_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"trend" "health_trend" NOT NULL,
	"payment_component" numeric(5, 2) NOT NULL,
	"task_component" numeric(5, 2) NOT NULL,
	"activity_component" numeric(5, 2) NOT NULL,
	"deal_momentum_component" numeric(5, 2) NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"success" boolean NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mop_archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "recurring_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"interval" "recurrence_interval" NOT NULL,
	"interval_days" numeric(5, 0),
	"next_due_date" date NOT NULL,
	"task_title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "client_health_scores" ADD CONSTRAINT "client_health_scores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mop_archives" ADD CONSTRAINT "mop_archives_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;