# Skills System

**Community 23** · 5 concepts · cohesion 0.40

## Concepts

### Agent Skill Attachments
*Source: `doc/plans/2026-03-14-skills-ui-product-plan.md`*

**Relationships:**
- implements → **Skills UI Product Plan** `[EXTRACTED]`

### Comment Markdown Quality Requirements
*Source: `doc/plans/2026-02-19-agent-mgmt-followup-plan.md`*

**Relationships:**
- conceptually_related_to → **Skills UI Product Plan** `[INFERRED]`

### Company Skills Library (Scope)
*Source: `doc/plans/2026-03-14-skills-ui-product-plan.md`*

**Relationships:**
- implements → **Skills UI Product Plan** `[EXTRACTED]`
- references → **skills.sh Compatibility Requirement** `[EXTRACTED]`

### Skills UI Product Plan
*Source: `doc/plans/2026-03-14-skills-ui-product-plan.md`*

**Relationships:**
- implements → **Company Skills Library (Scope)** `[EXTRACTED]`
- implements → **Agent Skill Attachments** `[EXTRACTED]`
- conceptually_related_to → **Comment Markdown Quality Requirements** `[INFERRED]`

### skills.sh Compatibility Requirement
*Source: `doc/plans/2026-03-14-skills-ui-product-plan.md`*

**Relationships:**
- references → **Company Skills Library (Scope)** `[EXTRACTED]`

## Key Relationships Within Community

- **Agent Skill Attachments** → implements → **Skills UI Product Plan**
- **Comment Markdown Quality Requirements** → conceptually_related_to → **Skills UI Product Plan**
- **Company Skills Library (Scope)** → implements → **Skills UI Product Plan**
- **Company Skills Library (Scope)** → references → **skills.sh Compatibility Requirement**
- **Skills UI Product Plan** → implements → **Company Skills Library (Scope)**
- **Skills UI Product Plan** → implements → **Agent Skill Attachments**
- **Skills UI Product Plan** → conceptually_related_to → **Comment Markdown Quality Requirements**
- **skills.sh Compatibility Requirement** → references → **Company Skills Library (Scope)**

---
[← Back to Index](index.md)