# Schrute-100 — 100-Desk Departmental Benchmark

**Date:** 2026-04-28
**Status:** Design — pre-implementation
**Owner:** DonDog + Clay
**Scope:** Replace the 10-desk benchmark with a 100-desk departmental hierarchy benchmark.

---

## 1. Goal

Build a benchmark that measures a Doer agent team's ability to execute one full week of a 100-person knowledge-work company's output, with realistic vertical handoffs (IC → Director) and cross-departmental coordination.

**Output unit:** Dw (Dwight) — 1.0 Dw = 1 human knowledge-worker output for one work day.
**Run output:** Total Dw, per-department Dw, weakest desk, strongest desk, dependency-graph completion rate.
**Marketing claim it should support:** "Doer's [agent team] delivers N.NN human-weeks of corporate knowledge work in M hours."

---

## 2. Structure: 10 Departments × 10 Levels

### 2.1 The 10 departments

Chosen to cover the canonical functional areas of a ~100-person SaaS / professional-services company:

| # | Department | Why it's here |
|---|---|---|
| 1 | **Executive** | CEO/COO/CFO functions — strategy, board prep, OKRs |
| 2 | **Engineering** | Software builds, infra, architecture decisions |
| 3 | **Product** | Roadmaps, PRDs, user research synthesis |
| 4 | **Design** | UX, brand, interaction specs |
| 5 | **Sales** | Pipeline, deal motion, account plans |
| 6 | **Marketing** | Content, campaigns, demand gen |
| 7 | **Customer Success** | Onboarding, retention, support escalations |
| 8 | **Finance** | Books, forecasts, controls |
| 9 | **People (HR)** | Hiring, comp, performance |
| 10 | **Legal & Operations** | Contracts, compliance, vendor mgmt, IT |

### 2.2 The 10-level ladder

Each department has the same 10-level seniority ladder (titles vary, structure is constant):

| Level | Generic title | Output type |
|---|---|---|
| L1 | IC1 (entry) | Atomic task — one ticket, one deliverable |
| L2 | IC2 (mid) | 2-3 atomic tasks, one synthesis |
| L3 | IC3 (senior) | Full feature/initiative own |
| L4 | Staff IC / Specialist | Cross-team coordination on one project |
| L5 | Lead / Tech Lead | Own a sub-area, set technical direction |
| L6 | Manager | Plan + delegate + review for 3-5 reports |
| L7 | Senior Manager | Multi-team plan, eng-cycle ownership |
| L8 | Director | Department strategy, hiring, headcount |
| L9 | VP / Senior Director | Cross-functional coordination, exec reporting |
| L10 | C-level / SVP | Vision, board, capital, big decisions |

**Total desks:** 10 × 10 = 100.

---

## 3. Dependency Graph (DAG)

### 3.1 Within-department (vertical) handoffs

Each level produces output that the level above synthesizes:
```
L1 work product ─┐
L2 work product ─┼─→ L5 (Lead) synthesis
L3 work product ─┘                ↓
                       L6 (Manager) plan
                                  ↓
                       L7 (Sr Mgr) cross-team plan
                                  ↓
                       L8 (Director) strategy
                                  ↓
                       L9 (VP) exec input
                                  ↓
                       L10 (C-level) decision/comms
```

In any single dept run, that's a 10-node chain. The L10 desk **needs** L9's input, which needs L8's, etc. Critical path.

### 3.2 Cross-department (horizontal) handoffs

Real orgs have these — we model the most universal ones:

| From → To | Example handoff |
|---|---|
| Sales L6 → Finance L3 | New deal terms → invoicing |
| Engineering L8 → Marketing L6 | Launch readiness → release notes |
| Product L8 → Engineering L7 | Roadmap → eng cycle plan |
| Customer Success L6 → Product L3 | Bug list / feature requests |
| HR L8 → Finance L8 | Headcount plan → comp budget |
| Legal L7 → Sales L8 | Contract redlines → close motion |
| Design L5 → Engineering L3 | Specs → implementation tickets |
| Finance L10 → Executive L10 | Forecast → board pre-read |
| Marketing L8 → Sales L8 | Pipeline targets → quota planning |
| Operations L7 → All Department L8s | Vendor budget → dept allocations |

