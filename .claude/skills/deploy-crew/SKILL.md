---
name: deploy-crew
description: >
  Scaffold and deploy a squad of agents to any Doer instance in minutes.
  Use when someone says "deploy a crew", "spin up a team", "create a squad for X",
  "give me agents for Y", "set up a law firm team", "build me a content team",
  or any request to create a ready-to-import agent company package for a specific domain.
  Outputs a complete agentcompanies/v1 package + a paste-ready `doerai company import` command.
---

# /deploy-crew

Rapidly scaffold and deploy a domain-specific agent squad to any Doer instance.

## What This Does

1. Interviews the user about domain, squad size, and workflow
2. Generates a complete `agentcompanies/v1` package on disk
3. Emits a paste-ready `doerai company import` command

The whole flow — interview to import command — should take under 5 minutes.

## Step 1: Quick Interview

Use `AskUserQuestion` to gather the essentials. Keep it to one round.

Ask:
- **Domain / use case** — What will this squad do? (e.g. "legal content marketing", "SaaS sales", "e-commerce ops")
- **Squad size** — How many agents? Suggest 5–7 for most use cases; let them adjust.
- **Workflow style** — Pipeline (A→B→C→done), hub-and-spoke (manager + specialists), or on-demand?
- **Target Doer URL** — Where should the import command point? (default: `http://localhost:3101`)

If the user says "law firm" or a named vertical with a pre-built template below, skip the full interview and confirm the template fits. They can adjust.

## Step 2: Load the Spec

Before generating files, read:
- `docs/companies/companies-spec.md` — normative spec
- `.claude/skills/company-creator/references/companies-spec.md` — quick reference
- `.claude/skills/company-creator/references/example-company.md` — example

## Step 3: Generate the Package

Output directory: `~/.doer/crews/<company-slug>/` (create if missing)

Structure:
```
<company-slug>/
├── COMPANY.md
├── README.md
├── LICENSE
├── agents/
│   └── <slug>/AGENTS.md      (one per agent)
├── skills/
│   └── <slug>/SKILL.md       (custom skills only)
└── .doer.yaml                (adapter + env config)
```

### Rules

- Slugs: lowercase, hyphenated, URL-safe
- Every agent except the top-level one gets `reportsTo`
- Agent instructions must include: where work comes from, what they produce, who they hand off to, what triggers them
- `.doer.yaml`: only include agents that need adapter or env overrides — omit the rest
- No secrets, no machine-local paths, no DB IDs in exported files
- Adapter type for Claude agents: `claude_local`

### Writing tight agent instructions

Each AGENTS.md body gets 4 paragraphs max:

1. **Role** — one sentence: who you are and what you own
2. **Inputs** — what lands in your inbox and from whom
3. **Outputs** — what you produce and the quality bar
4. **Handoff** — who you pass to when done, and what "done" looks like

Do NOT write generic instructions. Be specific to the domain.

## Step 4: Emit the Import Command

After writing files, print this block clearly:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Squad ready. Run this to deploy:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

doerai company import ~/.doer/crews/<company-slug> \
  --doer-url <target-url> \
  --yes

# Or dry-run first:
doerai company import ~/.doer/crews/<company-slug> \
  --doer-url <target-url> \
  --dry-run
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Also mention: the package folder is portable — zip it, push to GitHub, or share the path to deploy to any Doer instance.

---

## Pre-Built Templates

When the user's domain matches a template below, use it as the starting point and confirm with the user before writing.

### Law Firm Sales & Content Squad

**Slug:** `law-firm-content-squad`
**Purpose:** Generate high-volume legal content, outreach assets, and sales collateral targeting law firms as prospects.
**Workflow:** Hub-and-spoke — Content Director dispatches to specialists; each specialist returns deliverables.

**Roster (6 agents):**

| Slug | Title | Reports To | Core Skill |
|---|---|---|---|
| `content-director` | Content Director | null (top) | Editorial strategy, task dispatch |
| `legal-writer` | Legal Content Writer | `content-director` | Long-form legal blog posts, whitepapers |
| `outreach-writer` | Outreach Copywriter | `content-director` | Cold email sequences, LinkedIn messages |
| `case-study-agent` | Case Study Agent | `content-director` | Client story interviews → formatted case studies |
| `seo-specialist` | SEO Specialist | `content-director` | Keyword research, on-page optimization briefs |
| `qa-editor` | QA Editor | `content-director` | Proofreading, brand voice, final approval |

**Workflow:**
1. User or CEO issues a content brief to Content Director
2. Content Director decomposes into tasks → assigns to specialists
3. Specialists produce drafts → hand to QA Editor
4. QA Editor approves or returns with revision notes
5. Approved content lands in the deliverables project

Use adapter `claude_local` for all agents. No special env vars required.

---

*Built by Donjon Intelligence Systems. Spec: [agentcompanies.io/specification](https://agentcompanies.io/specification)*
