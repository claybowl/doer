# Core Domain Model

**Community 4** · 20 concepts · cohesion 0.13

## Concepts

### Activity Log
*Source: `doc/spec.md`*

**Relationships:**
- logs_to → **Run** `[EXTRACTED]`

### Adapter
*Source: `doc/spec.md`*

**Relationships:**
- uses → **Agent** `[EXTRACTED]`

### AF Import
*Source: `doc/plans/plans.md`*

**Relationships:**
- loads → **Agent** `[EXTRACTED]`

### Agent
*Source: `doc/spec.md`*

**Relationships:**
- contains → **Company** `[EXTRACTED]`
- has → **Memory** `[EXTRACTED]`
- exposes → **Skill** `[EXTRACTED]`
- uses → **Adapter** `[EXTRACTED]`
- loads → **AF Import** `[EXTRACTED]`

### Approval
*Source: `doc/spec.md`*

**Relationships:**
- gates → **Issue** `[EXTRACTED]`

### Budget
*Source: `doc/spec.md`*

**Relationships:**
- enforces → **Company** `[EXTRACTED]`

### Company
*Source: `doc/spec.md`*

**Relationships:**
- contains → **Agent** `[EXTRACTED]`
- contains → **Issue** `[EXTRACTED]`
- enforces → **Budget** `[EXTRACTED]`
- contains → **Workspace** `[EXTRACTED]`
- serializes → **Import Export** `[EXTRACTED]`

### Deliverables
*Source: `doc/plans/plans.md`*

**Relationships:**
- tracks → **Issue** `[EXTRACTED]`
- tracks_outputs_of → **Agent** `[INFERRED]`

### Import Export
*Source: `doc/plans/plans.md`*

**Relationships:**
- serializes → **Company** `[EXTRACTED]`

### Issue
*Source: `doc/spec.md`*

**Relationships:**
- contains → **Company** `[EXTRACTED]`
- generates → **Run** `[EXTRACTED]`
- gates → **Approval** `[EXTRACTED]`
- tracks → **Deliverables** `[EXTRACTED]`

### Letta Cloud
*Source: `doc/spec_impl.md`*

**Relationships:**
- hosts → **Agent** `[INFERRED]`

### Memfs
*Source: `doc/plans/plans.md`*

**Relationships:**
- semantically_similar_to → **Storage System** `[INFERRED]`
- uses → **Wiki Graph** `[EXTRACTED]`
- stores_memory_in → **Agent** `[INFERRED]`
- semantically_similar_to → **Memory Service** `[INFERRED]`

### Memory
*Source: `doc/spec.md`*

**Relationships:**
- has → **Agent** `[EXTRACTED]`
- implements → **Memory Service** `[EXTRACTED]`
- semantically_similar_to → **Wiki Graph** `[INFERRED]`

### Memory Service
*Source: `doc/plans/plans.md`*

**Relationships:**
- implements → **Memory** `[EXTRACTED]`
- manages_state_of → **Agent** `[INFERRED]`
- semantically_similar_to → **Memfs** `[INFERRED]`

### PGlite
*Source: `doc/spec_impl.md`*

**Relationships:**
- implements → **Storage System** `[INFERRED]`

### Run
*Source: `doc/spec.md`*

**Relationships:**
- generates → **Issue** `[EXTRACTED]`
- logs_to → **Activity Log** `[EXTRACTED]`
- produces → **Agent** `[INFERRED]`

### Skill
*Source: `doc/spec.md`*

**Relationships:**
- exposes → **Agent** `[EXTRACTED]`

### Storage System
*Source: `doc/plans/plans.md`*

**Relationships:**
- semantically_similar_to → **Memfs** `[INFERRED]`
- implements → **PGlite** `[INFERRED]`

### Wiki Graph
*Source: `doc/plans/plans.md`*

**Relationships:**
- uses → **Memfs** `[EXTRACTED]`
- semantically_similar_to → **Memory** `[INFERRED]`

### Workspace
*Source: `doc/plans/plans.md`*

**Relationships:**
- contains → **Company** `[EXTRACTED]`

## Key Relationships Within Community

- **Activity Log** → logs_to → **Run**
- **Adapter** → uses → **Agent**
- **AF Import** → loads → **Agent**
- **Agent** → contains → **Company**
- **Agent** → has → **Memory**
- **Agent** → exposes → **Skill**
- **Agent** → uses → **Adapter**
- **Agent** → loads → **AF Import**
- **Agent** → produces → **Run**
- **Agent** → manages_state_of → **Memory Service**

---
[← Back to Index](index.md)