---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
pnpm doerai issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm doerai issue get <issue-id-or-identifier>

# Create issue
pnpm doerai issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm doerai issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm doerai issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm doerai issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm doerai issue release <issue-id>
```

## Company Commands

```sh
pnpm doerai company list
pnpm doerai company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm doerai company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm doerai company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# Apply import
pnpm doerai company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm doerai agent list
pnpm doerai agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm doerai approval list [--status pending]

# Get approval
pnpm doerai approval get <approval-id>

# Create approval
pnpm doerai approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm doerai approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm doerai approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm doerai approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm doerai approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm doerai approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm doerai activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm doerai dashboard get
```

## Heartbeat

```sh
pnpm doerai heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
