---
schema: agentcompanies/v1
kind: company
slug: law-firm-content-squad
name: Law Firm Content Squad
description: >
  A six-agent content and outreach team that generates high-volume, high-quality
  legal marketing content targeting law firms as clients — blog posts, cold outreach
  sequences, case studies, and SEO briefs, all reviewed and approved before delivery.
version: 0.1.0
license: MIT
authors:
  - name: Donjon Intelligence Systems
tags:
  - legal
  - content-marketing
  - outreach
  - law-firm
---

# Law Firm Content Squad

A purpose-built agent company for producing legal content at scale. The squad operates on a hub-and-spoke model: the Content Director takes briefs from the user and dispatches specialized agents, who produce drafts returned to the QA Editor for final approval.

## Workflow

```
User → Content Director → Legal Writer     ┐
                        → Outreach Writer  ├→ QA Editor → Deliverable
                        → Case Study Agent ┘
                        → SEO Specialist (research phase)
```

1. **Brief** — User issues a content brief to the Content Director (topic, format, target audience, tone)
2. **Dispatch** — Content Director decomposes the brief, assigns tasks to the right specialists
3. **Production** — Specialists draft their outputs and hand them to the QA Editor
4. **Review** — QA Editor checks for accuracy, brand voice, and quality; approves or cycles back
5. **Delivery** — Approved content is marked done and placed in the deliverables folder

## Org Chart

| Agent | Title | Reports To |
|---|---|---|
| content-director | Content Director | — |
| legal-writer | Legal Content Writer | content-director |
| outreach-writer | Outreach Copywriter | content-director |
| case-study-agent | Case Study Agent | content-director |
| seo-specialist | SEO Specialist | content-director |
| qa-editor | QA Editor | content-director |

## Getting Started

Import this squad into any running Doer instance:

```bash
paperclip company import ./law-firm-content-squad --yes
```

Or specify a remote Doer:

```bash
paperclip company import ./law-firm-content-squad --doer-url https://your-doer.example.com --yes
```
