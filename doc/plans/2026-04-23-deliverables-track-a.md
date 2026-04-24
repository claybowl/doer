# Deliverables — Track A

**Plan date:** 2026-04-23
**Owner:** #1 (with Clay)
**Branch:** `deliverables-track-a` (to be cut from `fernweh-additive-route`)
**Status:** Planning · pending Clay's nod before implementation

---

## Why this exists

Clay's mandate, direct quote: *"I want files. I am so sick of looking at markdown as the result of our super-gremlins. It's embarrassing. For non-technical people, whom are our clients, they are expecting files."*

Today, Doer agents produce markdown. Clients expect `.docx`, `.xlsx`, `.pdf`, `.pptx` — the Dropbox/Google Drive lingua franca. This track makes "file" a first-class concept in Paperclip and proves the vertical stack on one adapter (`claude_local`) with two formats (`.docx`, `.xlsx`) end-to-end in one week. Track C (branded client portal) ships in parallel against the same API surface.

---

## Scope

### In scope (v1)

- **New entity:** `deliverables` table, distinct from work products and memfs files — promoted, labeled, client-visible.
- **One adapter:** `claude_local`. Others get a file-production contract in v1.1+.
- **Two formats:** `.docx` (proposals, reports, briefs) + `.xlsx` (trackers, ledgers, rosters).
- **Skill:** `deliverable` — teaches agents the scratch-vs-deliverable distinction and provides a promotion tool.
- **API:** list + get + download (signed URL) endpoints, plus agent-facing promote endpoint.
- **Fernweh UI:** new Deliverables screen + tabs in Agent/Project detail.
- **Portal (Track C):** token-gated branded surface at `/portal/:token`, read-only, reads same API as Fernweh.

### Out of scope (v1)

- Other adapters (`letta_cloud` etc.) — v1.1
- `.pdf` production — v1.1 (pair with a real client brief use-case)
- `.pptx` preview/thumbnail — v1.1
- Folder-level sharing in Portal
- Edit/delete/comment in Portal
- External storage backends (S3/R2) — v1 uses local filesystem via memfs-bound paths
- Versioning (v1 treats each produce as a new deliverable row)

---

## Data model

### New table: `deliverables`

```ts
// packages/db/src/schema/deliverables.ts
export const deliverables = pgTable("deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),

  // Origin — at least one of projectId/issueId/routineRunId/agentId should be set
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
  routineRunId: uuid("routine_run_id").references(() => routineRuns.id, { onDelete: "set null" }),
  producedByAgentId: uuid("produced_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
  producedByRunId: uuid("produced_by_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),

  // File identity
  kind: text("kind").notNull(),           // "docx" | "xlsx" | "pdf" | "pptx" | "md" | "png" | "csv" | "html" | "other"
  filename: text("filename").notNull(),   // user-visible, e.g. "Q4-Strategy-Brief.docx"
  contentType: text("content_type").notNull(), // e.g. "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  sizeBytes: integer("size_bytes").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  storagePath: text("storage_path").notNull(), // e.g. "memfs://<companyId>/deliverables/<deliverableId>/Q4-Strategy-Brief.docx"

  // Semantics
  title: text("title").notNull(),           // human-facing title (may differ from filename)
  description: text("description"),         // short blurb for the client
  clientVisible: boolean("client_visible").notNull().default(false), // gates Portal visibility

  // Metadata
  metadata: jsonb("metadata").notNull().default({}), // skill used, template, variant, tags

  producedAt: timestamp("produced_at", { withTimezone: true }).notNull().defaultNow(),
  promotedAt: timestamp("promoted_at", { withTimezone: true }), // set when clientVisible flips true
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Indexes: `(companyId, producedAt DESC)`, `(projectId)`, `(issueId)`, `(producedByAgentId)`, `(clientVisible)`.

### Shared types

- `Deliverable`, `DeliverableKind`, `DeliverableListItem`, `CreateDeliverablePayload` in `packages/shared/src/types/deliverable.ts`.
- Constants: `DELIVERABLE_KINDS`, `DELIVERABLE_CONTENT_TYPES` map.

### Share tokens (Track C)

```ts
// packages/db/src/schema/deliverable_share_tokens.ts
export const deliverableShareTokens = pgTable("deliverable_share_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // url-safe random
  label: text("label"),                    // "Acme Corp · Q4 brief" — for Clay's own reference
  scope: jsonb("scope").notNull(),         // { projectIds?: string[], issueIds?: string[], deliverableIds?: string[] }
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // optional
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  accessCount: integer("access_count").notNull().default(0),
});
```

---

## Skill design — `skills/deliverable/SKILL.md`

```yaml
---
name: deliverable
description: >
  Promote a file you produce from scratch work to a client-visible
  deliverable. Use this skill ANY time you produce a file that a human
  client will see. Do NOT return client-facing output as inline markdown —
  always write it to a file and promote via `produce_deliverable`.
