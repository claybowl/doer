-- Agent memory and context system: persistent memory entries per agent

CREATE TABLE IF NOT EXISTS "agent_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"memory_type" text DEFAULT 'episodic' NOT NULL,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"issue_id" uuid,
	"heartbeat_run_id" uuid,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"summarized_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_memories_memory_type_check" CHECK (memory_type IN ('episodic', 'semantic', 'procedural'))
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_agent_id_agents_id_fk"
    FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_issue_id_issues_id_fk"
    FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_heartbeat_run_id_heartbeat_runs_id_fk"
    FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agent_memories_agent_type_idx" ON "agent_memories" USING btree ("agent_id", "memory_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_memories_company_created_idx" ON "agent_memories" USING btree ("company_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_memories_agent_access_idx" ON "agent_memories" USING btree ("agent_id", "last_accessed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_memories_issue_idx" ON "agent_memories" USING btree ("issue_id");--> statement-breakpoint

-- Full-text search index on content for keyword-based memory retrieval
CREATE INDEX IF NOT EXISTS "agent_memories_fts_idx" ON "agent_memories" USING gin (to_tsvector('english', "content"));
