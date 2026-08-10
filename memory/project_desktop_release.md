---
name: Desktop Release Pipeline State
description: Electron Forge → Cloudflare R2 auto-update pipeline for Doer — fixes applied and current status
type: project
---

Shipping Doer Electron app (macOS arm64 + Windows x64 + Linux x64) via GitHub Actions → Cloudflare R2. Trigger: `workflow_dispatch` only. Repo: `claybowl/doer`. Use `--ref master` when dispatching; the repo also has a stale `main` branch that should not be used for releases.

**Why:** Clay's primary app distribution channel. R2 bucket `doer-releases` holds installers + per-platform RELEASES.json files. `update-electron-app` polls for updates.

**How to apply:** Reference when helping with future releases or debugging the pipeline.

## Current Status (as of 2026-08-10)

- **v0.2.9:** SHIPPED. GitHub Release `v0.2.9` published with all three platform installers + nupkg + RELEASES file.
  - macOS arm64: `Doer-darwin-arm64-0.2.9.zip` (380,725,814 bytes) — R2 `beta/darwin/arm64/`, RELEASES.json updated
  - Windows x64: `Doer-0.2.9 Setup.exe` (285,074,944 bytes) — R2 `beta/win32/x64/`, RELEASES.json updated
  - Linux x64: `Doer-0.2.9-x64.AppImage` (242,514,424 bytes) — R2 `beta/linux/x64/`
- **Dry run:** 31368848146, fully green on all three platforms before triggering the real release.
- **Release run:** 31374426181, completed green on all three platforms.

## Bugs Fixed (don't re-introduce)

1. `desktop/pnpm-workspace.yaml` — must have `packages: ["."]` or pnpm errors "packages field missing"
2. `pnpm -F server... build` — no quotes around filter on Windows (PowerShell treats single-quoted args literally)
3. `server/package.json` build script — replaced `mkdir -p && cp -R` with `node -e "require('fs').cpSync(...)"` for Windows compat
4. `forge.config.ts` MakerSquirrel — requires `name: "doer-desktop"` (no scoped npm names) + `authors` field
5. R2 TLS `bad_record_mac` — solved by presigned URL + curl workaround in `upload-artifacts.mjs`
6. **macOS ZIP validation flakiness (2026-08-10)** — `unzip -t` on macos runners exits non-zero with empty stderr. Replaced with a deterministic pure-Node EOCD/ZIP64 structural validator in `desktop/scripts/validate-artifacts.mjs`. Workflow now runs Make → Validate → Publish so bad artifacts cannot be uploaded.

## Key Files

- `.github/workflows/desktop-release.yml` — CI workflow (dispatch only, `--ref master`)
- `desktop/forge.config.ts` — Forge config, makers, publishers
- `desktop/scripts/prebuild.mjs` — builds server + UI, deploys to `.electron-build/`
- `desktop/scripts/upload-artifacts.mjs` — uploads to R2 via presigned URL
- `desktop/scripts/publish-manifest.mjs` — writes per-platform RELEASES.json to R2
- `desktop/scripts/validate-artifacts.mjs` — structural ZIP validation (must pass before publish)

## Release Command

```sh
gh workflow run desktop-release.yml -R claybowl/doer --ref master -f dry_run=true
# verify green, then:
gh workflow run desktop-release.yml -R claybowl/doer --ref master -f dry_run=false
```

## R2 Public URL Pattern

```
https://pub-89b7185033194502b2b07cdf3b1375aa.r2.dev/beta/<platform>/<arch>/<filename>
```
