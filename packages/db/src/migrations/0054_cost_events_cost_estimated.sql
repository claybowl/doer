-- Track whether a cost event's amount came from the local rate-card estimate
-- (token-based) rather than a provider-reported billed amount.
ALTER TABLE "cost_events" ADD COLUMN "cost_estimated" boolean DEFAULT false NOT NULL;
