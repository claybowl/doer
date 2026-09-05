# Doer Time Tracking — Design Document

## Overview

Time tracking for Doer tasks, covering both agent auto-timers (automatic) and human manual timers (interactive). The system tracks time per task, per agent, per project, and supports estimated vs actual time comparison, billable classification, and reporting views.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI Layer                                     │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────────┐   │
│  │ TimeTracker   │  │ RunningTimer    │  │ TimeTracking Page      │   │
│  │ (task detail) │  │ Indicator (nav) │  │ (summary/reports)      │   │
│  └──────┬───────┘  └────────┬────────┘  └───────────┬────────────┘   │
│         │                   │                        │                 │
│         └───────────────────┴────────────────────────┘                 │
│                            │                                          │
│                    timeTrackingApi (api/time-tracking.ts)            │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│                    Server Layer                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ timeTrackingRoutes (routes/time-tracking.ts)                 │    │
│  │   POST   /time-entries/start                                 │    │
│  │   POST   /time-entries/:id/stop                               │    │
│  │   GET    /time-entries                                        │    │
│  │   GET    /time-entries/:id                                    │    │
│  │   PATCH  /time-entries/:id                                    │    │
│  │   DELETE /time-entries/:id                                    │    │
│  │   GET    /time-tracking/summary                               │    │
│  │   GET    /time-tracking/by-agent                               │    │
│  │   GET    /time-tracking/by-project                             │    │
│  │   GET    /time-tracking/by-issue                               │    │
│  │   GET    /time-tracking/timesheet                             │    │
│  │   GET    /issues/:id/time                                      │    │
│  │   GET    /time-tracking/running                                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ timeTrackingService (services/time-tracking.ts)              │    │
│  │   startAgentTimer / stopAgentTimer  (called by heartbeat)    │    │
│  │   startManualTimer / stopTimer       (called by API)          │    │
│  │   list / getById / updateEntry / deleteEntry                 │    │
│  │   getSummary / getByAgent / getByProject / getByIssue         │    │
│  │   getWeeklyTimesheet / getIssueTime / getRunningTimers        │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                      Database Layer                                   │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ time_entries table                                            │    │
│  │   id, company_id, issue_id, agent_id, project_id,             │    │
│  │   heartbeat_run_id, source, user_id, status,                  │    │
│  │   started_at, stopped_at, duration_ms,                        │    │
│  │   description, billable, billing_code                        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ issues table (modified)                                      │    │
│  │   + estimated_minutes INTEGER                                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Model

### `time_entries` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated unique ID |
| `company_id` | UUID NOT NULL | FK to `companies` |
| `issue_id` | UUID NOT NULL | FK to `issues` |
| `agent_id` | UUID | FK to `agents` (null for human-only entries) |
| `project_id` | UUID | FK to `projects` (denormalized from issue for fast aggregation) |
| `heartbeat_run_id` | UUID | FK to `heartbeat_runs` (for agent auto-tracking) |
| `source` | TEXT NOT NULL | `"agent_auto"` or `"manual"` |
| `user_id` | TEXT | The human user who started a manual timer |
| `status` | TEXT NOT NULL | `"running"` or `"stopped"` |
| `started_at` | TIMESTAMPTZ NOT NULL | When the timer started |
| `stopped_at` | TIMESTAMPTZ | When the timer stopped (null while running) |
| `duration_ms` | INTEGER | Duration in milliseconds (null while running, computed on stop) |
| `description` | TEXT | Optional note for this time entry |
| `billable` | BOOLEAN NOT NULL DEFAULT true | Whether this time is billable |
| `billing_code` | TEXT | Billing code override (falls back to issue billing code) |
| `created_at` | TIMESTAMPTZ NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ NOT NULL | Record last update time |

### `issues` table modification

| Column | Type | Description |
|--------|------|-------------|
| `estimated_minutes` | INTEGER | Optional time estimate for the task (for estimated vs actual comparison) |

### Indexes

- `time_entries_company_started_idx` — company + started_at (date range queries)
- `time_entries_company_issue_idx` — company + issue_id (per-task time lookup)
- `time_entries_company_agent_idx` — company + agent_id (per-agent aggregation)
- `time_entries_company_project_idx` — company + project_id (per-project aggregation)
- `time_entries_company_status_idx` — company + status (find running timers)
- `time_entries_heartbeat_run_idx` — heartbeat_run_id (agent timer lookup by run)

