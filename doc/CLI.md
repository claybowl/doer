# CLI Reference

Doer CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
pnpm doerai --help
```

First-time local bootstrap + run:

```sh
pnpm doerai run
```

Choose local instance:

```sh
pnpm doerai run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `doerai onboard` and `doerai configure --section server` set deployment mode in config
- runtime can override mode with `DOER_DEPLOYMENT_MODE`
- `doerai run` and `doerai doctor` do not yet expose a direct `--mode` flag

Target behavior (planned) is documented in `doc/DEPLOYMENT-MODES.md` section 5.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
pnpm doerai allowed-hostname dotta-macbook-pro
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.doer`:

```sh
pnpm doerai run --data-dir ./tmp/doer-dev
pnpm doerai issue list --data-dir ./tmp/doer-dev
```

## Context Profiles

Store local defaults in `~/.doer/context.json`:

```sh
pnpm doerai context set --api-base http://localhost:3100 --company-id <company-id>
pnpm doerai context show
pnpm doerai context list
pnpm doerai context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
pnpm doerai context set --api-key-env-var-name DOER_API_KEY
export DOER_API_KEY=...
```

## Company Commands

```sh
pnpm doerai company list
pnpm doerai company get <company-id>
pnpm doerai company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
pnpm doerai company delete PAP --yes --confirm PAP
pnpm doerai company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `DOER_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `DOER_COMPANY_ID`), not another company.

## Issue Commands

```sh
pnpm doerai issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
pnpm doerai issue get <issue-id-or-identifier>
pnpm doerai issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
pnpm doerai issue update <issue-id> [--status in_progress] [--comment "..."]
pnpm doerai issue comment <issue-id> --body "..." [--reopen]
pnpm doerai issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
pnpm doerai issue release <issue-id>
```

## Agent Commands

```sh
pnpm doerai agent list --company-id <company-id>
pnpm doerai agent get <agent-id>
pnpm doerai agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the quickest way to run local Claude/Codex manually as a Doer agent:

- creates a new long-lived agent API key
- installs missing Doer skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `DOER_API_URL`, `DOER_COMPANY_ID`, `DOER_AGENT_ID`, and `DOER_API_KEY`

Example for shortname-based local setup:

```sh
pnpm doerai agent local-cli codexcoder --company-id <company-id>
pnpm doerai agent local-cli claudecoder --company-id <company-id>
```

## Approval Commands

```sh
pnpm doerai approval list --company-id <company-id> [--status pending]
pnpm doerai approval get <approval-id>
pnpm doerai approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
pnpm doerai approval approve <approval-id> [--decision-note "..."]
pnpm doerai approval reject <approval-id> [--decision-note "..."]
pnpm doerai approval request-revision <approval-id> [--decision-note "..."]
pnpm doerai approval resubmit <approval-id> [--payload '{"...":"..."}']
pnpm doerai approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm doerai activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
pnpm doerai dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
pnpm doerai heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.doer/instances/default`:

- config: `~/.doer/instances/default/config.json`
- embedded db: `~/.doer/instances/default/db`
- logs: `~/.doer/instances/default/logs`
- storage: `~/.doer/instances/default/data/storage`
- secrets key: `~/.doer/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
DOER_HOME=/custom/home DOER_INSTANCE_ID=dev pnpm doerai run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm doerai configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
