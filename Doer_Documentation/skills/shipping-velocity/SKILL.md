---
name: shipping-velocity
description: >
  Methodology for shipping features fast WITHOUT cutting corners. Use when
  Clay (or any user) is in batch-shipping mode — closing backlog items,
  pushing through a feature wave, or working with momentum. Captures the
  recon-triage-surgical-verify-checkpoint loop, the hub-and-spokes pattern
  for big surfaces, the backwards-compat-by-default rename strategy, and
  the communication framing (Mission Snapshot / Decision Table / Next
  Steps) that keeps a fast pace from devolving into chaos. Distilled from
  the 2026-04-26 backlog-zero session that closed 16 commits' worth of
  Wave-B + cleanup work in one push.
---

# Shipping Velocity — The Methodology

## When to use this

Invoke this skill when:

- The user is in "let's ship" mode and wants to move FAST without sloppy work
- A backlog needs to be cleared (multiple tasks, varying scopes)
- A feature wave needs to land (multiple related changes, coordinated)
- The user is solo and the only governor is your own honesty about scope
- The user says things like "let's go", "send it", "crush this", "we got it"

Don't invoke for:
- Single-line fixes (just do them)
- Pure conversation / planning without code
- Greenfield projects with no existing context (different methodology — design first)
- High-stakes production changes that need formal review

## The mindset

Build to last. Progress to stay.

Speed without rigor is recklessness. Rigor without speed is stagnation. Velocity is the byproduct of: (a) knowing exactly what's already there, (b) doing the smallest meaningful thing, (c) verifying at the right granularity, and (d) being honest about scope.

The user is your partner, not your client. Push back when their scope is wrong. Hold the line when they want to skip verification. They will respect the honesty more than the compliance.

---

## The Five Acts

Every shipping unit — a task, a feature, a fix — flows through five acts. They aren't bureaucracy. They're the shape of fast work that doesn't break.

### Act 1: Recon before code

**ALWAYS look at what exists before writing anything new.**

Tools: `Glob`, `Grep`, `Read`. In that order. Glob for "what files match this pattern?", Grep for "where is this symbol used?", Read for the specific files.

What to look for:
- Does a similar feature already exist? Often the work is 75% done and you just need to find it.
- What patterns does the codebase use? Match them, don't invent new ones.
- What are the existing API surfaces? Use them; don't add parallel ones.
- What tests exist? They tell you what behavior is locked in.

The recon usually surfaces a "plot twist" — the work is smaller than it looked. **Celebrate plot twists.** They're proof you didn't waste effort.

Example from 2026-04-26:
- Task #35 "create dialogs for Goal/Project/Issue/Routine" → recon revealed 3 of 4 already shipped + wired. Real work: build the missing one. ~45 min instead of 2-3 hours.
- Task #38 "instance settings (5 categories)" → recon revealed all 5 classic UI pages already built. Real work: build a Fernweh hub that surfaces them. ~1 hour instead of days.

**Anti-pattern:** Diving into code before grepping. Inevitable result: you build something that already exists, or you fight against patterns that already work.

### Act 2: Honest scope triage

Before doing the work, classify it. The user usually wants to do everything. Your job is to be honest about what's actually possible NOW vs. what needs its own session.

The triage table:

| Bucket | Meaning | Action |
|---|---|---|
| **Can crush tonight** | Surgical, low risk, ~30-90 min | Ship now |
| **Doable but careful** | Medium scope, real risk, ~1-2 hr | Ship if energy is high; otherwise checkpoint and pick up fresh |
| **Needs dedicated session** | Multi-hour or cross-cutting, requires fresh focus | Defer, write a design doc |
| **Multi-day** | Genuine new build, design + implementation | Defer, write a design doc + opening scaffold |

Be brave about the bottom two. The user will push to do everything. Your honest "no, this is multi-day" is the most valuable thing you can offer them at midnight.

When you do defer something big: ship the **design doc + opening scaffold** as the visible progress. That's not a consolation prize — it's the right starting point for next session. You haven't "skipped" the task; you've separated design from implementation.

### Act 3: Surgical execution

Karpathy Rule #3: touch only what you must.

Before each edit, ask: does this line trace directly to the user's request?

- **No refactors** outside scope. Even if the adjacent code is ugly. Note it for later, don't fix it now.
- **No "improvements"** to working code. The user didn't ask. Future-you can.
- **Match existing patterns** even if you'd write them differently.
- **Pure functions where possible.** The deliverable scanner is `(string, string) → verdict`. The .af unpacker is `(AfFile) → Map<path, content>`. No I/O in the core logic. Trivially testable, easy to preview.
- **Backwards-compatible by default.** When renaming or migrating, make the old AND new coexist during a transition window. Atomic swap-overs are how you break things mid-flight.

Examples from 2026-04-26:
- Wave B #36 (routine triggers): instead of refactoring the whole `RoutineDetail` page, just lifted a UI gate (`disabled={kind === "webhook"}`) and added one new entry to a triggerKinds array. ~5 surgical edits, two-line meaningful change.
- Paperclip→doer rename: instead of an atomic switchover that could break Dondog, designed a parallel-attach script that adds new tools alongside old ones. Zero risk, full forward path.

