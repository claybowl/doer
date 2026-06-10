# The Donjon Core — Starter Team

The reference three-agent orchestration chain: **DonDog → Chef → Alfie**.
Direction flows down, documentation flows up, via shared blocks under
`SHARED/` in the org memory root.

## Status

`team.json` is live; the `.af` files are **not yet bundled**. The team
shows `ready: false` in `GET /companies/:id/teams` until they exist here:

- `dondog.af` — lead orchestrator (sanitized export)
- `chef.af` — task master (sanitized export)
- `alfie.af` — gremlin dispatcher (sanitized export)

## Producing the sanitized .af files

1. Export each agent from Letta Cloud (Agent → Export .af).
2. Sanitize: replace owner-specific context (`human.md` content, business
   files, real contact info) with templated onboarding stubs. The importer
   scrubs anything that looks like a credential, but business context is
   on the exporter to clean.
3. Drop the three files in this directory. `ready` flips to true.

Test fixtures that exercise the same pipeline live in
`packages/plugins/examples/plugin-af-import/__tests__/fixtures/`.

## What import does

For each agent, in manifest order: hire (heartbeats **off** by default),
unpack memory blocks to `~/Doer/<org>/memory/agents/<slug>/`, scrub
credentials, wire `reportsTo`, bind `SHARED/` read-write, and git-commit
`hired <name> (team donjon-core)` so the Memory History shows the birth
of the team.
