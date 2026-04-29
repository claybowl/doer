-- Stripe billing integration: add billing columns to companies, create usage_records and processed_stripe_events tables

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "plan_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "seat_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "grace_period_end" timestamp with time zone;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "companies" ADD CONSTRAINT "companies_plan_check"
    CHECK (plan IN ('free','pro','team','enterprise'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "companies" ADD CONSTRAINT "companies_plan_status_check"
    CHECK (plan_status IN ('active','trialing','past_due','canceled','unpaid'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "companies_stripe_customer_id_idx" ON "companies" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "companies_stripe_subscription_id_idx" ON "companies" USING btree ("stripe_subscription_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone,
	"agent_hours" numeric(12,4) DEFAULT '0' NOT NULL,
	"tool_execs" bigint DEFAULT 0 NOT NULL,
	"storage_bytes" bigint DEFAULT 0 NOT NULL,
	"reported_to_stripe" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "usage_records_company_period_idx" ON "usage_records" USING btree ("company_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_records_unreported_idx" ON "usage_records" USING btree ("reported_to_stripe") WHERE reported_to_stripe = false;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "processed_stripe_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "processed_stripe_events_type_idx" ON "processed_stripe_events" USING btree ("event_type");
