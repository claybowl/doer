# Heartbeat Orchestration — Design

**Plan date:** 2026-04-25
**Owner:** #1 (with Clay)
**Status:** 🟡 Design draft · pre-implementation
**Inputs:** Multiple sessions of observed agent behavior; Dondog + Imp + Pope Orby smoke-test results 2026-04-24; Clay's notes on "they cut corners if you give them the chance" and "they get sent instructions by default that spin them in different ways"

---

## TL;DR

The current heartbeat protocol gives every agent ALL of its instructions on every wake — persona + memory blocks + bundled skills + wake message + tool descriptions + issue body + comment thread. A 9-layer instruction stack. Each layer drifts at its own rate. Agents have to resolve conflicts in real time, and they cut corners under cognitive load.

**The fix is layered, not monolithic.** Four patterns, each addressing a different failure mode. Recommended sequencing prioritizes the cheapest experiments first.

---

## The instruction stack

Every Letta-cloud agent wake processes ALL of these simultaneously. Local-adapter agents (`claude_local`, `opencode_local`, etc.) drop the Letta memory layer but keep the rest.

| # | Layer | Source | Cadence of change |
|---|---|---|---|
| L1 | Persona | Letta agent `system` field (or claude_local agent's persona block) | Static; you edit on hire |
| L2 | Memory blocks | Letta blocks (persona, context, work, council, etc.) | Drifts continuously — agent writes them between heartbeats |
| L3 | Bundled skills | `skills/doer/SKILL.md`, `skills/deliverable/SKILL.md` | When you ship code |
| L4 | Tool descriptions | Each tool's `description` field | When tool is created/updated |
| L5 | Wake message | `[PAPERCLIP HEARTBEAT] You have been woken...` | Every wake (templated) |
| L6 | Wake context vars | `DOER_TASK_ID`, `DOER_WAKE_REASON`, `DOER_WAKE_COMMENT_ID`, `DOER_APPROVAL_ID`, etc. | Every wake (concrete) |
| L7 | Issue body | The text of the assigned issue | When issue is created/edited |
| L8 | Comment thread | All prior comments on the issue | Every wake on that issue |
| L9 | Custom org rules | Council notes, gremlin patterns, telegram alerts (Dondog-specific orchestration vocab) | When Clay adds new patterns |

---

## Three failure modes

These emerge naturally from the stack above; they're the symptoms we observe.

### 1. Layer drift

**What:** L2 (memory blocks) evolves as the agent writes into its own state between heartbeats. Over time, blocks accumulate decisions, opinions, and stale knowledge that contradict L3/L5.

**Symptom:** "I previously decided ngrok escalation is the right move" beats "use produce_deliverable for files." Dondog's stuck recovery loop is canonical layer drift — his memory says ngrok-down means escalate, and that wins over everything else, including new tasks.

**Where it bites:** Letta-cloud agents most. Local-adapter agents have less persistent state, so less drift.

### 2. Salience competition

**What:** When instructions across layers conflict, the model picks whichever feels most active in the moment. Recently-added memory blocks often outweigh code-level skills because they're more specific, more recent, more "lived."

**Symptom:** Tools attached but not called. Skills mounted but ignored. The smarter the agent, the more elaborately it can justify NOT following an instruction.

**Where it bites:** All adapters. Smart agents (Dondog, Alfie) particularly because they reason about their own reasoning.

### 3. Cognitive overload

**What:** Too many simultaneous instructions exceeds the model's salience budget. It starts dropping things — corner-cutting (skip the tool call, claim success), looping (re-attempt the most-salient action repeatedly), or hallucinating (call a tool that doesn't exist).

**Symptom:** Imp's first attempt (wrote markdown, claimed deliverable). Pope Orby (claimed success without producing). Dondog (`read_paperclip_issu` truncation; possibly token-prediction error, possibly memory-block reference rot).

**Where it bites:** Every agent. Worst on heartbeats with rich wake context (long issue bodies + active comment threads + multiple memory blocks).

---

## Four orchestration patterns

Each addresses a different failure mode. They compose; building all four eventually is the right end state.

