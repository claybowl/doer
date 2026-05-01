# 2026-04-23 — Electron Ship Arsenal

**Mission:** Ship Doer as an Electron desktop app.
**Author:** Agent #1 (First Officer, Donjon Intelligence Systems)
**Session mode:** Vibe Planning → recon phase
**Status:** Arsenal inventoried; ready for Clay's return to pick a path and start building.

---

## 1. Strategic frame

Doer is architecturally well-suited to Electron. Key facts that make this easier than the average port:

- **Already local-first.** PGlite is an embedded Postgres (WASM). No server DB to bundle.
- **Same-origin in dev.** The Express API already serves the Vite build on `:3100` / `:3101`. That collapses neatly into Electron's "main process runs Express, renderer loads localhost".
- **TypeScript end-to-end.** Type-safe IPC via `electron-trpc` slots in without friction.
- **UI is React + Vite + Tailwind.** `electron-vite` and the `electron-shadcn` scaffolds are a near-1:1 fit.
- **Adapter model already abstracts runtimes.** The Claude/Codex/Cursor/Gemini/Letta/Pi adapters don't care whether they live in a cloud box or Clay's dock.

The two biggest risks are **code signing / notarization** (money + Apple-calendar time) and **auto-update infrastructure** (need a release host). Neither is blocking MVP; neither is trivial.

---

## 2. Arsenal inventory (by ship phase)

### Phase 0 — Architecture & ADR
| Skill / Tool | What it does for us |
|---|---|
| `vibe-planning-companion` (active) | Current session; turns this exploration into artifacts |
| `engineering:architecture` | Write the canonical ADR: "Ship Doer via Electron" |
| `engineering:system-design` | Design the main/renderer/IPC topology, adapter boundaries |
| `product-management:feature-spec` / `write-spec` | PRD for v1 Electron release |
| `anthropic-skills:fireworks-tech-graph` | Architecture diagrams (main process ↔ Express ↔ PGlite ↔ renderer) |

### Phase 1 — Implementation
| Skill / Tool | What it does for us |
|---|---|
| `engineering:testing-strategy` | Playwright already used in repo → extend for Electron E2E |
| `engineering:tech-debt` | Audit what needs refactor before packaging (especially absolute paths, CWD assumptions) |
| `engineering:code-review` / `review` | Gate every PR in the migration |
| `engineering:debug` | Structured triage when packaging inevitably blows up |
| `anthropic-skills:mcp-builder` | If we want a Doer-hosted MCP server for external agents to reach the local app |

### Phase 2 — Packaging & Distribution
| Skill / Tool | What it does for us |
|---|---|
| `operations:runbook` | "How to cut a Doer release" runbook |
| `operations:risk-assessment` | Catch gotchas before they hit users (expired certs, notarization bounces, autoupdate loops) |
| `operations:change-request` | Formal change for "default distribution is now Electron, not Docker" |
| `operations:vendor-review` | Apple Developer Program, Windows EV cert authority, release-host vendor (GitHub Releases vs S3 vs Hazel) |
| `operations:compliance-tracking` | If enterprise customers need SOC 2 / signed-binary assurance |

### Phase 3 — Launch
| Skill / Tool | What it does for us |
|---|---|
| `engineering:deploy-checklist` (invoked) | Pre-ship verification gate |
| `engineering:incident-response` / `incident` | Day-1 post-launch if something breaks in the wild |
| `marketing:campaign-planning` / `campaign-plan` | Full launch campaign: donjon.agency, social, HN/PH |
| `marketing:content-creation` / `draft-content` | Launch blog post, release notes, changelog |
| `marketing:seo-audit` | Harden donjon.agency/doer landing page |
| `marketing:brand-voice` + `anthropic-skills:brand-guidelines` | Keep launch materials on-brand (Donjon palette: graphite, indigo, ember, silver) |
| `sales:create-an-asset` | Launch landing page, one-pager, demo asset |
| `product-management:stakeholder-comms` | Announce to beta users, investors, paperclip-lineage contributors |

### Phase 4 — Visuals / Media
| Skill / Tool | What it does for us |
|---|---|
| `anthropic-skills:remotion` | Launch trailer (30–60s) |
| `anthropic-skills:agent-workflow-video` | "Day in the life of a Doer agent" social cut |
| `anthropic-skills:canvas-design` | Launch graphics (App Store listing, social cards) |
| `anthropic-skills:theme-factory` | Themed artifacts for decks, landing, docs |
| `anthropic-skills:pptx` | Investor / partner deck for launch |
| `anthropic-skills:pdf` / `docx` | Release PDF, press kit, install guide |

### Phase 5 — Post-launch ops
| Skill / Tool | What it does for us |
|---|---|
| `engineering:standup` | Daily post-launch pulse |
| `operations:status-report` | Weekly health of the launched product |
| `productivity:task-management` + `productivity:memory-management` | Keep #1's working memory synced with reality |
| `product-management:metrics-tracking` | North-star metrics post-launch (activations, DAU, crash-free sessions, agent-run success rate) |
| `anthropic-skills:letta-organizations` | Manage the Letta-cloud agent fleet that ships inside Doer |