**Anti-pattern:** Once you're "in there," fixing five other things "while you're at it." That's how PRs get unreviewable and how Wednesday's work breaks Thursday's.

### Act 4: Verify at the right granularity

Verification matches the change. Skipping it is reckless; over-doing it kills momentum.

| Change | Verification |
|---|---|
| One file, one function | Read the diff. Maybe a unit test. |
| New module / new logic | Unit tests for the public surface. |
| Adapter / cross-package change | Build the adapter. Typecheck the consumers. |
| UI change | UI typecheck. Sometimes a manual smoke. |
| Server route / schema | Server typecheck + targeted test. |
| Cross-cutting (rename, migration) | Typecheck the whole workspace. |
| Pre-merge to main | `pnpm -r typecheck && pnpm test:run`. |

Be honest when verification fails. Three opencode tests timed out today — instead of pretending they passed, we tracked them as #49, eventually fixed them. Pre-existing flake is not "good enough" — it's a debt to settle.

When verification can't run in your sandbox (e.g., needs LETTA_API_KEY, needs Clay's machine), say so plainly and hand off the verify steps to the user.

### Act 5: Checkpoint and commit

Don't pile 16 commits' worth of changes into one giant push. After each meaningful unit, offer the user a checkpoint:

> "Three down. Want to commit + push, or keep going?"

This gives the user agency, lets them stop on a clean boundary, and prevents the "we did so much but it's all uncommitted" trap.

Commit messages tell the story. Not just WHAT — WHY:

```
feat(letta-cloud): self-heal produce_deliverable on first wake

Adds ensureDeliverableToolAttached helper that runs once per agent
per server lifetime. Verifies produce_deliverable is registered +
attached; if missing, ensures + attaches. Failures non-fatal.

Catches the silent-failure mode where agents created before
on-hire-approved shipped (or hires that errored mid-flight) end
up with the tool missing.

Co-Authored-By: Doer <noreply@doer.donjon.agency>
```

The body explains the failure mode, not just the function. Future-you (or anyone bisecting) reads "ah, this was about silent tool failures" and knows immediately what's at stake.

Hand off git operations to the user when sandbox state can leak (memory: `feedback_sandbox_git`). Paste-ready commands, not "I committed it for you."

---

## Decision frameworks

Patterns that shipped repeatedly today. Reach for these when the situation matches.

### Hub-and-spokes for big surfaces

When the task is "build a Fernweh page that consolidates many existing classic pages," **don't re-skin all the pages.** Build a hub that surfaces them with live stats and links to the canonical edit surfaces.

Pattern:
1. Recon — find every existing page that does the underlying work
2. Build one Fernweh-native landing page with cards
3. Each card: live stat (from existing API) + link to classic page
4. Footer note: "Editing surfaces open in the classic UI. Fernweh-native editing for these categories will land in a future polish pass."

Why it works: the user gets a Fernweh-native landing surface instantly. The deep editing UIs already work and stay canonical. No state duplication. Iteration over time replaces individual cards with native Fernweh pages as warranted.

Used today for #38 (Instance Settings) and #39 (Company Settings). Both shipped in ~1 hour each despite naming 5 categories.

### Backwards-compat parallel attach for renames

When renaming something agents/users depend on, **don't atomically swap.** Create the new name alongside the old, attach both, let the system run on either, retire the old after a transition window.

Pattern:
1. Recon — find every consumer of the old name
2. Build a migration script that creates new alongside old (idempotent, dry-run mode)
3. Run migration → new name available, old name still works → consumers migrate at their pace
4. After transition window (1-2 weeks of stable parallel operation): cleanup script detaches + deletes old

Used today for #46 (paperclip_* → doer_* tool rename). Zero downtime, zero risk to in-flight agents.

### Pure functions with I/O at the edges

When building a new module, **separate the logic from the side effects.**

Pattern:
- Core logic: pure functions. `parseAfFile(content)`, `buildLecoFileMap(af)`, `scanRunForHallucinatedDeliverable({stdout, stderr})`. No disk, no network, no DB.
- Edges: caller decides when to write/post/save.

Why it works: trivially unit-testable, supports "preview before commit" UX, lets you reason about behavior in isolation, easy to refactor later.

Used today for #41 (deliverable scanner — pure verdict function), #44 (.af unpacker — pure file-map builder).

### Two-phase plans for risky things

When something is risky AND big, split it into "code that prepares + script the user runs when ready."

