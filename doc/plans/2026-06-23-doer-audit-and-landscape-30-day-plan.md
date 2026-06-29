# Doer Audit + Agentic Landscape Assessment + 30-Day Plan

_Date: 2026-06-23 · Author: #1 (Claude) for Clay · Status: Proposed_

## Mission Snapshot

You asked for ground truth on what Doer actually is right now, where it sits in the
agentic landscape, and a 30-day plan to get back to shipping/selling. This doc is that —
built from the real repo (git log, TASKS.md, doc/plans/, release notes), not from memory
files that had drifted stale. Bottom line up front: **the memory system claim is true and
verified — Phase 1 is complete, tested, and shipped.** What's NOT done is the demo trail
that proves it, and nothing has shipped to a customer in ~7 weeks. The gap isn't the
product. It's the distance between "built" and "seen."

---

## Part 1 — Audit: What Doer Actually Is, Right Now

### Ground truth source
`Doer-Development/donjon-doer/` — real git history (40+ commits reviewed), `TASKS.md`
(updated 2026-06-03), `doc/plans/2026-06-11-session-0.1.0-buildout-summary.md` (most
recent session log, 2026-06-09→06-11), and release notes through `v2026.619.0`
(2026-06-19).

**Correction to standing memory:** `memory/projects/doer.md` in donjonOrg understates
current state — it doesn't mention the v0.1.0 memory substrate, the desktop updater
rewrite, or the ngrok elimination. That memory file needs a refresh after this audit.

### What shipped, verified against commits and tests (716 tests / 143 files green)

**1. Memory as a first-class surface — COMPLETE (Phase 1 of "Capture the Magic")**
This is the headline claim and it checks out:
- `agents-md-memory` bundled skill — file-memory protocol mirroring `~/.letta` conventions
- Auto-attach wiring: bindings pull their teaching skill into `desiredSkills` automatically
- Write path opened — new bindings default read-write on their own namespace
- Visible org memory root `~/Doer/<org>/memory/` (replaces hidden `.letta-memory`)
- Editable memory files in-browser (reuses the Instructions-bundle editor pattern)
- **Git-backed History tab with session diffs** — every agent run auto-commits what it
  wrote; you can literally watch an agent's memory evolve, run over run
- `memfsCapability` plumbed through every adapter + registry

This is real and it's differentiated. Nobody else in the landscape (see Part 2) shows
you a diff of what an agent learned.

**2. Starter Teams / .af import — Infrastructure complete, content blocked on you**
- `TeamManifest` types, full import service: hires in order, wires `reportsTo`, unpacks
  `.af` memory, scrubs credentials, seeds shared coordination blocks, git-commits each
  hire, full rollback on failure
- "Hire a Team" UI shipped on both surfaces (standard + Fernweh)
- Three teams importable today: `demo-crew`, `ship-crew`, `recon-crew`
- **`donjon-core` (DonDog → Chef → Alfie) is specced and the importer supports it, but
  it's blocked on you producing sanitized `.af` exports.** This is the one item where
  the bottleneck is literally Clay, not engineering.

**3. Handoff trail — NOT STARTED**
Phase 3 (read-only delegation chain timeline on IssueDetail) is the explicitly named
"demo centerpiece" and it hasn't been built. This matters: it's the piece that makes
the orchestration *legible* to a prospect watching a demo. Memory + teams without the
trail means you can show "the agent remembered something" but not "watch the chain
think." That second one is the sales moment.

**4. Distribution — desktop updater rewritten, ngrok dependency eliminated**
- Custom in-app updater (R2 feed) replacing broken Squirrel auto-update for unsigned
  macOS builds — this was a real blocker to anyone outside you running Doer and
  getting updates; now fixed (desktop v0.1.7)
- `letta-cloud` adapter no longer needs E2B→ngrok tunnels for issue operations — all
  five Paperclip issue tools now run as direct HTTP calls from the Node server. This
  removes a fragile, latency-adding hop from the core orchestration path
  (v2026.619.0, 2026-06-19 — four days before this doc)