---

## 3. External tooling — the real Electron stack

No Electron-specific plugins or MCPs exist in the marketplace yet. But Context7 has world-class live docs for every piece of the recommended stack. I can pull any of these on demand via `Context7__get-library-docs`.

### Core packaging stack
| Library | Context7 ID | Why |
|---|---|---|
| Electron | `/electron/electron` (2231 snippets, trust 10) | The framework |
| Electron Forge | `/electron/forge` (113 snippets, trust 10) | All-in-one build pipeline — primary candidate |
| electron-builder | `/electron-userland/electron-builder` (trust 9.1) | Alternative; stronger auto-update story, worth evaluating |
| electron-vite | `/alex8088/electron-vite-docs` (trust 9.1) | Dev-time; HMR for main + renderer |
| vite-plugin-electron | `/electron-vite/vite-plugin-electron` (trust 7.4) | Alt Vite integration |
| @electron/rebuild | `/electron/rebuild` (trust 10) | Rebuild native modules against Electron's Node version |
| @electron/notarize | GitHub: `electron/notarize` | Mac notarization |

### Runtime / DX
| Library | Context7 ID | Why |
|---|---|---|
| electron-trpc | `/jsonnull/electron-trpc` (trust 8.6) | Type-safe main↔renderer IPC — matches Doer's TS-everywhere ethos |
| electron-store | `/sindresorhus/electron-store` (trust 9.6) | User settings / prefs persistence |
| electron-conf | `/alex8088/electron-conf` (trust 9.1) | Modern alternative to electron-store |
| electron-log | `/megahertz/electron-log` (trust 8.7) | Structured file logs we can surface in support tickets |
| sentry-electron | `/getsentry/sentry-electron` (trust 9) | Crash + error reporting across main/renderer/native |

### Reference scaffolds (clone, don't copy)
| Scaffold | Context7 ID | Why it matters |
|---|---|---|
| electron-shadcn (luanroger) | `/luanroger/electron-shadcn` (trust 9.9) | **Best single match for Doer UI stack**: Electron + Vite + TS + React + Tailwind + shadcn + CI/CD preconfigured |
| electron-shadcn (lionchena) | `/lionchena/electron-shadcn` (trust 6.2) | Alt scaffold, feature-rich |
| electron-vite-react | `/websites/electron-vite` | React-specific Vite setup |
| Awesome Electron | `/sindresorhus/awesome-electron` | Curated resource list for when we hit specific problems |

### Future possibilities (not v1)
- `/electron/llm` — Local LLM integration, `window.AI`-style API. Interesting for Doer's "runs locally, agents on your box" vision.
- `/websites/dev_overwolf_ow-electron` — If we ever want an in-game / overlay form factor (unlikely, but noted).

