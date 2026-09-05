-- Time tracking: agent auto-timer and human manual timer
-- Tracks time spent on issues by agents (auto) and humans (manual)

CREATE TABLE IF NOT EXISTS time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  issue_id        UUID NOT NULL REFERENCES issues(id),
  agent_id        UUID REFERENCES agents(id),
  project_id      UUID REFERENCES projects(id),
  heartbeat_run_id UUID REFERENCES heartbeat_runs(id),

  source          TEXT NOT NULL DEFAULT 'manual',  -- 'agent_auto' | 'manual'
  user_id         TEXT,
  status          TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'stopped'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at      TIMESTAMPTZ,
  duration_ms    INTEGER,
  description     TEXT,
  billable        BOOLEAN NOT NULL DEFAULT true,
  billing_code    TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_entries_company_started_idx ON time_entries(company_id, started_at);
CREATE INDEX IF NOT EXISTS time_entries_company_issue_idx ON time_entries(company_id, issue_id);
CREATE INDEX IF NOT EXISTS time_entries_company_agent_idx ON time_entries(company_id, agent_id);
CREATE INDEX IF NOT EXISTS time_entries_company_project_idx ON time_entries(company_id, project_id);
CREATE INDEX IF NOT EXISTS time_entries_company_status_idx ON time_entries(company_id, status);
CREATE INDEX IF NOT EXISTS time_entries_heartbeat_run_idx ON time_entries(heartbeat_run_id);

-- Add estimated_minutes to issues for estimated vs actual time comparison
ALTER TABLE issues ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
