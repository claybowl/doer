CREATE TABLE "provider_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider_type" text NOT NULL,
	"auth_mode" text NOT NULL,
	"secret_id" uuid,
	"letta_base_url" text DEFAULT 'https://api.letta.com' NOT NULL,
	"provider_base_url" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_secret_id_company_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."company_secrets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connections_company_name_uq" ON "provider_connections" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "provider_connections_company_idx" ON "provider_connections" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "provider_connections_company_provider_idx" ON "provider_connections" USING btree ("company_id","provider_type");
