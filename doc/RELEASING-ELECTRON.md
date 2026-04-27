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
- [x] **K3-prod** Server bundled into packaged .app via extraResources (pnpm deploy + publishConfig flip)
- [x] **K4 (dev mode)** Real Doer UI loads via server's `vite-dev-middleware` (single origin, HMR works)
- [x] **K4-fix** Vite race resolved by loading server URL instead of separate Vite port
- [x] Embedded Postgres writes to `app.getPath('userData')` via DOER_HOME env var
- [x] Audit complete — server uses DOER_HOME everywhere; passing app.getPath('userData') in packaged mode handles it
- [x] **K5/K3p6** Unsigned `.app` produced (809MB arm64); boots, serves UI, /api/health green

### Phase B — Auto-update infra (Cloudflare R2 + update-electron-app)
- [x] Choose tooling — `@electron-forge/publisher-s3` + `update-electron-app` (Path A from plan)
- [x] Wire `PublisherS3` in forge.config.ts (env-gated; falls through to noop locally)
- [x] Wire `updateElectronApp` in main.ts (only runs in packaged mode + build-time `__DOER_UPDATE_URL__`)
- [x] Document Clay's R2 setup checklist (below)
- [x] Document version-bump → publish → release flow (below)
- [ ] **Clay:** provision R2 bucket + access keys; provide endpoint, bucket name, public URL
- [ ] First publish attempt — `pnpm --ignore-workspace make` then `pnpm --ignore-workspace publish`
- [ ] Bump version, publish v0.0.2, manually verify packaged Doer.app sees the update

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

## Cloudflare R2 setup (Clay does this once)

1. Sign in to https://dash.cloudflare.com → R2.
2. **Create bucket:** name `doer-releases`, location auto, no public access yet.
3. **Settings → Public access:** enable "Public Development URL" (gives a `.r2.dev` URL) OR attach a custom domain (`releases.donjon.agency`).
4. **R2 → Manage API tokens → Create API token:**
   - Permission: Object Read & Write
   - Specify bucket: doer-releases
   - TTL: forever (or set later)
   - Save the **Access Key ID** + **Secret Access Key** (only shown once).
5. **Find the S3 endpoint:** R2 dashboard → bucket settings → "S3 API". Looks like `https://<account-id>.r2.cloudflarestorage.com`.
6. **Find the public base URL:**
   - With public dev URL: `https://pub-<hash>.r2.dev` (visible in bucket settings)
   - With custom domain: `https://releases.donjon.agency`
7. **Drop into `desktop/.env.local` (gitignored):**
   ```sh
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_BUCKET=doer-releases
   S3_ACCESS_KEY_ID=<from step 4>
   S3_SECRET_ACCESS_KEY=<from step 4>
   S3_FOLDER=beta
   DOER_UPDATE_URL=https://pub-<hash>.r2.dev/beta
   ```
8. Sanity check: `aws --endpoint-url $S3_ENDPOINT s3 ls s3://$S3_BUCKET/` (or use `rclone`).

## Release workflow

The full cycle for cutting a beta release once R2 is set up:

```sh
cd desktop

# 1. Bump version (patch/minor/major)
npm version patch                            # writes desktop/package.json

# 2. Build + package + make installers (.zip on Mac, .exe on Windows)
#    Loads .env.local so DOER_UPDATE_URL is baked into the binary at build time.
set -a && source .env.local && set +a
pnpm --ignore-workspace make

# 3. Publish artifacts to R2
pnpm --ignore-workspace publish

# 4. Tag the release
cd .. && git tag electron/v$(node -p "require('./desktop/package.json').version") && git push --tags
```

Beta testers running an older version of Doer.app will pick up the update on their next launch (within ~1 hour) and get a "Restart to update" prompt.

### Object layout in R2

The PublisherS3 config writes to `<bucket>/<folder>/<platform>/<arch>/<file>`:

```
doer-releases/
└── beta/
    ├── darwin/
    │   ├── arm64/
    │   │   ├── Doer-0.0.2-darwin-arm64.zip
    │   │   └── RELEASES.json
    │   └── x64/...
    └── win32/
        └── x64/...
```

`update-electron-app` (StaticStorage mode) reads `<DOER_UPDATE_URL>/<platform>/<arch>/RELEASES.json` to find the latest version + download URL.

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

### G7 — Spawn server with Electron's bundled Node via ELECTRON_RUN_AS_NODE
**Discovered:** 2026-04-26 during K3p3
**Symptom:** Packaged .app has no system pnpm/tsx/node; need a runtime to execute the bundled server.
**Fix:** Set FuseV1Options.RunAsNode = true and FuseV1Options.EnableNodeOptionsEnvironmentVariable = true in forge.config. Then in main.ts: `spawn(process.execPath, [serverEntry], { env: { ELECTRON_RUN_AS_NODE: "1", ... } })`. Electron's bundled Node runs the server with no extra binary shipped.
**Side effect:** Slight security relaxation. Acceptable for now; revisit before public launch (Phase D).

### G6 — pnpm deploy doesn't apply publishConfig — must patch package.jsons manually
**Discovered:** 2026-04-26 during K3p3 (first packaged-mode crash)
**Symptom:** Packaged server crashed on boot: `ERR_MODULE_NOT_FOUND: Cannot find module '...node_modules/@doerai/db/src/index.ts'`. Workspace packages use the dev convention `exports: { ".": "./src/index.ts" }` and rely on tsx/dev to resolve TS sources directly. publishConfig has the corrected `import: "./dist/index.js"` mapping but pnpm deploy doesn't apply it.
**Fix:** Walk `<server>/node_modules/@doerai/*/package.json` (following pnpm symlinks via `readlink -f`) and merge `publishConfig` into the root, deleting `publishConfig`. See `desktop/scripts/prebuild.mjs`.
**Why this works:** The patched package.json now uses the published export shape, so Node's ESM resolver lands on the compiled `dist/*.js` files we built earlier.

### G5 — Build server's transitive deps before deploying
**Discovered:** 2026-04-26 during K3p3 (second packaged-mode crash)
**Symptom:** Packaged server crashed on boot: `ERR_MODULE_NOT_FOUND: ...node_modules/@doerai/adapter-claude-local/dist/server/index.js`. The adapters are workspace packages without their own publishConfig — exports already point at dist, but dist hadn't been built.
**Fix:** Use `pnpm -F 'server...' build` (the `...` means "and deps") in prebuild. This builds all transitive workspace dependencies in topological order. Avoids using `pnpm -r build` which also tries to build unrelated plugin examples that may have errors.

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
