CREATE TABLE "council_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'live' NOT NULL,
	"participant_agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"triggered_by_agent_id" uuid,
	"triggered_by_user_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_wakeup_requests" ADD COLUMN "council_session_id" uuid;--> statement-breakpoint
ALTER TABLE "council_sessions" ADD CONSTRAINT "council_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_sessions" ADD CONSTRAINT "council_sessions_triggered_by_agent_id_agents_id_fk" FOREIGN KEY ("triggered_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "council_sessions_company_status_idx" ON "council_sessions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "council_sessions_company_created_idx" ON "council_sessions" USING btree ("company_id","created_at");
