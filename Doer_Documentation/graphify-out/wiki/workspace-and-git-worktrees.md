# Workspace & Git Worktrees

**Community 19** · 6 concepts · cohesion 0.33

## Concepts

### Execution Workspace (Runtime)
*Source: `doc/plans/workspace-product-model-and-work-product.md`*

**Relationships:**
- implements → **Workspace Product Model** `[EXTRACTED]`
- implements → **Git Worktree Strategy (Implementation)** `[INFERRED]`

### Git Worktree Strategy (Implementation)
*Source: `doc/plans/2026-03-10-workspace-strategy-and-git-worktrees.md`*

**Relationships:**
- implements → **Workspace Strategy and Git Worktrees** `[EXTRACTED]`
- implements → **Execution Workspace (Runtime)** `[INFERRED]`

### Project Workspace (Durable Object)
*Source: `doc/plans/workspace-product-model-and-work-product.md`*

**Relationships:**
- implements → **Workspace Product Model** `[EXTRACTED]`

### Workspace Product Model
*Source: `doc/plans/workspace-product-model-and-work-product.md`*

**Relationships:**
- implements → **Project Workspace (Durable Object)** `[EXTRACTED]`
- implements → **Execution Workspace (Runtime)** `[EXTRACTED]`

### Workspace Runtime Services
*Source: `doc/plans/2026-03-10-workspace-strategy-and-git-worktrees.md`*

**Relationships:**
- references → **Workspace Strategy and Git Worktrees** `[EXTRACTED]`

### Workspace Strategy and Git Worktrees
*Source: `doc/plans/2026-03-10-workspace-strategy-and-git-worktrees.md`*

**Relationships:**
- implements → **Git Worktree Strategy (Implementation)** `[EXTRACTED]`
- references → **Workspace Runtime Services** `[EXTRACTED]`

## Key Relationships Within Community

- **Execution Workspace (Runtime)** → implements → **Workspace Product Model**
- **Execution Workspace (Runtime)** → implements → **Git Worktree Strategy (Implementation)**
- **Git Worktree Strategy (Implementation)** → implements → **Workspace Strategy and Git Worktrees**
- **Git Worktree Strategy (Implementation)** → implements → **Execution Workspace (Runtime)**
- **Project Workspace (Durable Object)** → implements → **Workspace Product Model**
- **Workspace Product Model** → implements → **Project Workspace (Durable Object)**
- **Workspace Product Model** → implements → **Execution Workspace (Runtime)**
- **Workspace Runtime Services** → references → **Workspace Strategy and Git Worktrees**
- **Workspace Strategy and Git Worktrees** → implements → **Git Worktree Strategy (Implementation)**
- **Workspace Strategy and Git Worktrees** → references → **Workspace Runtime Services**

---
[← Back to Index](index.md)