### Upstream guidance (web, current)
- [Electron docs — Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing) — canonical reference
- [electron-builder — Auto Update](https://www.electron.build/auto-update.html) — the 1:1 "how to wire GH Releases" doc
- [electron/notarize on GitHub](https://github.com/electron/notarize) — Mac notarization CLI
- [DEV — Build and Distribute an Electron Desktop App in 2026](https://dev.to/raxxostudios/how-to-build-and-distribute-an-electron-desktop-app-in-2026-24nk) — current-year walkthrough; recommends "ship the app first, add signing/App-Store later"
- [Security Boulevard — macOS code signing 2025](https://securityboulevard.com/2025/12/how-to-code-signing-an-electron-js-app-for-macos/) — recent hardening notes

---

## 4. Decision frames — three ways to think about this

**A. Product / user value angle**
Doer becomes an app you *launch*, not a repo you *clone*. That alone shifts the user from developer-persona to operator-persona. The install flow becomes a meaningful part of the product surface: what the user sees in the first 60 seconds (landing page → `.dmg` download → first-run wizard → their first company created) is the new MVP.

**B. Agent architecture / tooling angle**
The Electron main process becomes the new "server" boundary. Express still runs there; PGlite still stores data; adapters still run out-of-process or in isolated workers. The renderer becomes a first-class citizen of the IPC surface via `electron-trpc`. Nothing in the company-scope / atomic-issue-checkout / budget-hardstop / activity-log invariants should need to change.

**C. Go-to-market / positioning angle**
A desktop app sells a different story than a self-hosted server. "Run a whole AI company from your laptop" is a pitch a founder can grok in five seconds. It also changes pricing: Doer-the-app can be shareware (free + signed + updated), Doer-the-Cloud is a separate SKU. Electron + a sharp landing page is how we make the existing product *legible* to people who aren't already inside agent-engineering.

**D. Operational / workflow angle**
Our biggest new operational cost is **release infrastructure**: cert management, notarization budgets (Apple is pokey), a release host, and the update channel. This is a recurring tax on every release. Setting it up right once saves us weeks of bleed later.

---

## 5. Gaps — what the arsenal doesn't cover

These are the places skills don't exist and we'll need to bring in outside help or build our own:

1. **Apple Developer Program setup** — requires Clay's personal Apple ID + $99/yr; no skill automates this.
2. **Windows code signing cert acquisition** — EV certs (~$300–500/yr) from DigiCert / Sectigo; vendor-review skill helps pick.
3. **Auto-update infra** — Two good paths:
   - **GitHub Releases + electron-updater** (free, simplest, public-by-default).
   - **Self-host with S3/DO Spaces/Hazel** (more control, private).
4. **Multi-OS CI** — GitHub Actions with macOS + Windows + Linux runners. `engineering:testing-strategy` skill can scaffold the plan; the YAML we write ourselves.
5. **First-run experience / onboarding UX** — `design:user-research` + `design:design-critique` skills can help, but UX design is a real deliverable.
6. **Native module considerations** — PGlite is WASM (zero issue). But if any adapter pulls in a native module (bcrypt, better-sqlite3, keytar for OS keychains), `electron-rebuild` is the fix.
7. **Mac App Store vs direct download** — different sandbox rules, different code signing, different update model. Direct download is almost certainly v1.

---

## 6. Recommended first move when Clay is back

Three options ranked by "fastest to working binary":

| Option | Pros | Cons | Risk | Effort | Verdict |
|---|---|---|---|---|---|
| **A. Fork `electron-shadcn` scaffold, port Doer into it** | Fastest to a runnable `.app`/`.exe`; Tailwind + shadcn + TS already wired; CI preconfigured | Requires restructuring Doer's monorepo slightly to fit scaffold | Low | 1–2 days | ✅ **Recommended** |
| B. Add Electron to existing paperclip monorepo via `electron-vite` | Preserves existing repo layout | More config to hand-wire; higher chance of Vite/Electron config drift | Medium | 3–5 days | |
| C. Electron Forge from scratch | Canonical, officially maintained | Slowest; you build the UI plumbing yourself | Medium | 5+ days | |

The reason A wins: the scaffold has already solved the hard decisions (main/renderer split, preload, HMR, IPC boundary, CI). We import Doer's `server/`, `packages/`, and `ui/` source into a template that already packages cleanly. MVP in days, not weeks.

### Suggested 60-minute kickoff when Clay is back
1. Clone `luanroger/electron-shadcn` into a scratch dir and `pnpm install`.
2. Run it, produce a baseline packaged app to confirm the local toolchain (Xcode CLTs, etc.) works.
3. Start a new branch in `donjon-paperclip`: `electron-port`.
4. Import `ui/` components into the scaffold's renderer.
5. Wire the Express server in the main process (spawn on startup, kill on quit).
6. First-run smoke test: `pnpm dev` → app window opens → renders the board → hits `/api/health`.
7. Commit, push, celebrate. Now we're on the Electron track.

### First artifacts to produce next session
- **ADR:** `doc/plans/2026-04-XX-adr-electron-distribution.md` (via `engineering:architecture`)
- **PRD:** `doc/plans/2026-04-XX-doer-desktop-v1-prd.md` (via `product-management:feature-spec`)
- **Release runbook stub:** `doc/RELEASING-ELECTRON.md` (via `operations:runbook`)

---

## 7. Open questions for Clay

1. **Target platforms for v1?** Mac only to start, or all three? (Recommendation: Mac + Windows, skip Linux for now — Linux users are comfortable cloning the repo.)
2. **Distribution model?** Free download from donjon.agency? Paid? Trial + license? Or BYO API keys only?
3. **Auto-update host?** GitHub Releases (free, public) or S3 (private, branded)?
4. **Apple Developer Program** — is the Donjon account already set up, or do we need to enroll?
5. **Keep Docker mode?** `doc/DOCKER.md` exists; Electron becomes the default but Docker stays for power users, or do we deprecate?
6. **How tightly do we integrate Letta Cloud in the desktop shell?** Memory note says Letta is the active adapter — should it be the default runtime in the packaged app?

---

## 8. Next steps (when Clay returns)

- **Owner:** #1 / Clay (collab)
- **Action:** Pick Option A/B/C above → if A, fork `electron-shadcn`; run the 60-min kickoff
- **When:** Next working session
- **Success:** A packaged `.app` on Clay's desktop that opens, renders the board, and hits `/api/health` — within one working day

---

## Appendix — session references

- Vibe Planning Companion skill (active)
- Engineering: deploy-checklist (invoked)
- Letta Organizations skill (invoked)
- Web search sources listed in §3
- Context7 library IDs listed in §3
- Relevant memory entries:
  - [Doer Completion Roadmap](../../../../../spaces/eab9ff87-f490-4a6a-a2bb-047bf2acf9a3/memory/project_doer_completion.md)
  - [Doer agent economics](../../../../../spaces/eab9ff87-f490-4a6a-a2bb-047bf2acf9a3/memory/project_doer_agent_economics.md)
  - [Letta Cloud model constraint](../../../../../spaces/eab9ff87-f490-4a6a-a2bb-047bf2acf9a3/memory/feedback_letta_model.md)
