---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `doerai run`

One-command bootstrap and start:

```sh
pnpm doerai run
```

Does:

1. Auto-onboards if config is missing
2. Runs `doerai doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
pnpm doerai run --instance dev
```

## `doerai onboard`

Interactive first-time setup:

```sh
pnpm doerai onboard
```

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm doerai onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
pnpm doerai onboard --yes
```

## `doerai doctor`

Health checks with optional auto-repair:

```sh
pnpm doerai doctor
pnpm doerai doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `doerai configure`

Update configuration sections:

```sh
pnpm doerai configure --section server
pnpm doerai configure --section secrets
pnpm doerai configure --section storage
```

## `doerai env`

Show resolved environment configuration:

```sh
pnpm doerai env
```

## `doerai allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
pnpm doerai allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.doer/instances/default/config.json` |
| Database | `~/.doer/instances/default/db` |
| Logs | `~/.doer/instances/default/logs` |
| Storage | `~/.doer/instances/default/data/storage` |
| Secrets key | `~/.doer/instances/default/secrets/master.key` |

Override with:

```sh
DOER_HOME=/custom/home DOER_INSTANCE_ID=dev pnpm doerai run
```

Or pass `--data-dir` directly on any command:

```sh
pnpm doerai run --data-dir ./tmp/doer-dev
pnpm doerai doctor --data-dir ./tmp/doer-dev
```