10 cross-dept edges. Combined with 10 internal chains (9 edges each = 90), total **DAG = ~100 edges** across 100 nodes. Average node has 2 in-edges + 2 out-edges. Realistic.

### 3.3 Bottleneck analysis

- **In-degree heavy nodes** (information sinks): L10s, L8s. They consume from many sources.
- **Out-degree heavy nodes** (information sources): L1s-L3s. They produce raw work.
- **Critical path bottlenecks**: Operations L7 (10 outbound edges to dept directors) — single point of failure, scoring should weight this.

### 3.4 Run modes

100 desks is heavy. We support three run scopes:

| Mode | Scope | Desks | Wall time est. | Cost est. (3-judge) |
|---|---|---|---|---|
| `single-dept` | One department's L1–L10 chain | 10 | 30–60 min | ~$1.50 |
| `cross-section` | One level across all 10 depts | 10 | 30–60 min | ~$1.50 |
| `full` | All 100 desks | 100 | 4–8 hr | ~$15 |

---

## 4. Desk Briefs — Sourcing & Format

### 4.1 Source hierarchy

For each of the 100 desks, the brief is grounded in (in priority order):

1. **O*NET Online Task Statements** — `https://www.onetonline.org/`. Each occupation has a "Tasks" list (e.g., "Prepare invoices, reports, memos…"). We pick 3–5 relevant tasks per desk and assemble them into a daily packet.
2. **U.S. BLS Occupational Outlook Handbook** — `https://www.bls.gov/ooh/`. Provides "What X Do" narrative + median pay ranges (used to weight Dw scoring — a $200k role's daily output is weighted differently than a $40k role).
3. **Industry reports** — McKinsey, BCG, Deloitte annual functional reports for time-allocation studies. Used to set the *mix* of tasks (e.g., "marketers spend ~24% of time on reporting" → marketing desk briefs include a reporting deliverable).

### 4.2 Brief template

Every desk brief follows the same shape:

```
You are <Title> at a 100-person <industry> company. Today is one day of work.
Your task packet:

1. <task A> — sourced from O*NET task statement #X
2. <task B> — sourced from O*NET task statement #Y
3. <synthesis or handoff task> — depends on input from <upstream desk(s)>

Deliverables:
  (a) <file A>.<ext>
  (b) <file B>.<ext>
  (c) <handoff doc to downstream desk>.md

Inputs you'll receive (if upstream desks complete first):
  - <upstream desk N output>

Time budget: <see §4.4 — tiered by level, 25–55 min>.
Citations:
  - O*NET <code>: <task statement quote>
  - BLS OOH: <occupation page URL>
```

### 4.4 Time-budget tiers

A modest range across levels — enough to differentiate IC work from exec synthesis without exploding total run time. Per Clay: "not too drastic."

| Levels | Time equivalent | Rationale |
|---|---|---|
| L1–L3 (ICs) | 25 min | Atomic deliverables, narrow scope |
| L4–L6 (Specialists / Leads / Managers) | 35 min | Cross-team coordination, light synthesis |
| L7–L8 (Sr Mgr / Director) | 45 min | Multi-team plans, dept strategy |
| L9–L10 (VP / C-level) | 55 min | Full synthesis, exec output |

Total wall-clock equivalent for a full 100-desk run if perfectly serial: ~62 hours of "human time." If parallelized across all 10 departments: ~6.2 hours of human equivalent. This is what we benchmark agent throughput against.

### 4.3 Citation display (UI requirement)

Per Clay's request, the FernwehSchruteBenchmark page must show research sources. Add a **"Methodology" tab** or section displaying:
- Top-level: "This benchmark grounds every desk in 3 public sources: O*NET, BLS OOH, and 10 industry-specific reports."
- Expandable per-desk: clicking a desk shows the exact O*NET task IDs and BLS OOH page used.
- Sources page: linkable bibliography listing every URL pulled.

---

## 5. Scoring — 3-Judge Consensus

### 5.1 Score components (unchanged from v1)

| Component | Weight | Question |
|---|---|---|
| Completion | 40% | Did all required deliverables exist and meet length/format? |
| Quality | 35% | Would a manager accept it without revisions? |
| Accuracy | 15% | Are facts, numbers, and references correct? |
| Handoff | 10% | Did downstream desks get usable input? |

Composite Dw = `(completion·0.40 + quality·0.35 + accuracy·0.15 + handoff·0.10) / 100 × 1.0`

### 5.2 Judge mechanism

Three independent LLM judges grade each desk:

| Judge | Model | Role |
|---|---|---|
| Judge A | Claude Sonnet 4.5 | "The skeptical senior manager" — looks for shortcuts |
| Judge B | GPT-4o (or current frontier) | "The pragmatic VP" — judges fitness for purpose |
| Judge C | Gemini 2.5 Pro (or current) | "The neutral auditor" — checks against rubric only |

Each judge sees:
- The desk brief (with sources)
- The agent's full output
- Per-desk rubric (5–8 specific yes/no checks per component)
- Upstream inputs (so Handoff can be judged)

Each returns a JSON of 4 numbers (0–100). Final score = **median of the 3 judges per component**, then composite formula.

### 5.3 Disagreement flagging

If max(judge) − min(judge) > 25 points on any component → flag desk as "Judge disagreement." Surface in UI for human review. This is the v2 quality signal.

### 5.4 Cost model

- ~3K-token brief + ~5K-token output × 3 judges × 100 desks
- ~24M tokens per full run
- Estimated $10–15 per full benchmark run at current pricing (April 2026)
- Scoreable subset modes (single-dept, cross-section) cost ~$1.50

---

## 6. UI Changes (FernwehSchruteBenchmark)

The current page is a 4-tab static mockup (Desks / Scoring / History / Run). Restructure to:

| Tab | Content |
|---|---|
| **Overview** | Run modes selector, summary stats, latest run |
| **Org Chart** | Visual 10×10 grid — rows = departments, columns = levels. Click a desk for brief preview. |
| **DAG** | Dependency graph viz (nodes colored by status: pending/running/complete/scored) |
| **Methodology** | Source citations, judge models, scoring rubric |
| **History** | Past runs, total Dw, sortable by department, agent, date |
| **Run** | CLI commands + "Start run" button (when plugin installed) |

The org chart view is the headline visual. Make it look great — color cells by Dw score after a run completes (red <0.3, amber 0.3–0.7, green >0.7).

---

## 7. Implementation Phases

### Phase 0 — Scaffolding (do not start yet)
- [ ] This plan reviewed and approved by Clay
- [ ] Decide: build in plugin worker or as separate service? (Recommendation: stays in plugin worker — same pattern as v1.)

### Phase 1 — Data: write the 100 desk briefs

**Approach:** template-driven + parallelized agents. Avoid hand-writing 100 desks.

**1a — Template scaffold (~1 hr, manual):**
- Build `desks/schema.json` — the desk JSON shape: `{ id, dept, level, title, name, brief, deliverables, citations, upstreamDeskIds, downstreamDeskIds, rubric, timeBudgetMin }`
- Write **Engineering** as the canonical reference dept — all 10 levels fully fleshed, with real O*NET citations for L1 (Software Developer), L5 (Software Tech Lead), L8 (Engineering Director), etc.
- Build `desks/names.json` — 100 single-word names, frozen, sorted by department.

**1b — Parallel research sprint (~1 hr wall-clock, 9 hr agent-time):**
- Spawn 9 parallel research agents — one per remaining department (Product, Design, Sales, Marketing, CS, Finance, HR, Legal/Ops, Executive).
- Each agent gets the Engineering reference + the schema + a list of O*NET occupation codes for its department.
- Each agent produces 10 desk JSON files following the reference shape.
- Output committed to `desks/<dept>/L01.json`–`L10.json`.

**1c — Validation pass (~30 min, manual + scripted):**
- Run a `validate-desks.ts` script: every JSON parses, every citation URL exists (HEAD check), every upstream/downstream desk reference resolves, every rubric has 4 components × 5–8 yes/no checks.
- Spot-check 10 random desks for quality.

**Total: ~2.5 hours wall-clock** (vs the original 25-hour estimate).

The trade is judgment quality. If the parallel agents produce thin briefs we add a 1-hour curation pass on top — still well under 25 hr. If the briefs come back great, ship them.

### Phase 2 — Plugin worker updates
- [ ] Replace static `DESKS` constant with imports from generated JSON
- [ ] Update `startRun` to support `mode: "single-dept" | "cross-section" | "full"` and dept/level params
- [ ] Add explicit DAG dependency check before issue creation — block downstream desks until upstream desk's issue closes
- [ ] Add 3-judge integration: each judge call hits a different model via `ctx.llm.complete()` (or whatever the SDK exposes)

### Phase 3 — UI: redesign
- [ ] Rewrite FernwehSchruteBenchmark.tsx with the 6-tab structure
- [ ] Build the org-chart grid view (sortable, clickable)
- [ ] Build the DAG visualization (probably reuse existing graph viz infra if any, else d3-force)
- [ ] Build the Methodology tab with full citation display

### Phase 4 — CLI extensions
- [ ] `doerai benchmark run --mode single-dept --dept engineering`
- [ ] `doerai benchmark run --mode cross-section --level 8`
- [ ] `doerai benchmark run --mode full` (with cost confirmation prompt)
- [ ] `doerai benchmark report --run-id <id>` — pretty-printed analysis

### Phase 5 — Validation & calibration
- [ ] Run `single-dept engineering` against a known-good agent team — sanity check
- [ ] Run full benchmark against current Donjon agent crew — establish baseline Dw
- [ ] Iterate on briefs and rubrics based on disagreement-flagged desks

---

## 8. Open questions / risks

| Risk | Mitigation |
|---|---|
| Parallel research agents produce thin/inconsistent briefs | Engineering reference dept sets the bar; validation pass + 1-hr curation flag adds budget. |
| Cost per run too high ($15) | Cache desk briefs; only re-judge changed outputs; offer 2-judge mode for dev runs. |
| O*NET / BLS data outdated | Pin the snapshot date in citation; refresh annually. |
| Agent context window blowup | 100 issues × shared context could exceed limits. Each desk gets its own isolated context — no cross-desk visibility unless explicit handoff. |
| Judges agree out of laziness | Add a "challenge" judge variant that defaults skeptical; track inter-judge variance over time as a meta-metric. |
| L1 → L10 vertical chain creates serial blocking | Allow optional "fast mode" where downstream desks see *empty* upstream output and proceed — measures resilience separately. |

---

## 9. Naming

**Benchmark name:** **Schrute-100**. Versionable (Schrute-1000 later if we want), clear evolution from v1, keeps the brand.

**Desk names:** Single-word first names per Clay — Dana, Marcus, Priya pattern continues across all 100. Aim for cultural and gender diversity in the roster. The full name list lives in `desks/names.json` and is generated once, then frozen so historical run comparisons stay stable.

Each desk identifier is `<DEPT>-L<level>-<Name>`, e.g. `ENG-L3-Marcus`, `FIN-L8-Priya`. Title appears in the desk metadata, not the ID.

---

## 10. Success criteria

This plan is shippable when:
- [ ] All 100 desk briefs exist with valid citations
- [ ] DAG is fully connected (no orphan desks except L1s)
- [ ] 3-judge scoring runs end-to-end on a single department
- [ ] FernwehSchruteBenchmark page shows methodology and org-chart views
- [ ] Full-run total Dw reproduces within ±5% across 3 runs of the same agent team

---

## Appendix A — Department research starting points (raw URLs)

To be expanded in Phase 1; this is the seed list:

- O*NET Online: https://www.onetonline.org/
- BLS Occupational Outlook Handbook: https://www.bls.gov/ooh/
- McKinsey Functional Practices: https://www.mckinsey.com/featured-insights
- BCG Insights: https://www.bcg.com/publications
- Deloitte Insights: https://www2.deloitte.com/insights
- Gartner Research (paywalled — pull free summaries only)
- HBR Functional Categories: https://hbr.org/topic-feeds
- SHRM (HR-specific): https://www.shrm.org/topics-tools

---

*End of plan. Awaiting Clay's review before any implementation begins.*
