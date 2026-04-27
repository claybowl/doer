# Releasing Doer (Electron)

Living runbook for cutting Doer desktop releases. Update as we hit gotchas.

**Status:** Pre-MVP. No release has shipped yet.
**Companion plan:** `doc/plans/2026-04-23-electron-ship-arsenal.md`

---

## Decisions locked in (2026-04-26)

| Area | Choice |
|---|---|
| Platforms v1 | macOS + Windows (skip Linux) |
| Distribution | Free download, beta-bundled API keys (LETTA_API_KEY, OpenCode-Go key); migrate to proxy before public launch |
| Update host | S3 (bucket TBD — proposed `doer-releases.donjon.agency`) |
| Update mechanism | `electron-updater` against S3 |
| Code signing (Mac) | Apple Developer Program — **enrollment in progress** |
| Code signing (Windows) | Deferred — ship unsigned for beta, add EV cert before public launch |
| Docker | Kept alongside Electron; Electron marked "recommended" |
| Scaffold | Forked from `luanroger/electron-shadcn` (Option A) |
| Auth model | OpenCode-Go uses bundled API key. Anthropic/Claude is per-user via OpenCode OAuth (subscription). |

---

## Phases

### Phase A — Local packaged build (MVP)
- [x] **K1** Verify toolchain — scratch scaffold builds .app
- [x] **K2** Scaffold `desktop/` workspace inside monorepo (hand-rolled, standalone)
- [x] **K3 (dev mode)** Spawn Express server in Electron main; kill on quit
- [ ] **K3-prod** Bundle server into packaged .app (extraResources) for prod mode
- [x] **K4 (dev mode)** Real Doer UI loads via server's `vite-dev-middleware` (single origin, HMR works)
- [x] **K4-fix** Vite race resolved by loading server URL instead of separate Vite port
- [ ] Verify embedded Postgres / PGlite writes to `app.getPath('userData')`, not CWD
- [ ] Audit for hardcoded paths and CWD assumptions (grep)
- [ ] **K5** Produce unsigned `.app` and `.exe` artifacts locally

### Phase B — Auto-update infra (S3)
- [ ] Provision S3 bucket (proposed: `doer-releases.donjon.agency`)
- [ ] Configure `electron-updater` with S3 publish target
- [ ] CI publishes `latest-mac.yml`, `latest.yml`, and signed artifacts on tag push
- [ ] First-run + subsequent-run update check verified manually
- [ ] Document version-bump → tag → release flow below

### Phase C — Code signing & notarization (Mac)
- [ ] Apple Developer Program enrolled and approved
- [ ] Generate Developer ID Application certificate
- [ ] Configure `electron-builder` mac signing (`identity`, `notarize`)
- [ ] Verify notarization staple on packaged `.dmg`
- [ ] Test download → open on a fresh Mac (no dev cert installed) → no Gatekeeper warning

### Phase D — Public launch prep
- [ ] Migrate bundled API keys → proxy gateway (`api.donjon.agency/llm`)
- [ ] Acquire Windows EV code-signing cert (DigiCert/Sectigo)
- [ ] Sign Windows build, verify SmartScreen reputation cleared
- [ ] Landing page download CTAs on donjon.agency
- [ ] Crash reporting (Sentry-electron) wired
- [ ] Launch comms (blog, social, HN/PH)

---

## Release workflow (placeholder — fill in once Phase B lands)

```
# Version bump
pnpm version <patch|minor|major>

# Tag
git tag electron/v<X.Y.Z>
git push --tags

# CI builds, signs (when Phase C lands), publishes to S3
# electron-updater clients pick up on next launch
```

---

## Bundled secrets (beta only — REMOVE before public launch)

Injected at `electron-builder` build time via env vars in CI. Never commit to git.

| Variable | Source | Purpose |
|---|---|---|
| `LETTA_API_KEY` | Letta Cloud dashboard | Letta-cloud adapter |
| `OPENCODE_GO_API_KEY` | OpenCode dashboard | OpenCode-Go runtime |
| `ANTHROPIC_API_KEY` | _not bundled_ | Per-user via OpenCode OAuth (Claude subscription) |

**Spend caps to set before first beta build:**
- Letta dashboard → monthly cap = $TBD
- Anthropic console → monthly cap on whichever key the proxy will eventually use = $TBD

---

## Gotcha log (append as we hit them)