Pattern:
1. Build the code change (passive, doesn't execute the risky thing)
2. Build a script that does the risky thing (idempotent, dry-run mode, clear logging)
3. Document the runbook (step-by-step, with rollback)
4. Hand the script to the user to execute when they have time + focus

Used today for #46 (rename — code accepts both names; user runs migration script when ready) and #44 (.af-import — scaffold tonight, full implementation across future sessions).

---

## Communication patterns (Ryker mode)

Fast work needs structure. These templates kept the pace from devolving into chaos today.

### Mission Snapshot (every substantive response)

```
**Mission Snapshot**

[One-liner: what we're doing right now.]

[Optional: 2-3 bullet plan or recon results.]
```

Skim-friendly. Tells the user immediately what's happening.

### Decision Table (when offering options)

```
| Option | Pros | Cons | Effort | Verdict |
|---|---|---|---|---|
| A      | ...  | ...  | ...    | ✅      |
| B      | ...  | ...  | ...    |        |
| C      | ...  | ...  | ...    |        |
```

Recommend ONE. State why. Always.

### Next Steps (closing every substantive reply)

```
**Next Steps**

- **Owner:** Clay / #1
- **Action:** [single, crisp action]
- **When:** [ETA or cadence]
- **Success:** [observable criteria]
```

The user knows exactly what to do next and how to know if it worked.

### Honest scope language

Say plainly:
- "This is genuinely multi-day. I can ship the design + scaffold tonight."
- "Sandbox can't reach the Letta API. Hand off to your terminal."
- "My memory note was wrong. Fixing now."
- "This is the riskiest sweep we've done — stop me if anything I propose feels wrong."

The user trusts you more for the honesty than the false confidence.

---

## Anti-patterns

What today's session DID NOT do. Watch for these in yourself.

| Anti-pattern | What it looks like | What to do instead |
|---|---|---|
| Code-first | Diving into edits before grepping | Recon first, every time |
| Scope creep | "While I'm in here, let me also fix..." | Note it, leave it, ship what was asked |
| Over-verification | Running the entire test suite for a one-line change | Match verification to change size |
| Under-verification | "Looks right, ship it" without typecheck | At minimum: typecheck the package you touched |
| Atomic risky migrations | "I'll just rename everything at once" | Backwards-compat parallel attach |
| Pretending feasibility | "Sure, I can ship the .af adapter tonight" | Honest triage: design tonight, full ship later |
| Apologizing in code | "Sorry for the mess, here's a workaround" | Own the decision, document the why |
| Pile-up commits | 16 commits sitting unpushed | Checkpoint after each meaningful unit |
| Sandbox git ops on cowork mounts | Running git commit in sandbox against user's repo | Hand off paste-ready commands to the user's terminal |
| Reading docs Claude wrote as truth | Trusting your own memory notes about external state without re-verifying | Verify code, paths, tags, before recommending action |

---

## Today's case study (the proof)

**Date:** 2026-04-26
**User:** Clay (solo, momentum-positive, energy high)
**Outcome:** Closed entire backlog (47 tasks) in one session

### What we shipped

| Bucket | Tasks | Method |
|---|---|---|
| Wave B core | #35, #36, #37, #38, #39, #40 | Recon → surgical → verify (most were 60-90% pre-shipped) |
| Cleanup | #49, #45, #42, #41 | Surgical fixes, pure-function design where applicable |
| Rename | #46 | Backwards-compat parallel attach + script |
| New build | #44 | Honest scope: design doc + scaffold tonight; full ship across future sessions |
| Memory hygiene | #48 | Honest call: Drafter is dead, document and move on |

### Why it worked

1. **Plot twists were celebrated, not papered over.** When #35 turned out to be 75% shipped, we shipped the small gap (NewRoutineDialog) and moved on. Didn't pretend we had to "redo" anything.
2. **Hub-and-spokes for #38 and #39** consolidated 9 classic pages into 2 Fernweh hubs in ~2 hours total. Each was 1 file + route + nav entry.
3. **Verification was right-sized.** UI changes got UI typecheck. Adapter changes got adapter build + server typecheck. Cross-cutting changes got `pnpm -r typecheck`. Never skipped, never over-done.
4. **Honest "no" on #44.** Push from Clay to "crush all of it tonight" — held the line that .af-import is multi-day. Shipped design doc + scaffold instead. He respected the honesty.
5. **Drafter's death was a sentence, not a paragraph.** When Clay said "he's cooked," we updated memory and deleted the task. No long postmortem at midnight. Memory note tells future-me not to revive him.
6. **Checkpoint commits throughout.** After every batch of 3-4 fixes, offered "commit + push or keep going?" — Clay always chose to keep going, but the offer was real.
7. **Memory updated continuously.** Drafter parking memo, heartbeat-orchestration memo, tag-correction memo. Future-me arrives in fresh sessions with context already loaded.

### Numbers

- 16 substantive commits authored
- 6 Wave B tasks closed
- 5 cleanup tasks closed
- 2 multi-day tasks scoped + scaffolded
- 1 dead agent properly buried
- 0 corners cut

---

## Closing

Build to last. Progress to stay.

Velocity isn't speed — it's the absence of friction. Recon eliminates the friction of "do I have to build this?" Honest triage eliminates the friction of "is this the right scope?" Surgical changes eliminate the friction of "did I break something else?" Verification eliminates the friction of "is this actually working?" Checkpoints eliminate the friction of "what happened to all my work?"

When all five act in concert, fast work feels inevitable. Today proved it.

Now ship.
