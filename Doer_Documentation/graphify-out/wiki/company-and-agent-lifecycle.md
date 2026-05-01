# Company & Agent Lifecycle

**Community 7** · 13 concepts · cohesion 0.15

## Concepts

### Agent Lifecycle States
*Source: `docs/guides/board-operator/managing-agents.md`*

**Relationships:**
- references → **Agent Status Display** `[EXTRACTED]`
- implements → **Agent Pause and Resume** `[EXTRACTED]`
- implements → **Agent Termination** `[EXTRACTED]`

### Agent Pause and Resume
*Source: `docs/guides/board-operator/managing-agents.md`*

**Relationships:**
- implements → **Agent Lifecycle States** `[EXTRACTED]`
- rationale_for → **Chain of Command** `[INFERRED]`

### Agent Termination
*Source: `docs/guides/board-operator/managing-agents.md`*

**Relationships:**
- implements → **Agent Lifecycle States** `[EXTRACTED]`

### Company CRUD Operations
*Source: `docs/api/companies.md`*

**Relationships:**
- implements → **Company Setup Process** `[EXTRACTED]`

### CEO Agent Creation
*Source: `docs/guides/board-operator/creating-a-company.md`*

**Relationships:**
- calls → **Company Setup Process** `[EXTRACTED]`
- calls → **Org Chart Reporting Hierarchy** `[EXTRACTED]`

### Company Setup Process
*Source: `docs/guides/board-operator/creating-a-company.md`*

**Relationships:**
- calls → **Company Goal Definition** `[EXTRACTED]`
- calls → **CEO Agent Creation** `[EXTRACTED]`
- implements → **Company CRUD Operations** `[EXTRACTED]`

### Company Goal Definition
*Source: `docs/guides/board-operator/creating-a-company.md`*

**Relationships:**
- conceptually_related_to → **Issue Hierarchy and Parent Tasks** `[EXTRACTED]`
- calls → **Company Setup Process** `[EXTRACTED]`
- references → **Goal Hierarchy** `[EXTRACTED]`

### Agent Status Display
*Source: `docs/guides/board-operator/dashboard.md`*

**Relationships:**
- references → **Agent Lifecycle States** `[EXTRACTED]`

### Goal Hierarchy
*Source: `docs/api/goals-and-projects.md`*

**Relationships:**
- references → **Company Goal Definition** `[EXTRACTED]`

### Issue Hierarchy and Parent Tasks
*Source: `docs/guides/board-operator/managing-tasks.md`*

**Relationships:**
- conceptually_related_to → **Company Goal Definition** `[EXTRACTED]`
- references → **Project Workspaces** `[EXTRACTED]`

### Chain of Command
*Source: `docs/guides/board-operator/org-structure.md`*

**Relationships:**
- calls → **Org Chart Reporting Hierarchy** `[EXTRACTED]`
- rationale_for → **Agent Pause and Resume** `[INFERRED]`

### Org Chart Reporting Hierarchy
*Source: `docs/guides/board-operator/org-structure.md`*

**Relationships:**
- calls → **CEO Agent Creation** `[EXTRACTED]`
- calls → **Chain of Command** `[EXTRACTED]`

### Project Workspaces
*Source: `docs/api/goals-and-projects.md`*

**Relationships:**
- references → **Issue Hierarchy and Parent Tasks** `[EXTRACTED]`

## Key Relationships Within Community

- **Agent Lifecycle States** → references → **Agent Status Display**
- **Agent Lifecycle States** → implements → **Agent Pause and Resume**
- **Agent Lifecycle States** → implements → **Agent Termination**
- **Agent Pause and Resume** → implements → **Agent Lifecycle States**
- **Agent Pause and Resume** → rationale_for → **Chain of Command**
- **Agent Termination** → implements → **Agent Lifecycle States**
- **Company CRUD Operations** → implements → **Company Setup Process**
- **CEO Agent Creation** → calls → **Company Setup Process**
- **CEO Agent Creation** → calls → **Org Chart Reporting Hierarchy**
- **Company Setup Process** → calls → **Company Goal Definition**

---
[← Back to Index](index.md)