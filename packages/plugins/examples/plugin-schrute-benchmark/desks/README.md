# Schrute-100 Desk Definitions

This directory holds the 100 desk JSON files that drive the Schrute-100 benchmark.

## Layout

```
desks/
├── schema.json              JSON schema — every desk file conforms to this
├── names.json               Frozen 100-name roster, grouped by department
├── README.md                This file (briefs the parallel research agents)
├── engineering/             Reference dept (fully written — use as your template)
│   ├── L01.json
│   ├── L02.json
│   ├── ...
│   └── L10.json
├── product/                 To be written (parallel research agent)
├── design/
├── sales/
├── marketing/
├── customer-success/
├── finance/
├── hr/
├── legal-ops/
└── executive/
```

## Source hierarchy

Every desk brief grounds its tasks in real public sources. **In priority order:**

1. **O*NET Online task statements** — https://www.onetonline.org/. Search by occupation; copy exact task wording into citations.
2. **U.S. BLS Occupational Outlook Handbook** — https://www.bls.gov/ooh/. Use for "What X Do" narrative + median pay context.
3. **One industry-specific report** per department — McKinsey, BCG, Deloitte, HBR, SHRM, etc. Used to set the *mix* of tasks (e.g., a marketing time-allocation study tells you to include a reporting deliverable).

## Ladder

Every department uses the same 10-level seniority ladder:

| Level | Generic title          | Output type                                    | Time |
|-------|------------------------|------------------------------------------------|------|
| L1    | IC1 (entry)            | Atomic ticket, one deliverable                 | 25m  |
| L2    | IC2 (mid)              | 2-3 atomic tasks + light synthesis             | 25m  |
| L3    | IC3 (senior)           | Full feature/initiative ownership              | 25m  |
| L4    | Staff IC / Specialist  | Cross-team coordination on one project         | 35m  |
| L5    | Lead / Tech Lead       | Sub-area direction; first synthesis tier       | 35m  |
| L6    | Manager                | Plan + delegate + review for 3-5 reports       | 35m  |
| L7    | Senior Manager         | Multi-team plan, cycle ownership               | 45m  |
| L8    | Director               | Department strategy, hiring                    | 45m  |
| L9    | VP / Senior Director   | Cross-functional, exec reporting               | 55m  |
| L10   | C-level / SVP          | Vision, board, capital, big decisions          | 55m  |

## Within-department vertical chain

L1, L2, L3 (ICs) feed into L5 (Tech Lead synthesis).
L4 (Staff IC) also feeds L5.
L5 → L6 (Manager) → L7 (Sr Manager) → L8 (Director) → L9 (VP) → L10 (C-level).

## Cross-department handoffs

These edges are **fixed**. When you write your dept, look up which of these edges touch your dept and set `upstreamDeskIds` / `downstreamDeskIds` accordingly:

| From → To             | Description                          |
|-----------------------|--------------------------------------|
| SALES-L06 → FIN-L03   | New deal terms → invoicing           |
| ENG-L08 → MKT-L06     | Launch readiness → release notes     |
| PROD-L08 → ENG-L07    | Roadmap → engineering cycle plan     |
| CS-L06 → PROD-L03     | Bug list / feature requests          |
| HR-L08 → FIN-L08      | Headcount plan → comp budget         |
| LEGOPS-L07 → SALES-L08| Contract redlines → close motion     |
| DES-L05 → ENG-L03     | Specs → implementation tickets       |
| FIN-L10 → EXEC-L10    | Forecast → board pre-read            |
| MKT-L08 → SALES-L08   | Pipeline targets → quota planning    |
| LEGOPS-L07 → ALL L8s  | Vendor budget → dept allocations     |

## Writing a desk JSON — checklist

- [ ] `id` follows pattern `<DEPT>-L<level>-<Name>` (use the name from `names.json`)
- [ ] `brief` is in second person ("You are…"), 3-6 paragraphs, fits the time budget
- [ ] `deliverables` are concrete files with extensions (`.md`, `.xlsx`, `.json`, `.pdf`)
- [ ] `citations` has ≥2 entries, ≥1 from O*NET with the exact task statement quote
- [ ] `upstreamDeskIds` / `downstreamDeskIds` reference real desk IDs; no orphans
- [ ] `rubric` has 5-8 yes/no checks per component (completion, quality, accuracy, handoff)
- [ ] `timeBudgetMin` matches the level tier (25/35/45/55)
- [ ] JSON validates against `schema.json`

## Quality bar

Look at `engineering/L01.json` through `L10.json` for the reference. Every dept's 10 desks should match that depth and shape.

If you're tempted to write a vague brief, stop — pull a different O*NET task statement and ground it in real role behavior. The benchmark only matters if the briefs reflect real work.
