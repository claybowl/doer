# Doer Tasks — v0.2.0

_Updated: 2026-06-28_

## 🔴 Blockers

- [ ] **[BUG]** opencode zen models silently break module structure — document gotcha in AGENTS.md

## ⭐ 0.2.0 Headline — Agent Memory: Substrate + Skill Auto-Attach

> Full spec: [doc/plans/2026-06-03-agent-memory-substrate-and-skill-autoattach.md](doc/plans/2026-06-03-agent-memory-substrate-and-skill-autoattach.md)

- [ ] **1. New `agents-md-memory` skill** — teaches AGENTS.md-style read/write protocol (sibling to `letta-memory`)
- [ ] **2. `MEMFS_STRATEGY_SKILL` map** in shared constants (strategy → teaching skill)
- [ ] **3. Auto-attach wiring** — fold memory-protocol skills into `desiredSkills` union at `server/src/routes/agents.ts:636`
- [ ] **4. Visible org-scoped `local-fs` default** — replace hidden `~/.letta` default with `~/Doer/<org>/memory/`; user-pickable in org settings
- [ ] **5. Config-form Memory section** (`AgentConfigForm.tsx`) — where/how axes + auto-skill note

## 🟡 Backlog

- [ ] ToS + Privacy Policy (DONA-16) — awaiting legal sign-off
- [ ] Desktop release pipeline — Electron Forge → Cloudflare R2 (see memory/project_desktop_release.md)
- [ ] Linux AppImage CI build validation
- [ ] DON-250 — webhook retry path sends unsigned requests; blocked on secret store integration
- [ ] `letta_cli` adapter — verify `letta-code` CLI flags work end-to-end; may need flag adjustment after testing

## ✅ Done (shipped in v0.1.x)

- [x] DONA-19 K8 security audit — all HIGH blockers resolved
- [x] HW-02/04/05 security hardening — error leakage, invitation response, security headers
- [x] `security-headers.js` import fix
- [x] PDF default deliverable format
- [x] Doer v0.0.9 → v0.1.7 shipped
- [x] Letta Corps: 23-agent Donjon crew (DonDog / Chef / Alfie / 8 commanders / 12 gremlins) on Letta Cloud
- [x] `letta_code` adapter — online + offline modes, tool intercepts, TASK MODE wakeup, supportsLocalAgentJwt
- [x] Mission Control HQ (Pulse / Stream / Wallboard) wired to live event bus
- [x] `security-headers` import fix — server starts clean
- [x] AgentDetail Skills breadcrumb restored (was accidentally commented out)
- [x] `letta_cli` adapter — genuine headless `letta-code` CLI spawn (mirrors `claude_local` pattern)
- [x] app.ts / AgentConfigForm.tsx unstaged changes — verified clean, no action needed
