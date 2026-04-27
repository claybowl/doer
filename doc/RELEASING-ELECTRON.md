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
- [ ] Fork `luanroger/electron-shadcn` into `desktop/` (or sibling repo — TBD)
- [ ] Import Doer `ui/` into renderer
- [ ] Spawn Express server in main process on app start; kill on quit
- [ ] Verify `/api/health` returns 200 from inside packaged `.app`
- [ ] Verify PGlite writes to `app.getPath('userData')`, not CWD
- [ ] Audit for hardcoded paths and CWD assumptions (grep)
- [ ] Produce unsigned `.app` and `.exe` artifacts locally

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

_(Empty — will fill as Phase A surfaces issues.)_

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