---
```

Content covers:

1. **Scratch vs deliverable** — markdown `.md` is scratch; `.docx`/`.xlsx`/`.pdf` in the deliverables folder is client-visible.
2. **Production flow:**
   ```
   /memfs/<companyId>/<agentId>/workspace/   — your scratch
   /memfs/<companyId>/deliverables/<runId>/  — promotion staging
   ```
3. **How to write:** inline Python recipes for `.docx` (python-docx) and `.xlsx` (openpyxl). Short, skimmable — one canonical example each, with a pointer to the user's machine-wide `docx` / `xlsx` SKILL.md for depth.
4. **How to promote:**
   ```
   POST /api/companies/:companyId/deliverables
   {
     "kind": "docx",
     "filename": "Q4-Strategy-Brief.docx",
     "storagePath": "/memfs/.../deliverables/<runId>/Q4-Strategy-Brief.docx",
     "title": "Q4 Strategy Brief — Acme Corp",
     "description": "Executive summary + three strategic initiatives.",
     "projectId": "<uuid-or-null>",
     "issueId": "<uuid-or-null>"
   }
   ```
5. **Orchestrator-injected fallback:** if the run finishes with unreferenced files in `.../deliverables/<runId>/`, a post-run scanner auto-promotes them with inferred defaults.

---

## API surface

### Agent-facing (authenticated via run JWT)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/companies/:companyId/deliverables` | Promote a file to deliverable |
| `GET` | `/api/deliverables/:id` | Agent-readable detail (own-company scoped) |

### UI-facing (authenticated via session)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/companies/:companyId/deliverables` | List with filters `?projectId=&issueId=&agentId=&kind=&clientVisible=` |
| `GET` | `/api/deliverables/:id/download` | Redirects to signed URL, 1h expiry |
| `PATCH` | `/api/deliverables/:id` | Edit title/description, toggle `clientVisible` |
| `DELETE` | `/api/deliverables/:id` | Soft delete |

### Portal-facing (token-gated)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/portal/:token` | Scope resolution → returns deliverable list for token |
| `GET` | `/api/portal/:token/deliverables/:id/download` | Scoped download |

### Admin-facing (session)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/companies/:companyId/share-tokens` | Create share token for a project/issue/deliverable |
| `GET` | `/api/companies/:companyId/share-tokens` | List active tokens |
| `POST` | `/api/share-tokens/:id/revoke` | Kill a token |

---

## Storage layout

v1 uses memfs-backed local paths. Structure:

```
<MEMFS_ROOT>/<companyId>/
  ├── agents/<agentId>/workspace/       ← scratch, ephemeral
  ├── deliverables/<deliverableId>/     ← canonical storage, one dir per deliverable
  │   └── <filename>
  └── deliverables-staging/<runId>/     ← agent writes here pre-promotion; GC after 24h
```

v1.1+: storage backend abstracted behind `StorageAdapter` interface. Adapters: `LocalFsStorageAdapter`, `S3StorageAdapter`, `R2StorageAdapter`.

---

## Fernweh UI

### New screen: `/:prefix/fernweh/deliverables`

- Dropbox-like layout: tree grouped by Project → Issue → File (or "unassigned" bucket at top)
- Filters: kind · agent · client-visible · date-range
- Per-row: icon (by kind), filename, title, produced-at, size, client-visible badge
- Row actions: Download · Copy internal link · Toggle client-visible · Share (create token scoped to this file)
- Empty state: "Your agents haven't produced any files yet. When they do, they'll land here."
- Nav slot: between **Memory** and **Approvals**. Icon: needs one — probably `I.stack` reused or a new folder icon added to `utils.tsx`.

### Per-entity tabs

- **FernwehAgentDetail** — new "Deliverables" tab, queries `?agentId=`
- **FernwehProjects drawer** — new "Deliverables" section, shows count + last 5
- **FernwehWork drawer** — new "Deliverables" list, attached-to-issue
- **FernwehRoutines drawer** — new "Deliverables" list, produced-by-run

All reuse a single `<DeliverableRow />` component.

---

## Portal (Track C)

- **Route:** `/portal/:token` (outside `/:companyPrefix` — unauthenticated, token-gated)
- **Layout:** folder grid (one card per project in scope). Click → file grid. Click file → download + preview-if-available.
- **Branding:** Donjon palette as default (graphite + indigo from the Curve/Donjon landing page memory). Client-specific theming as config in v1.1.
- **Preview support in v1:** PDF (browser native), PNG (img tag), `.docx` / `.xlsx` — downloads only, no preview (use v1.1 pptx-thumb worker for previews).
- **"Client preview" badge:** top-right of every page until Clay flips a global toggle. Ensures no accidental real-client demo before v1 polish.
- **Shell:** react-router, own stylesheet, zero import from Fernweh or classic — intentional isolation so Portal can move to its own subdomain later.
- **Telemetry:** every `GET /api/portal/:token` bumps `accessCount` and `lastAccessedAt`.

