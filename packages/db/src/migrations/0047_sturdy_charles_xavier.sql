CREATE TABLE "company_portal_branding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"display_name" text,
	"primary_color" text,
	"accent_color" text,
	"background_color" text,
	"surface_color" text,
	"font_family" text,
	"tagline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverable_share_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"token" text NOT NULL,
	"label" text,
	"scope" jsonb NOT NULL,
	"created_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"issue_id" uuid,
	"routine_run_id" uuid,
	"produced_by_agent_id" uuid,
	"produced_by_run_id" uuid,
	"kind" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" text NOT NULL,
	"storage_path" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"client_visible" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"produced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promoted_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_portal_branding" ADD CONSTRAINT "company_portal_branding_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_share_tokens" ADD CONSTRAINT "deliverable_share_tokens_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_share_tokens" ADD CONSTRAINT "deliverable_share_tokens_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_routine_run_id_routine_runs_id_fk" FOREIGN KEY ("routine_run_id") REFERENCES "public"."routine_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_produced_by_agent_id_agents_id_fk" FOREIGN KEY ("produced_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_produced_by_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("produced_by_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_portal_branding_company_uq" ON "company_portal_branding" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverable_share_tokens_token_uq" ON "deliverable_share_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "deliverable_share_tokens_company_idx" ON "deliverable_share_tokens" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "deliverables_company_produced_idx" ON "deliverables" USING btree ("company_id","produced_at");--> statement-breakpoint
CREATE INDEX "deliverables_project_idx" ON "deliverables" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "deliverables_issue_idx" ON "deliverables" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "deliverables_agent_idx" ON "deliverables" USING btree ("produced_by_agent_id");--> statement-breakpoint
CREATE INDEX "deliverables_run_idx" ON "deliverables" USING btree ("produced_by_run_id");--> statement-breakpoint
CREATE INDEX "deliverables_client_visible_idx" ON "deliverables" USING btree ("company_id","client_visible");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverables_storage_path_uq" ON "deliverables" USING btree ("storage_path");