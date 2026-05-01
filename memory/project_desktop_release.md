---
name: Desktop Release Pipeline State
description: Electron Forge → Cloudflare R2 auto-update pipeline for Doer — fixes applied and current status
type: project
---

Shipping Doer Electron app (macOS arm64 + Windows x64) via GitHub Actions → Cloudflare R2. Trigger: `workflow_dispatch` only. Repo: `claybowl/doer`.

**Why:** Clay's primary app distribution channel. R2 bucket `doer-releases` holds installers + RELEASES.json. `update-electron-app` polls for updates.

**How to apply:** Reference when helping with future releases or debugging the pipeline.

## Current Status (as of 2026-04-29)

- **Mac arm64 v0.0.4:** SHIPPED. `Doer-darwin-arm64-0.0.4.zip` in R2 `beta/darwin/arm64/`. RELEASES.json live. Auto-updater active.
- **Windows x64 v0.0.4:** In progress. `authors` fix committed (`fa111e92`). Needs a new workflow run to confirm success.
- **Linux:** Not yet added. Plan saved separately.

## Bugs Fixed (don't re-introduce)

1. `desktop/pnpm-workspace.yaml` — must have `packages: ["."]` or pnpm errors "packages field missing"
2. `pnpm -F server... build` — no quotes around filter on Windows (PowerShell treats single-quoted args literally)
3. `server/package.json` build script — replaced `mkdir -p && cp -R` with `node -e "require('fs').cpSync(...)"` for Windows compat
4. `forge.config.ts` MakerSquirrel — requires `name: "doer-desktop"` (no scoped npm names) + `authors` field
5. R2 TLS `bad_record_mac` — solved by presigned URL + curl workaround in `upload-artifacts.mjs`

## Key Files
- `.github/workflows/desktop-release.yml` — CI workflow
- `desktop/forge.config.ts` — Forge config, makers, publishers
- `desktop/scripts/prebuild.mjs` — builds server + UI, deploys to `.electron-build/`
- `desktop/scripts/upload-artifacts.mjs` — uploads to R2 via presigned URL
- `desktop/scripts/publish-manifest.mjs` — writes RELEASES.json to R2

## Release Command
```sh
gh workflow run desktop-release.yml -R claybowl/doer -f dry_run=false
```

## R2 Public URL Pattern
```
https://pub-89b7185033194502b2b07cdf3b1375aa.r2.dev/beta/<platform>/<arch>/<filename>
```