---

## Milestones

**Day 1–2 — Schema + orchestrator plumbing**
- [ ] `packages/db/src/schema/deliverables.ts` + `deliverable_share_tokens.ts`; migration
- [ ] `packages/shared/src/types/deliverable.ts` + constants + validators
- [ ] `server/src/services/deliverables.ts` — promote, list, get, signed-URL, soft-delete
- [ ] `server/src/routes/deliverables.ts` — agent + UI + portal routes wired
- [ ] Storage abstraction scaffold (local fs impl only)
- [ ] `server/src/services/deliverables/post-run-scanner.ts` — scans `deliverables-staging/<runId>/` after run finish, auto-promotes

**Day 3 — Skill + agent integration**
- [ ] `skills/deliverable/SKILL.md` with docx + xlsx recipes
- [ ] Orchestrator: inject `deliverable` skill into all `claude_local` runs by default
- [ ] System-prompt amendment: client-facing output rules
- [ ] First real end-to-end test: hand-write an issue that says "write me a Q4 ops brief as a docx", observe the file land in Fernweh

**Day 4 — Fernweh UI**
- [ ] `ui/src/api/deliverables.ts`
- [ ] `ui/src/fernweh/FernwehDeliverables.tsx` — list + filter + download
- [ ] Per-entity tabs in AgentDetail, Projects drawer, Work drawer, Routines drawer
- [ ] Nav entry

**Day 5 — Portal skeleton (Track C)**
- [ ] `ui/src/portal/PortalShell.tsx` — branded chrome, Client Preview badge
- [ ] `ui/src/portal/PortalProject.tsx` — folder grid
- [ ] `ui/src/portal/PortalDeliverable.tsx` — file card with download
- [ ] Share-token creation flow in Fernweh Deliverables (admin side)
- [ ] Route setup outside `/:companyPrefix`

**Day 6–7 — Polish, test, first real ship**
- [ ] End-to-end test: generate the "Weekly Doer Ops Brief" (docx) + "Doer Agent Roster" (xlsx)
- [ ] Share token flow: create token in Fernweh, open in incognito, download the file
- [ ] Fix the inevitable two edge cases
- [ ] Tag `deliverables-v1`

---

## Risks

| Risk | Mitigation |
|---|---|
| `claude_local` agent doesn't have python-docx / openpyxl installed | Claude CLI + Clay's machine-wide `docx`/`xlsx` skill handle this. Add a pre-flight check in the skill that runs `pip install --break-system-packages` if imports fail. |
| Agent writes markdown anyway despite skill prompt | Post-run scanner flags `.md` files in staging and logs a warning. System prompt gets stronger. |
| Signed URL leaks in logs | Use short expiry (1h) + redacted logging. |
| Storage bloats (every run produces files) | v1 soft-deletes after 90d with no `clientVisible=true`. Configurable per company. |
| Portal token gets shared beyond intended recipient | Expected; add rate-limit + optional email-gate in v1.1. Name the risk in copy: "Anyone with this link can download." |
| Post-run scanner races with manual `produce_deliverable` calls | Use `(storagePath)` unique constraint; scanner skips paths already promoted. |

---

## Open questions (for Clay)

1. **Storage root path.** Currently thinking `$DOER_MEMFS_ROOT/deliverables/...`. Should this live alongside existing memfs, or separate root for easier backup?
2. **Client-visible default.** On promotion, default to `clientVisible=false` (opt-in) or `clientVisible=true` (opt-out)? Opt-in is safer; opt-out is less friction.
3. **Portal brand.** Donjon palette baseline, or client-specific theming from day one? Safer to ship Donjon first; client theming is v1.1.
4. **Test deliverable.** I proposed "Weekly Doer Ops Brief" (.docx) + "Doer Agent Roster" (.xlsx). Confirm, or swap in a real client doc you want generated?

---

## Out-of-plan but related (for Wave B)

- `letta_cloud` adapter: file-production contract + storage mount
- Other local adapters: same contract
- `http` / `process` adapters: file-collection convention (polling? webhook ingress?)
- `.pdf` production skill (reportlab recipes)
- `.pptx` production + thumbnail preview worker
- Per-client Portal theming
- Version history: treat same-path + same-title as version N+1, keep predecessors

---

## Next action

Once Clay confirms (or course-corrects) the four open questions above, I cut branch `deliverables-track-a` and start Day 1–2 (schema + plumbing). No code until sign-off.
