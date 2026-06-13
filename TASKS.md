# Doer Tasks — v0.1.0 Ship

_Updated: 2026-06-03_

## 🔴 Blockers

- [ ] **[BUG]** `security-headers` directory/import mismatch — `app.ts` now fixed, verify server starts clean
- [ ] **[BUG]** opencode zen models silently break module structure — document gotcha in AGENTS.md

## 🟠 In Progress

- [ ] Loose issues sweep pre-0.1.0

## ⭐ 0.1.0 Headline — Agent Memory: Substrate + Skill Auto-Attach

> The banger. Full spec: [doc/plans/2026-06-03-agent-memory-substrate-and-skill-autoattach.md](doc/plans/2026-06-03-agent-memory-substrate-and-skill-autoattach.md)

- [ ] **1. New `agents-md-memory` skill** — teaches AGENTS.md-style read/write protocol (sibling to `letta-memory`)
- [ ] **2. `MEMFS_STRATEGY_SKILL` map** in shared constants (strategy → teaching skill)
- [ ] **3. Auto-attach wiring** — fold memory-protocol skills into `desiredSkills` union at `server/src/routes/agents.ts:636`
- [ ] **4. Visible org-scoped `local-fs` default** — replace hidden `~/.letta` default with `~/Doer/<org>/memory/`; user-pickable in org settings
- [ ] **5. Config-form Memory section** (`AgentConfigForm.tsx`) — where/how axes + auto-skill note
- [ ] _Decisions locked:_ org-scoped location, fs-mount-only (Letta exempt), org-isolated memory by default

## 🟡 0.1.0 Backlog

- [ ] Verify all `adapter_failed: Command not found in PATH: "opencode"` agents — expected or misconfigured?
- [ ] ToS + Privacy Policy (DONA-16) — in_review, awaiting legal sign-off
- [ ] Desktop release pipeline — Electron Forge → Cloudflare R2 (see memory/project_desktop_release.md)
- [ ] Linux AppImage CI build validation
- [ ] Agent config form UI changes (`ui/src/components/AgentConfigForm.tsx` modified, unstaged)
- [ ] Review unstaged `server/src/app.ts` changes for anything else opencode left behind

## ✅ Done

- [x] DONA-19 K8 security audit — all HIGH blockers resolved, shipped
- [x] HW-02/04/05 security hardening — error leakage, invitation response, security headers
- [x] `security-headers.js` import fix (2026-06-03)
- [x] PDF is now default deliverable format — `deliverable` skill flipped + mirror synced (2026-06-03)
- [x] Doer v0.0.9 shipped
- [x] Doer v0.0.10 shipped
