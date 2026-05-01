# Agent Runtime & Sessions

**Community 2** · 24 concepts · cohesion 0.09

## Concepts

### Agent Adapter System
*Source: `doc/spec/agents-runtime.md`*

**Relationships:**
- implements → **Agent Runtime Specification** `[EXTRACTED]`
- conceptually_related_to → **Heartbeat Orchestration** `[INFERRED]`
- conceptually_related_to → **Letta Adapter Pattern** `[INFERRED]`

### Agent Runs Subsystem Specification
*Source: `doc/spec/agent-runs.md`*

**Relationships:**
- references → **Wakeup Coordinator Service** `[EXTRACTED]`
- implements → **Run Log Storage Abstraction** `[EXTRACTED]`
- implements → **Resumable Agent Sessions** `[EXTRACTED]`
- references → **Produce Deliverable Tool Pattern** `[INFERRED]`

### Resumable Agent Sessions
*Source: `doc/spec/agent-runs.md`*

**Relationships:**
- implements → **Agent Runs Subsystem Specification** `[EXTRACTED]`
- references → **Agent Runtime User Guide** `[INFERRED]`

### Agent Runtime User Guide
*Source: `docs/agents-runtime.md`*

**Relationships:**
- references → **Environment Variables Reference** `[EXTRACTED]`
- references → **Resumable Agent Sessions** `[INFERRED]`

### Agent Runtime Specification
*Source: `doc/spec/agents-runtime.md`*

**Relationships:**
- implements → **Agent Adapter System** `[EXTRACTED]`

### Cognitive Overload Failure Mode
*Source: `doc/plans/2026-04-25-heartbeat-orchestration.md`*

**Relationships:**
- references → **Heartbeat Orchestration** `[EXTRACTED]`

### Constitution Priority Hierarchy
*Source: `doc/diagrams/2026-04-25-doer-letta-architecture.md`*

**Relationships:**
- implements → **Doer × Letta Orchestration Architecture** `[EXTRACTED]`
- rationale_for → **Letta Cloud Agents** `[EXTRACTED]`

### Doer × Letta Orchestration Architecture
*Source: `doc/diagrams/2026-04-25-doer-letta-architecture.md`*

**Relationships:**
- implements → **Letta Cloud Agents** `[EXTRACTED]`
- implements → **Heartbeat Orchestration** `[EXTRACTED]`
- implements → **Produce Deliverable Tool Pattern** `[EXTRACTED]`
- implements → **Constitution Priority Hierarchy** `[EXTRACTED]`

### Doer Skill Tightening Plan
*Source: `doc/plans/2026-03-13-doer-skill-tightening-plan.md`*

**Relationships:**
- rationale_for → **Heartbeat Procedure Hot-Path Optimization** `[EXTRACTED]`

### Drafter Letta Cloud Worker Agent Spec
*Source: `doc/agents/2026-04-26-drafter-spec.md`*

**Relationships:**
- references → **Letta Cloud Agents** `[EXTRACTED]`
- implements → **Produce Deliverable Tool Pattern** `[EXTRACTED]`

### Environment Variables Reference
*Source: `docs/deploy/environment-variables.md`*

**Relationships:**
- references → **Agent Runtime User Guide** `[EXTRACTED]`

### Heartbeat Orchestration
*Source: `doc/plans/2026-04-25-heartbeat-orchestration.md`*

**Relationships:**
- references → **9-Layer Instruction Stack** `[EXTRACTED]`
- references → **Layer Drift Failure Mode** `[EXTRACTED]`
- references → **Salience Competition Failure Mode** `[EXTRACTED]`
- references → **Cognitive Overload Failure Mode** `[EXTRACTED]`
- implements → **Mode-Switched Wakes (Orchestration Pattern A)** `[EXTRACTED]`

### Heartbeat Procedure Hot-Path Optimization
*Source: `doc/plans/2026-03-13-doer-skill-tightening-plan.md`*