## Agent Auto-Tracking

### How it works

1. When a heartbeat run starts on an issue (agent checks out / begins execution):
   - `startAgentTimer({ companyId, issueId, agentId, heartbeatRunId, projectId })` is called
   - Creates a `time_entries` row with `source = "agent_auto"`, `status = "running"`
   - Any previous running timer for the same issue+agent is auto-stopped

2. When the heartbeat run completes (success, error, or cancellation):
   - `stopAgentTimer({ companyId, heartbeatRunId })` is called
   - Updates the entry to `status = "stopped"`, computes `duration_ms`
   - Display: "Agent completed in 47s" (shown in task detail)

3. Integration point: The heartbeat service (`server/src/services/heartbeat.ts`) calls these methods at the appropriate lifecycle hooks. The service exports `startAgentTimer` and `stopAgentTimer` for the heartbeat service to invoke.

### Aggregation examples

- Per agent: "Scout: 3.2h this week across 12 tasks"
- Per task: "Agent completed in 47s"
- Per project: "Project Alpha: 18.5h total (12.3h agent, 6.2h human)"

## Human Manual Timer

### How it works

1. User navigates to task detail page
2. `TimeTracker` component renders with Start/Stop button
3. User clicks "Start Timer" → POST `/time-entries/start`
4. Timer runs, live duration updates every second in the UI
5. User clicks "Stop Timer" → POST `/time-entries/:id/stop`
6. Duration is computed server-side and stored

### Running timer indicator

- `RunningTimerIndicator` component in the navigation bar
- Shows pulsing red dot + live duration when any manual timer is running
- Polls `/time-tracking/running` every 30 seconds
- Clicking it could navigate to the task with the running timer

## API Reference

### Timer Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/companies/:companyId/time-entries/start` | Start a manual timer |
| POST | `/companies/:companyId/time-entries/:entryId/stop` | Stop a running timer |

### CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies/:companyId/time-entries` | List entries (with filters) |
| GET | `/companies/:companyId/time-entries/:entryId` | Get single entry |
| PATCH | `/companies/:companyId/time-entries/:entryId` | Update entry (description, billable, duration) |
| DELETE | `/companies/:companyId/time-entries/:entryId` | Delete entry |

### Reporting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies/:companyId/time-tracking/summary` | Time summary (total, agent, human, billable) |
| GET | `/companies/:companyId/time-tracking/by-agent` | Time aggregated by agent |
| GET | `/companies/:companyId/time-tracking/by-project` | Time aggregated by project |
| GET | `/companies/:companyId/time-tracking/by-issue` | Time aggregated by issue (with estimated vs actual) |
| GET | `/companies/:companyId/time-tracking/timesheet` | Weekly timesheet (human entries) |
| GET | `/companies/:companyId/issues/:issueId/time` | Total time for a specific issue |
| GET | `/companies/:companyId/time-tracking/running` | Currently running timers |

### Query Parameters

- `from` / `to` — ISO 8601 datetime for date range filtering
- `issueId` / `agentId` / `projectId` — Filter by entity
- `source` — Filter by `"agent_auto"` or `"manual"`
- `status` — Filter by `"running"` or `"stopped"`
- `billable` — Filter by billable status
- `limit` / `offset` — Pagination (default 100, max 500)

## UI Components

### 1. TimeTracker (task detail)
- Start/Stop button with live duration display
- Optional description input
- Breakdown: Agent time vs Human time
- Entry list (last 10 entries with delete option for manual entries)
- Agent completion note: "Agent completed in 47s"

### 2. RunningTimerIndicator (navigation bar)
- Pulsing red dot + live duration
- Shows count when multiple timers running
- Polls every 30 seconds

### 3. TimeTracking Page (reporting)
- Tabbed interface: Summary | By Agent | By Project | By Task | Timesheet
- Date range filter (from/to)
- Summary: stat cards (total, agent, human, billable, non-billable, entries, running)
- By Agent: table with agent name, role, total time, task count, avg per task, billable
- By Project: table with project name, total time, task count, entries, billable
- By Task: table with task title, status, total/agent/human time, estimated, variance
- Timesheet: weekly view with daily bar chart, entry rows, billable flag

