# Eval Framework

**Community 28** · 4 concepts · cohesion 0.50

## Concepts

### Agent Evals Framework
*Source: `doc/plans/2026-03-13-agent-evals-framework.md`*

**Relationships:**
- implements → **Promptfoo Integration (Bootstrap Layer)** `[EXTRACTED]`
- implements → **Doer Scenario Evals (Long-term)** `[EXTRACTED]`

### Doer Scenario Evals (Long-term)
*Source: `doc/plans/2026-03-13-agent-evals-framework.md`*

**Relationships:**
- implements → **Agent Evals Framework** `[EXTRACTED]`
- uses → **Eval Bundle (Adapter + Model + Prompt + Skills)** `[EXTRACTED]`

### Eval Bundle (Adapter + Model + Prompt + Skills)
*Source: `doc/plans/2026-03-13-agent-evals-framework.md`*

**Relationships:**
- uses → **Doer Scenario Evals (Long-term)** `[EXTRACTED]`

### Promptfoo Integration (Bootstrap Layer)
*Source: `doc/plans/2026-03-13-agent-evals-framework.md`*

**Relationships:**
- implements → **Agent Evals Framework** `[EXTRACTED]`

## Key Relationships Within Community

- **Agent Evals Framework** → implements → **Promptfoo Integration (Bootstrap Layer)**
- **Agent Evals Framework** → implements → **Doer Scenario Evals (Long-term)**
- **Doer Scenario Evals (Long-term)** → implements → **Agent Evals Framework**
- **Doer Scenario Evals (Long-term)** → uses → **Eval Bundle (Adapter + Model + Prompt + Skills)**
- **Eval Bundle (Adapter + Model + Prompt + Skills)** → uses → **Doer Scenario Evals (Long-term)**
- **Promptfoo Integration (Bootstrap Layer)** → implements → **Agent Evals Framework**

---
[← Back to Index](index.md)