- Heartbeat context injection — agents now get issue title/description pre-fetched
  into wake context, cutting a round-trip
- Self-healing tool attachment on every wake

**5. Core platform (stable, not new this sprint, but the actual product)**
- Two-layer architecture: Control Plane (registry, goal-hierarchy task assignment,
  budget hard-stop, heartbeat monitoring, board governance) + Execution
  Services/Adapters (process, http, claude_local, codex_local, opencode_local,
  openclaw_gateway, cursor, letta-cloud, gemini-local, pi-local)
- Three agent integration levels — callable → status-reporting → fully instrumented.
  "If it can receive a heartbeat, it's hired" — genuinely low-friction onboarding for
  any agent runtime, not just one vendor's
- Core invariants holding: company scope isolation, atomic issue checkout, budget
  hard-stop, approval gates, immutable activity log

### What's actually blocking 0.1.0 (from the buildout summary, verbatim remaining list)
1. Your sanitized DonDog/Chef/Alfie `.af` exports → `donjon-core` ready
2. Phase 3 handoff trail (the demo centerpiece, not yet built)
3. Gremlin packs — correctly deferred to post-demo, customer-driven
4. Cut the 0.1.0 release

Two of four items are pure execution (#2, #4). One is a 30-minute task sitting on your
desk (#1). None of this is a multi-week build. **0.1.0 is closer to done than the
"I've paused selling to keep building" framing suggests.**

---

## Part 2 — Landscape: Where Doer Sits in the 2026 Agentic Frontier

### The big one: OpenAI Frontier (launched 2026-02-05)
Frontier is OpenAI's enterprise agent orchestration platform — "Business Context"
(connects CRM/data warehouse/internal apps), "Agent Execution" (parallel multi-agent
task completion across real workflows), and built-in enterprise security/governance.
Early customers: Uber, Intuit, State Farm, HP, Oracle; pilots with Cisco and T-Mobile.
Critically, Frontier is **vendor-agnostic on models** — it orchestrates OpenAI, Google,
Microsoft, Anthropic, and custom agents, explicitly avoiding lock-in. It's positioned
directly against Anthropic's Claude Cowork and ServiceNow's AI Control Tower.
([OpenAI](https://openai.com/index/introducing-openai-frontier/), [VentureBeat](https://venturebeat.com/orchestration/openai-launches-centralized-agent-platform-as-enterprises-push-for-multi))

### The rest of the field
- **Google Gemini Enterprise Agent Platform** — end-to-end dev/orchestration/governance
  with agent identity management and simulation tools.
- **IBM Enterprise Advantage on AWS** — production-ready, governance/lifecycle baked in
  from day one.
- **Microsoft Copilot Studio, Salesforce Agentforce** — the incumbent-platform plays,
  selling orchestration as a feature of an existing seat license.
- **xpander.ai, Kore.ai, OneReach.ai, Pipefy, XMPro** — the mid-market / pure-play
  orchestration vendors.
([xpander.ai vendor list](https://xpander.ai/resources/top-agent-orchestration-vendors-2026), [Kore.ai](https://www.kore.ai/blog/best-ai-agent-management-platforms))

### What the category actually agrees a "control plane" is
The emerging consensus framing (echoed across multiple 2026 reports): a control plane
sits above individual agents and does three things — task routing, state persistence
across handoffs, and conflict resolution between agents. The Kubernetes analogy is
explicit in the literature now: "Kubernetes is to container orchestration what a
control plane is to agent orchestration." This is exactly the frame Doer's README
already uses ("operating system for autonomous AI companies") — you are not
mis-positioned, you are using the same language the analysts are now converging on.

### The honest adoption numbers
Only ~28% of enterprises attempting multi-agent deployments achieve sustained results.
Only 7-8% of organizations have integrated cross-agent governance. Over 75% are worried
about vendor/API dependency risk. ([Innoflexion](https://www.innoflexion.com/blog/multi-agent-orchestration-enterprise-genai-2026))

### Where Doer actually differs from Frontier/Gemini/IBM — three real edges
1. **Memory is visible and editable, not a black box.** Frontier and the hyperscaler
   platforms sell "Business Context" as a connector layer — pulling in your CRM/data
   warehouse so agents have facts. None of the public material for Frontier, Gemini
   Enterprise, or IBM's stack describes a git-backed diff view of what an agent
   *learned and changed about itself* between runs. Doer's Memory History tab is a
   genuinely uncommon feature, not a checkbox match.
2. **"If it can receive a heartbeat, it's hired" is a lower floor than any competitor's
   onboarding.** Frontier's pitch is multi-vendor-agnostic at the model level, which is
   real and good — but it's still a heavyweight enterprise platform with an
   enterprise sales motion behind it (Uber, Oracle, State Farm). Doer's adapter model
   (process/http/local-CLI/cloud) means a solo dev with a Bash script can be "hired"
   in minutes. That's a different buyer than Frontier's.
3. **Doer is small enough to demo end-to-end live.** None of the big platforms can be
   walked through start-to-finish in a 10-minute call. Doer, once the handoff trail
   ships, can be: hire a team → give it a goal → watch the chain think → watch memory
   change. That's a sales weapon the enterprise platforms structurally can't offer —
   their value prop requires weeks of integration before there's anything to watch.

### Where Doer is genuinely behind
- **Compliance/governance maturity.** Frontier ships with audit, explicit permissions,
  enterprise security as a stated pillar from day one. Doer has activity logs and
  approval gates (real, working) but no SOC 2, no formal governance framework
  marketing, no named compliance certifications. This is the gap the existing
  DIS-2026-006 dossier already names correctly — don't re-litigate it, just don't
  pretend it's closed.
- **No named pilot customer yet.** Frontier's credibility is "Uber and Oracle use
  this." Doer's credibility right now is "Clay's own agent company runs on this,"
  which is a real and compelling story but isn't a third-party reference yet.
- **Zero public surface area.** Frontier, Gemini Enterprise, and the others all have
  press coverage, analyst notes, comparison blog posts written *about* them. Doer has
  none of that — which is fine at this stage, but means the "best-in-class" claim is
  currently unfalsifiable to anyone outside this room. That's the experiment problem
  Part 4 below is designed to solve.

---

## Part 3 — Positioning Assessment

Clay's instinct ("I'm fully confident this is one of the most powerful apps out
there") is not unfounded — the memory substrate is a real, working, differentiated
capability that the big platforms don't show in their public materials. But
confidence built from internal experiments isn't the same claim as "best-in-class,"
which requires a comparison someone outside this room can verify. Two things are true
at once:

- The product is further along than the "I paused selling to build" framing implies —
  most of 0.1.0 is done.
- The proof is entirely internal. There is no artifact yet that lets a skeptical
  outsider (a prospect, an analyst, a Twitter thread) watch Doer do something Frontier
  or Gemini Enterprise can't, and believe it without trusting Clay's word.

The 30-day plan below is built around closing that second gap first, because it's the
cheapest, fastest-converting thing to do with what's already built — not around more
building.

---

## Part 4 — 30-Day Plan of Action

Frame: ship the 0.1.0 demo centerpiece this week, then spend the remaining ~25 days on
the leverage motion (Founding Partner campaign, K8 revenue lane, named-pilot push) —
not on new Doer features. [[revenue-motion]] already names this pivot; this plan is the
execution detail underneath it.

### Week 1 (Jun 23–29) — Finish 0.1.0, don't start anything new
| Day | Action | Owner |
|---|---|---|
| Mon–Tue | Produce sanitized DonDog/Chef/Alfie `.af` exports (the one task only Clay can do) | Clay |
| Tue–Thu | Build Phase 3 handoff trail (read-only delegation timeline on IssueDetail, from activity-log data) | Build crew |
| Fri | Cut 0.1.0 release; record the full demo (spin-up → hire donjon-core → give DonDog a goal → trail → memory diff) as a video asset | Clay + crew |

**Success check:** a 5-minute screen recording exists showing the full loop with zero
narration needed to understand it.

### Week 2 (Jun 30–Jul 6) — Make the proof public
- Cut the demo video into a 90-second version for outbound/LinkedIn and a 5-minute
  version for the website/sales deck.
- Write one comparison artifact: "What Doer shows you that Frontier doesn't" — grounded
  in Part 2 above, three concrete capability claims, each with a 15-second clip.
  This is the falsifiable, outside-verifiable version of "best-in-class."
- Resume the Founding Partner Marketing Campaign cadence — this was paused for the
  build sprint; the build sprint is now substantially done.

**Success check:** the comparison artifact and demo video are postable without
needing to caveat anything as "coming soon."

### Week 3 (Jul 7–13) — Convert the proof into pipeline
- Use the demo as the centerpiece of 5–10 outbound conversations (warm network first,
  per existing revenue-motion cadence).
- Run K8 in parallel — per the existing revenue-motion doc, K8 is the faster/lower-
  effort lane; don't let Doer's longer sales cycle starve it of attention this month.
- Identify 1–2 candidates for the "named pilot" item already on the 90-day roadmap.

**Success check:** at least one prospect has seen the live demo (not just the video).

### Week 4 (Jul 14–20) — Run the best-in-class experiments
Three concrete, externally-legible experiments to run (these directly answer your
ask for "experiments that demonstrate best-in-class"):

1. **The blind diff test.** Give Doer and a competitor sandbox (e.g. a CrewAI or
   LangGraph setup, or Frontier if you can get sandbox access) the identical multi-step
   goal requiring agent handoff. Record both. The comparison artifact is which one a
   non-technical observer can explain after watching once — Doer's trail+memory-diff
   view is built for exactly this test.
2. **The memory persistence test.** Run the same agent across two sessions with a
   deliberately changed fact in between (e.g. "the meeting moved to Friday"). Show the
   memory diff catching it. Ask: can you point to where Frontier or Gemini Enterprise
   shows you this? (As of this research, no public material describes an equivalent.)
3. **The time-to-hire test.** Time how long it takes to onboard a brand-new agent
   runtime into Doer via the adapter model vs. the documented onboarding time for
   Frontier/Gemini Enterprise (their public docs describe enterprise integration
   timelines in weeks). This is the "if it can receive a heartbeat, it's hired" claim,
   timed and recorded.

**Success check:** at least one of these three experiments produces a clip or number
good enough to lead a LinkedIn post or sales deck slide with.

---

## Risks & Mitigations

- **Risk: Clay reads this as permission to keep building.** Mitigation: every week
  after Week 1 has zero new Doer feature work in it. The plan is proof-and-sell, not
  build-more. [[revenue-motion]] already flags this exact failure mode — reread that
  doc's "Notes for #1" section if this plan starts drifting back toward features.
- **Risk: the .af export task slips because it's tedious, not hard.** Mitigation: it's
  explicitly Day 1-2 of Week 1, ahead of anything else, because it's the one item only
  Clay can unblock.
- **Risk: comparison experiments invite a "but Frontier has Uber" rebuttal.** Mitigation:
  don't claim market position you don't have (no named pilot yet) — claim the specific,
  demonstrable capability gap (memory legibility, onboarding speed), which is true and
  provable today regardless of company size.

## Next Steps

- **Owner:** Clay
- **Action:** Produce sanitized `.af` exports for DonDog/Chef/Alfie
- **When:** by EOD Tue 2026-06-24
- **Success:** `donjon-core` team shows `ready: true` in the importer

- **Owner:** Clay + build crew
- **Action:** Ship Phase 3 handoff trail, cut 0.1.0
- **When:** by Fri 2026-06-27
- **Success:** full demo loop recorded, zero narration needed
