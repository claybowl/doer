# Control Plane Architecture

**Community 1** · 24 concepts · cohesion 0.09

## Concepts

### Adapter System
*Source: `doc/PRODUCT.md`*

**Relationships:**
- conceptually_related_to → **Doer Control Plane** `[EXTRACTED]`

### Agent as Employee
*Source: `doc/PRODUCT.md`*

**Relationships:**
- conceptually_related_to → **Company Entity** `[EXTRACTED]`

### API Authentication
*Source: `doc/API.md`*

**Relationships:**
- conceptually_related_to → **REST API** `[EXTRACTED]`

### Autonomous Economy Vision
*Source: `doc/GOAL.md`*

**Relationships:**
- rationale_for → **Doer Control Plane** `[EXTRACTED]`
- conceptually_related_to → **Doer as Nervous System** `[EXTRACTED]`

### CLI Interface
*Source: `docs/cli/overview.md`*

**Relationships:**
- conceptually_related_to → **Control Plane Layer** `[EXTRACTED]`

### CLI Tool
*Source: `doc/CLI.md`*

**Relationships:**
- implements → **Doer Control Plane** `[EXTRACTED]`

### ClipHub Registry
*Source: `doc/CLIPHUB.md`*

**Relationships:**
- implements → **Company Templates** `[EXTRACTED]`
- conceptually_related_to → **Doer Control Plane** `[INFERRED]`

### Company Entity
*Source: `doc/PRODUCT.md`*

**Relationships:**
- conceptually_related_to → **Doer Control Plane** `[EXTRACTED]`
- conceptually_related_to → **Agent as Employee** `[EXTRACTED]`
- conceptually_related_to → **Task Hierarchy Model** `[EXTRACTED]`
- conceptually_related_to → **Company Templates** `[EXTRACTED]`
- implements → **Control Plane Layer** `[EXTRACTED]`

### Company Store
*Source: `doc/plans/2026-02-16-module-system.md`*

**Relationships:**
- references → **Doer Module System** `[EXTRACTED]`

### Company Templates
*Source: `doc/CLIPHUB.md`*

**Relationships:**
- implements → **ClipHub Registry** `[EXTRACTED]`
- conceptually_related_to → **Company Entity** `[EXTRACTED]`
- references → **Doer Module System** `[EXTRACTED]`

### Control Plane Layer
*Source: `docs/start/architecture.md`*

**Relationships:**
- conceptually_related_to → **Doer Control Plane** `[EXTRACTED]`
- implements → **Company Entity** `[EXTRACTED]`
- conceptually_related_to → **CLI Interface** `[EXTRACTED]`

### Development Environment
*Source: `doc/DEVELOPING.md`*

**Relationships:**
- shares_data_with → **Doer Control Plane** `[EXTRACTED]`

### Doer Control Plane
*Source: `doc/PRODUCT.md`*

**Relationships:**
- references → **Heartbeat Protocol** `[EXTRACTED]`
- conceptually_related_to → **Company Entity** `[EXTRACTED]`
- conceptually_related_to → **Adapter System** `[EXTRACTED]`
- implements → **REST API** `[EXTRACTED]`
- implements → **CLI Tool** `[EXTRACTED]`

### Doer as Nervous System
*Source: `doc/GOAL.md`*

**Relationships:**
- conceptually_related_to → **Autonomous Economy Vision** `[EXTRACTED]`

### Doer Control Plane
*Source: `docs/start/what-is-doer.md`*

**Relationships:**
- conceptually_related_to → **Control Plane Layer** `[EXTRACTED]`
- conceptually_related_to → **Execution Adapters** `[EXTRACTED]`

### Execution Adapters
*Source: `docs/start/architecture.md`*

**Relationships:**
- conceptually_related_to → **Doer Control Plane** `[EXTRACTED]`
- implements → **Adapter Model** `[EXTRACTED]`
- rationale_for → **Heartbeat Protocol** `[EXTRACTED]`

### Issue Entity
*Source: `doc/TASKS.md`*

**Relationships:**
- implements → **Task Management Data Model** `[EXTRACTED]`
- conceptually_related_to → **Workflow States** `[EXTRACTED]`

### Issue Management
*Source: `doc/API.md`*

**Relationships:**
- implements → **REST API** `[EXTRACTED]`
- semantically_similar_to → **Task Hierarchy Model** `[INFERRED]`

### Module Hooks Pattern
*Source: `doc/plans/2026-02-16-module-system.md`*

**Relationships:**
- implements → **Doer Module System** `[EXTRACTED]`

### Doer Module System
*Source: `doc/plans/2026-02-16-module-system.md`*

**Relationships:**
- references → **Company Templates** `[EXTRACTED]`
- references → **Company Store** `[EXTRACTED]`
- implements → **Module Hooks Pattern** `[EXTRACTED]`

### REST API
*Source: `doc/API.md`*

**Relationships:**
- implements → **Doer Control Plane** `[EXTRACTED]`
- conceptually_related_to → **API Authentication** `[EXTRACTED]`
- implements → **Issue Management** `[EXTRACTED]`

### Task Hierarchy Model
*Source: `doc/PRODUCT.md`*

**Relationships:**
- conceptually_related_to → **Company Entity** `[EXTRACTED]`
- semantically_similar_to → **Issue Management** `[INFERRED]`

### Task Management Data Model
*Source: `doc/TASKS.md`*

**Relationships:**
- implements → **Issue Entity** `[EXTRACTED]`
- implements → **Doer Control Plane** `[EXTRACTED]`

### Workflow States
*Source: `doc/TASKS.md`*

**Relationships:**
- conceptually_related_to → **Issue Entity** `[EXTRACTED]`

## Key Relationships Within Community

- **Adapter System** → conceptually_related_to → **Doer Control Plane**
- **Agent as Employee** → conceptually_related_to → **Company Entity**
- **API Authentication** → conceptually_related_to → **REST API**
- **Autonomous Economy Vision** → rationale_for → **Doer Control Plane**
- **Autonomous Economy Vision** → conceptually_related_to → **Doer as Nervous System**
- **CLI Interface** → conceptually_related_to → **Control Plane Layer**
- **CLI Tool** → implements → **Doer Control Plane**
- **ClipHub Registry** → implements → **Company Templates**
- **ClipHub Registry** → conceptually_related_to → **Doer Control Plane**
- **Company Entity** → conceptually_related_to → **Doer Control Plane**

---
[← Back to Index](index.md)