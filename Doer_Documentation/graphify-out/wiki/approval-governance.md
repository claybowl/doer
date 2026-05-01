# Approval Governance

**Community 24** · 5 concepts · cohesion 0.40

## Concepts

### Approval Workflow API
*Source: `docs/api/approvals.md`*

**Relationships:**
- implements → **Approval Governance Workflow** `[EXTRACTED]`

### CEO Strategy Approval Type
*Source: `docs/guides/board-operator/approvals.md`*

**Relationships:**
- calls → **Approval Governance Workflow** `[EXTRACTED]`

### Hire Agent Approval Type
*Source: `docs/guides/board-operator/approvals.md`*

**Relationships:**
- calls → **Approval Governance Workflow** `[EXTRACTED]`

### Approval Governance Workflow
*Source: `docs/guides/board-operator/approvals.md`*

**Relationships:**
- calls → **Hire Agent Approval Type** `[EXTRACTED]`
- calls → **CEO Strategy Approval Type** `[EXTRACTED]`
- implements → **Approval Workflow API** `[EXTRACTED]`
- references → **Governance Test Cases** `[EXTRACTED]`

### Governance Test Cases
*Source: `evals/README.md`*

**Relationships:**
- references → **Approval Governance Workflow** `[EXTRACTED]`

## Key Relationships Within Community

- **Approval Workflow API** → implements → **Approval Governance Workflow**
- **CEO Strategy Approval Type** → calls → **Approval Governance Workflow**
- **Hire Agent Approval Type** → calls → **Approval Governance Workflow**
- **Approval Governance Workflow** → calls → **Hire Agent Approval Type**
- **Approval Governance Workflow** → calls → **CEO Strategy Approval Type**
- **Approval Governance Workflow** → implements → **Approval Workflow API**
- **Approval Governance Workflow** → references → **Governance Test Cases**
- **Governance Test Cases** → references → **Approval Governance Workflow**

---
[← Back to Index](index.md)