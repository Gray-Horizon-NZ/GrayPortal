CREATE TYPE "public"."xero_invoice_status" AS ENUM('DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED', 'DELETED');--> statement-breakpoint
CREATE TABLE "xero_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"tenant_name" text,
	"encrypted_refresh_token" "bytea" NOT NULL,
	"connected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "xero_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"xero_invoice_id" text NOT NULL,
	"client_id" uuid,
	"xero_contact_id" text NOT NULL,
	"contact_name" text NOT NULL,
	"status" "xero_invoice_status" NOT NULL,
	"total" numeric(12, 2),
	"amount_due" numeric(12, 2),
	"amount_paid" numeric(12, 2),
	"invoice_date" date,
	"due_date" date,
	"currency_code" text,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xero_invoices_xero_invoice_id_unique" UNIQUE("xero_invoice_id")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "xero_contact_id" text;--> statement-breakpoint
ALTER TABLE "xero_connections" ADD CONSTRAINT "xero_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_invoices" ADD CONSTRAINT "xero_invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;