## Reporting Views

### Time by Project
"How much time went into each project"
- Aggregates all time entries by `project_id`
- Shows total time, task count, entry count, billable time

### Time by Agent
"Which agents are busiest"
- Aggregates by `agent_id`
- Shows total time, task count, entries, avg per task, billable time
- Helps identify which agents are over/underutilized

### Time by Task Type
"Research vs writing vs coding averages"
- Derived from issue labels or titles (future enhancement)
- Currently available via the by-issue report with variance tracking

### Billable vs Non-Billable
- `billable` flag on each time entry (default true)
- Summary view shows billable vs non-billable totals
- Can be toggled per-entry via PATCH API
- Billing code inherited from issue or overridden per-entry

## Estimated vs Actual Time

- `estimated_minutes` added to `issues` table (optional)
- When an issue has an estimate, the by-issue report shows:
  - Estimated time (converted to ms for comparison)
  - Actual time (sum of all time entries)
  - Variance (actual - estimated, positive = over estimate)
- UI shows variance in red (over) or green (under)

## Time-Based Billing Integration

### Design for ServicePro / DON-132 integration

1. **Billable flag**: Each time entry has a `billable` boolean (default true)
2. **Billing code**: Inherited from issue, or overridden per-entry
3. **Agent-hours as pricing dimension**: The `getSummary` and `getByAgent` endpoints provide billable time that can be used for billing calculations
4. **Export format**: Time entries can be exported via the existing list API with filters for billable entries within a date range

### Future billing integration points

- ServicePro clients can query `GET /time-tracking/summary?from=...&to=...` to get billable hours
- Per-client billing: filter by `billingCode` to attribute time to specific clients
- Rate-based billing: multiply `durationMs` by an hourly rate per agent or billing code
- Usage-based pricing: include agent-hours in the DON-132 billing dimension

## Migration

```sql
-- 0055_time_tracking.sql
CREATE TABLE time_entries (...);
CREATE INDEX ... (6 indexes);
ALTER TABLE issues ADD COLUMN estimated_minutes INTEGER;
```

## Files Created/Modified

### New Files
- `packages/db/src/schema/time_entries.ts` — Database schema
- `packages/db/src/migrations/0055_time_tracking.sql` — SQL migration
- `packages/shared/src/types/time-tracking.ts` — TypeScript types
- `packages/shared/src/validators/time-tracking.ts` — Zod validators
- `server/src/services/time-tracking.ts` — Service layer
- `server/src/routes/time-tracking.ts` — REST API routes
- `ui/src/api/time-tracking.ts` — API client
- `ui/src/components/TimeTracker.tsx` — Task detail timer component
- `ui/src/components/RunningTimerIndicator.tsx` — Nav bar indicator
- `ui/src/pages/TimeTracking.tsx` — Reporting/timesheet page
- `docs/time-tracking-design.md` — This document

### Modified Files
- `packages/db/src/schema/index.ts` — Export `timeEntries`
- `packages/db/src/schema/issues.ts` — Add `estimatedMinutes` column
- `packages/shared/src/constants.ts` — Add `TIME_ENTRY_SOURCES`, `TIME_ENTRY_STATUSES`
- `packages/shared/src/types/index.ts` — Export time tracking types
- `packages/shared/src/validators/index.ts` — Export time tracking validators
- `packages/shared/src/index.ts` — Export all time tracking exports
- `server/src/services/index.ts` — Export `timeTrackingService`
- `server/src/routes/index.ts` — Export `timeTrackingRoutes`
- `server/src/app.ts` — Register `timeTrackingRoutes`
- `ui/src/api/index.ts` — Export `timeTrackingApi`

## Success Criteria Checklist

- [x] Time tracking data model (`time_entries` table + `estimated_minutes` on issues)
- [x] Agent auto-tracking implementation (`startAgentTimer` / `stopAgentTimer` service methods)
- [x] Human timer UI component (`TimeTracker.tsx` with Start/Stop, live duration, entry list)
- [x] Timesheet and reporting views (`TimeTracking.tsx` with 5 tabs: summary, agents, projects, issues, timesheet)
- [x] Time-based billing integration design (billable flag, billing code, exportable time data)