**Relationships:**
- rationale_for → **Doer Skill Tightening Plan** `[EXTRACTED]`
- references → **9-Layer Instruction Stack** `[INFERRED]`

### 9-Layer Instruction Stack
*Source: `doc/plans/2026-04-25-heartbeat-orchestration.md`*

**Relationships:**
- references → **Heartbeat Orchestration** `[EXTRACTED]`
- references → **Heartbeat Procedure Hot-Path Optimization** `[INFERRED]`

### Layer Drift Failure Mode
*Source: `doc/plans/2026-04-25-heartbeat-orchestration.md`*

**Relationships:**
- references → **Heartbeat Orchestration** `[EXTRACTED]`

### Letta Adapter Pattern
*Source: `doc/clays-docs/alfie-letta-bridge-report.md`*

**Relationships:**
- implements → **Letta Bridge Integration Report** `[EXTRACTED]`
- conceptually_related_to → **Agent Adapter System** `[INFERRED]`

### Letta Bridge Integration Report
*Source: `doc/clays-docs/alfie-letta-bridge-report.md`*

**Relationships:**
- implements → **Letta Adapter Pattern** `[EXTRACTED]`

### Letta Cloud Agents
*Source: `doc/diagrams/2026-04-25-doer-letta-architecture.md`*

**Relationships:**
- implements → **Doer × Letta Orchestration Architecture** `[EXTRACTED]`
- references → **Drafter Letta Cloud Worker Agent Spec** `[EXTRACTED]`
- references → **Paperclip to Doer Tool Rename Runbook** `[EXTRACTED]`
- rationale_for → **Constitution Priority Hierarchy** `[EXTRACTED]`

### Mode-Switched Wakes (Orchestration Pattern A)
*Source: `doc/plans/2026-04-25-heartbeat-orchestration.md`*

**Relationships:**
- implements → **Heartbeat Orchestration** `[EXTRACTED]`

### Paperclip to Doer Tool Rename Runbook
*Source: `doc/runbooks/2026-04-26-paperclip-to-doer-rename.md`*

**Relationships:**
- references → **Letta Cloud Agents** `[EXTRACTED]`

### Produce Deliverable Tool Pattern
*Source: `doc/diagrams/2026-04-25-doer-letta-architecture.md`*

**Relationships:**
- implements → **Doer × Letta Orchestration Architecture** `[EXTRACTED]`
- implements → **Drafter Letta Cloud Worker Agent Spec** `[EXTRACTED]`
- references → **Agent Runs Subsystem Specification** `[INFERRED]`

### Run Log Storage Abstraction
*Source: `doc/spec/agent-runs.md`*

**Relationships:**
- implements → **Agent Runs Subsystem Specification** `[EXTRACTED]`

### Salience Competition Failure Mode
*Source: `doc/plans/2026-04-25-heartbeat-orchestration.md`*

**Relationships:**
- references → **Heartbeat Orchestration** `[EXTRACTED]`

### Wakeup Coordinator Service
*Source: `doc/spec/agent-runs.md`*

**Relationships:**
- references → **Agent Runs Subsystem Specification** `[EXTRACTED]`

## Key Relationships Within Community

- **Agent Adapter System** → implements → **Agent Runtime Specification**
- **Agent Adapter System** → conceptually_related_to → **Heartbeat Orchestration**
- **Agent Adapter System** → conceptually_related_to → **Letta Adapter Pattern**
- **Agent Runs Subsystem Specification** → references → **Wakeup Coordinator Service**
- **Agent Runs Subsystem Specification** → implements → **Run Log Storage Abstraction**
- **Agent Runs Subsystem Specification** → implements → **Resumable Agent Sessions**
- **Agent Runs Subsystem Specification** → references → **Produce Deliverable Tool Pattern**
- **Resumable Agent Sessions** → implements → **Agent Runs Subsystem Specification**
- **Resumable Agent Sessions** → references → **Agent Runtime User Guide**
- **Agent Runtime User Guide** → references → **Environment Variables Reference**

---
[← Back to Index](index.md)