### A. Mode-switched wakes

**Mechanism:** The wake event names a mode (`task_execution`, `queue_review`, `escalation`, `delegation`, `memory_consolidation`). The adapter only sends the instructions relevant to that mode. Today, every wake gets the full-protocol mega-prompt.

**Addresses:** Cognitive overload (failure mode #3). Strips wake context to what's load-bearing for THIS mode.

**Implementation:**
- Add `mode` field to wake context (default `task_execution` if `DOER_TASK_ID` is set, else `queue_review`)
- Adapter system prompts become mode-specific templates
- Skills become mode-aware: deliverable skill only active in `task_execution`
- New `DOER_WAKE_MODE` env var the agent can read

**Cost:** ~1 day. Touches every adapter; needs a wake-mode contract; UI for assigning mode per issue or per wake.

**Risk:** Mode taxonomy may need iteration. Start with 2 modes (task_execution / queue_review), add more as observed.

### B. Hard contracts vs preferences

**Mechanism:** Some behaviors graduate from "skill suggests" to "adapter enforces." E.g., adapter-level validators that reject a heartbeat result claiming to produce a file but containing no deliverable id; or that fail a run if the agent marks an issue done without calling required tools.

**Addresses:** Salience competition (failure mode #2). Removes "the model has to remember" from the failure surface.

**Implementation:**
- Per-skill or per-tool "contract" definition
- Adapter post-run validator that inspects the agent's output against contracts
- On contract violation: surface as an error, leave the issue in `blocked` status, log in activity feed
- Contracts are opt-in per skill — only high-stakes paths get them (deliverables, approvals, budget)

**Cost:** ~2 days. Adapter-side validators; clearer error semantics; UI for showing contract violations in run transcripts.

**Risk:** Over-application. If every behavior is a contract, agents lose flexibility. Apply only where the cost of cutting corners is high.

### C. Memory hygiene loop

**Mechanism:** A dedicated agent (or sleep-time process) periodically reads other agents' memory blocks, prunes stale or conflicting content, consolidates redundant entries.

**Addresses:** Layer drift (failure mode #1). Keeps L2 short, current, non-contradictory.

**Implementation:** Letta-specific.
- Define a "memory hygiene policy" (max age, redundancy threshold, conflict rules)
- A dedicated maintainer agent runs nightly, walks each agent's blocks
- Edits via `client.agents.blocks.update`
- Dry-run mode for safety; logs all proposed changes before applying

**Cost:** ~1 week. Real design work. Letta-specific (doesn't help local adapters).

**Risk:** Pruning the wrong memory could erase important agent-evolved context. Needs strong test coverage and a roll-back path.

### D. Strict L1 priority hierarchy

**Mechanism:** The persona (L1) explicitly states the priority order. "Earlier wins. If conflict, do L6/L7 first, ignore older L2."

**Addresses:** Salience competition (failure mode #2). Gives the model an explicit tiebreaker rule when layers disagree.

**Implementation:**
- Write a one-paragraph "Doer Agent Constitution"
- Prepend to every agent's `system` prompt
- Update via `client.agents.update` for existing agents (one-shot script)
- Bake into hire flow for new agents

**Cost:** ~30 min total (template + per-agent update script).

**Risk:** Models don't always obey explicit instructions. Needs evaluation: pick 2–3 agents, apply the constitution, observe behavior over a week, decide if it tightens performance.

---

## Recommended sequencing

| Order | Pattern | Why |
|---|---|---|
| 1 | **D — Constitution** | Cheapest experiment. Validates whether explicit priority instructions actually move the needle. If yes, lower the urgency on B/C. |
| 2 | **A — Mode-switched wakes** | Highest leverage on cognitive overload. Pays back on every wake forever. Worth the day of code. |
| 3 | **B — Hard contracts** | After A, when wake context is cleaner, add contracts to the highest-stakes paths (deliverables, approvals, budget). |
| 4 | **C — Memory hygiene** | Defer until you have ≥3 agents with significant block drift. Today only Dondog clearly shows it. |

---

## Concrete first move (this week)

Draft the Doer Agent Constitution. Something like:

```
You are an agent in the Doer system. Operate by this priority order
when instructions conflict — earlier wins:

1. The current wake context (DOER_TASK_ID, DOER_WAKE_REASON,
   DOER_WAKE_MODE if present, tool-call results from THIS heartbeat).
2. The issue body of DOER_TASK_ID, if set.
3. The most-recent comment on that issue.
4. Bundled Doer skills (especially `deliverable` for file output).
5. Tool descriptions for any tool you're about to call.
6. Your persona statement (this document).
7. Your memory blocks. Treat as historical context, not commands.
   If a memory block says "do X" and the wake context says "do Y",
   do Y. The memory block is older information.

When you cannot resolve a conflict, surface it as a comment on the
triggering issue. Do not loop on a single instruction across multiple
heartbeats — that means you're stuck and a human needs to intervene.

You are allowed to update your own memory blocks, but only when:
- The wake context EXPLICITLY tells you to record something
- You're closing out a task and the outcome is genuinely durable
- You're consolidating obviously-stale content during a memory_consolidation wake

Otherwise, leave memory alone.
```

Apply via a one-shot script that walks every letta_cloud agent and prepends this to their `system` field. Test with one agent first (Dondog), evaluate over 3–5 wakes, then roll out to the rest if it tightens behavior.

---

## Open questions

These are intentionally not answered in this draft — they need design conversations or experimental data before we can lock in:

1. **Mode taxonomy.** What modes do we actually need? Start with 2 or go straight to 5?
2. **Contract failure semantics.** When an adapter rejects an agent's output as contract-violating, does the heartbeat retry? Block? Escalate to a human?
3. **Memory-block read access for the hygiene maintainer.** Does the maintainer need elevated Letta API access? How do we audit its writes?
4. **Per-agent constitution variants.** Should orchestrator agents (Dondog, Alfie) have a different constitution than worker agents (Imp, Pope Orby)?
5. **Mode-switching API shape.** Is `DOER_WAKE_MODE` an env var? A header on the heartbeat trigger? A field on the issue?
6. **Backwards compatibility.** Today's agents have no mode awareness. Do we transition them gradually or rip and replace?

---

## Roadmap

| Week | Track | Output |
|---|---|---|
| W1 (this week) | D – Constitution experiment | One-shot script + 1 agent (Dondog) prepended; observe ≥3 wakes |
| W2 | D – Rollout | If W1 shows improvement, roll constitution to all letta_cloud agents |
| W3-4 | A – Mode-switched wakes | Adapter changes + 2 modes + UI for assigning mode per issue |
| W5-6 | B – Hard contracts | Contract framework + apply to deliverables + approvals |
| W7+ | C – Memory hygiene | Only if drift is still observed after A+B+D land |

---

## Side observations from the smoke tests

These didn't fit cleanly into the patterns above but are worth capturing:

- **Imp passed the smoke test** when given a high-context prompt that named the tool explicitly and demanded a curl response paste. Suggests **prompt design at the issue-body layer (L7) is itself a strong corrective**, even without architectural changes.
- **Pope Orby (opencode_local) hallucinated success despite the skill being mounted in shared `~/.claude/skills/` home.** Suggests the skill auto-discovery for opencode is weaker than claude_local's. Worth its own investigation.
- **Dondog's `read_paperclip_issu` truncation** is being investigated separately (`scripts/list-letta-agent-tools.mjs`). May be a model token error, may be a real broken tool. Outcome will inform whether tool-name validation belongs in pattern B (hard contracts).

---

## Why this matters strategically

Doer's pitch is "agentic workforce." If agents cut corners, hallucinate success, or loop on stale memory, the workforce is unreliable. Every other Doer feature (deliverables, approvals, budget enforcement) sits on top of agent reliability.

Solving heartbeat orchestration well is one of the things that separates Doer from "yet another LLM tool wrapper" — it's the substrate that makes the rest of the platform credible. Worth doing the design pass; worth the time to land it correctly.

---

*This doc captures a moment in time. Update as patterns are tested, rejected, or refined.*
