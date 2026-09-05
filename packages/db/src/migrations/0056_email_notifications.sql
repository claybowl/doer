-- Email notifications: preferences, queue, log, and unsubscribe tokens
-- Supports per-user notification preferences with per-workspace overrides,
-- digest mode (daily/weekly), and multi-provider email delivery

-- Notification preferences (per-user, optionally per-company)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  company_id      UUID REFERENCES companies(id),  -- null = global default
  channel         TEXT NOT NULL DEFAULT 'email',   -- 'email' | 'in_app' | 'both' | 'none'
  digest_mode     TEXT NOT NULL DEFAULT 'none',    -- 'none' | 'daily' | 'weekly'
  type_overrides  JSONB,                            -- { "task_assigned": "email", ... }
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notif_prefs_user_company_idx ON notification_preferences(user_id, company_id);
CREATE INDEX IF NOT EXISTS notif_prefs_user_idx ON notification_preferences(user_id);

-- Notification queue (pending, sent, skipped, or failed)
CREATE TABLE IF NOT EXISTS notification_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  company_id      UUID NOT NULL REFERENCES companies(id),
  type            TEXT NOT NULL,   -- 'task_assigned' | 'task_completed' | 'comment_mention' | 'blocker_flagged' | 'deadline_approaching'
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  issue_id        UUID,
  metadata        JSONB,
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'skipped' | 'failed'
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_queue_user_status_idx ON notification_queue(user_id, status);
CREATE INDEX IF NOT EXISTS notif_queue_scheduled_idx ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS notif_queue_company_type_idx ON notification_queue(company_id, type);

-- Notification log (audit trail of all sent notifications)
CREATE TABLE IF NOT EXISTS notification_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL,
  company_id            UUID NOT NULL REFERENCES companies(id),
  type                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  body                  TEXT NOT NULL,
  issue_id              UUID,
  metadata              JSONB,
  channel               TEXT NOT NULL,  -- 'email' | 'in_app' | 'digest'
  provider_message_id   TEXT,
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_log_user_sent_idx ON notification_log(user_id, sent_at);
CREATE INDEX IF NOT EXISTS notif_log_company_type_idx ON notification_log(company_id, type);

-- Unsubscribe tokens (GDPR-compliant one-time token for email unsubscribe links)
CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  token       TEXT NOT NULL,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS unsubscribe_token_idx ON unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS unsubscribe_user_idx ON unsubscribe_tokens(user_id);