### G4 — Single-origin via Doer's vite-dev-middleware beats two-port dev
**Discovered:** 2026-04-26 during K4
**Symptom:** When Electron loaded its own Vite renderer URL (`localhost:5173`) before the renderer dev server was bound, `loadURL` fired `ERR_CONNECTION_REFUSED`. Adding retries felt brittle.
**Fix:** Drop the desktop's own renderer entry. Spawn the server with `DOER_UI_DEV_MIDDLEWARE=true SERVE_UI=true` so the server hosts the UI in-process via Vite middleware. Electron always `loadURL(serverHandle.url)`.
**Why it's better:** Single origin in dev *and* prod (matches packaged-mode behaviour exactly), no race window, HMR still works through the middleware, no second port to manage.
**Side effect:** electron-forge's renderer pipeline still builds (it expects an entry), but the bundle is unused at runtime. Acceptable cost — we leave a minimal `index.html` + placeholder `renderer.tsx` for the toolchain.

### G3 — Electron's hardened spawn needs absolute paths + correct cwd
**Discovered:** 2026-04-26 during K3 (server-process.ts)
**Symptoms:**
- `spawn /bin/sh ENOENT` when using `shell: true` — Electron's hardened runtime blocks shell-based spawn.
- `spawn /opt/homebrew/bin/pnpm ENOENT` when the `cwd` doesn't exist (was a bug in our path math: `__dirname` in dev is `desktop/.vite/build/`, so `path.resolve(__dirname, "../..")` lands in `desktop/`, not the monorepo root).
**Fix:** Walk up from `__dirname` looking for the nearest ancestor that contains a `server/` directory. Use absolute path to pnpm (`/opt/homebrew/bin/pnpm` or `PNPM_BIN` override). No `shell: true`.
**Listen for `"error"` event on the spawned child** — without it, `ENOENT` failures are silent (only `"exit"` is observed, but the process never even started).

### G2 — desktop/ stays out of pnpm-workspace.yaml
**Discovered:** 2026-04-26 during K2 (scaffolding desktop/)
**Symptom:** `pnpm install` from inside `desktop/` got absorbed into the parent monorepo's workspace install; no `node_modules` created locally; electron-forge couldn't run.
**Fix:** `pnpm install --ignore-workspace` (and same `--ignore-workspace` for all subsequent `pnpm` commands in `desktop/`). This keeps `desktop/` as a standalone package with its own flat (hoisted) `node_modules`, satisfying electron-forge.
**Why:** `node-linker=hoisted` is a workspace-wide pnpm setting. If we added `desktop/` to `pnpm-workspace.yaml`, the entire monorepo would have to flip to hoisted mode (or fail). Keeping it out is the surgical move.
**Cross-package wiring (K3+):** when we need `server/` or `ui/` artifacts inside the Electron bundle, build them in their workspace, then copy/import the dist output — don't try to share live source via pnpm symlinks.

### G1 — pnpm + electron-forge requires hoisted node_modules
**Discovered:** 2026-04-26 during K1 (scratch scaffold build)
**Symptom:** `pnpm package` fails with `When using pnpm, node-linker must be set to "hoisted"`
**Fix:** Add `node-linker=hoisted` to the Electron package's local `.npmrc` (NOT global pnpm config — keeps the rest of the monorepo on pnpm's default isolated mode). Then `rm -rf node_modules pnpm-lock.yaml && pnpm install`.
**Why:** electron-forge's auto-detect-deps step walks a flat `node_modules` tree; pnpm's symlinked default breaks it.

---

Common Electron-port gotchas to watch for:
- Hardcoded absolute paths (`/Users/...`, `process.cwd()`)
- Native modules requiring `@electron/rebuild`
- Express server port collisions (need dynamic port + IPC of chosen port to renderer)
- PGlite write location (must use `app.getPath('userData')`)
- Vite dev server vs packaged static-file serving differences
- macOS `app.dock.hide()` / single-instance lock
- `app.requestSingleInstanceLock()` to prevent multi-launch races

---

## Open questions (to resolve as we go)

1. Repo layout: nested `desktop/` package in monorepo, or sibling repo?
2. S3 bucket name + region + CloudFront distribution?
3. Update channel strategy: single `latest`, or `beta` + `stable` channels?
4. Telemetry/crash reporting opt-in UX?
5. Auto-launch on system startup — on by default, or off?

---

## References

- Plan: `doc/plans/2026-04-23-electron-ship-arsenal.md`
- General release runbook: `doc/RELEASING.md`
- Electron docs — Code Signing: https://www.electronjs.org/docs/latest/tutorial/code-signing
- electron-builder Auto Update: https://www.electron.build/auto-update.html
- electron/notarize: https://github.com/electron/notarize
- Scaffold: https://github.com/luanroger/electron-shadcn
