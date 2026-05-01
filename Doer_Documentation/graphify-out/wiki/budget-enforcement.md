# Budget Enforcement

**Community 27** · 4 concepts · cohesion 0.50

## Concepts

### Agent Monthly Recurring Budget
*Source: `doc/plans/2026-03-14-budget-policies-and-enforcement.md`*

**Relationships:**
- implements → **Budget Policies and Enforcement** `[EXTRACTED]`

### Budget Hard-Stop Enforcement
*Source: `doc/plans/2026-03-14-budget-policies-and-enforcement.md`*

**Relationships:**
- implements → **Budget Policies and Enforcement** `[EXTRACTED]`

### Budget Policies and Enforcement
*Source: `doc/plans/2026-03-14-budget-policies-and-enforcement.md`*

**Relationships:**
- implements → **Agent Monthly Recurring Budget** `[EXTRACTED]`
- implements → **Project Lifetime Total Budget** `[EXTRACTED]`
- implements → **Budget Hard-Stop Enforcement** `[EXTRACTED]`

### Project Lifetime Total Budget
*Source: `doc/plans/2026-03-14-budget-policies-and-enforcement.md`*

**Relationships:**
- implements → **Budget Policies and Enforcement** `[EXTRACTED]`

## Key Relationships Within Community

- **Agent Monthly Recurring Budget** → implements → **Budget Policies and Enforcement**
- **Budget Hard-Stop Enforcement** → implements → **Budget Policies and Enforcement**
- **Budget Policies and Enforcement** → implements → **Agent Monthly Recurring Budget**
- **Budget Policies and Enforcement** → implements → **Project Lifetime Total Budget**
- **Budget Policies and Enforcement** → implements → **Budget Hard-Stop Enforcement**
- **Project Lifetime Total Budget** → implements → **Budget Policies and Enforcement**

---
[← Back to Index](index.md)