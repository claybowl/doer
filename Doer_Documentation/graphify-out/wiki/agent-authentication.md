# Agent Authentication

**Community 13** · 9 concepts · cohesion 0.25

## Concepts

### Agent Authentication JWT Implementation
*Source: `doc/plans/2026-02-18-agent-authentication-implementation.md`*

**Relationships:**
- implements → **HS256 JWT Token Format** `[EXTRACTED]`
- implements → **Dual Authentication Path (DB Key + JWT)** `[EXTRACTED]`

### Agent Authentication System
*Source: `doc/plans/2026-02-18-agent-authentication.md`*

**Relationships:**
- implements → **Authentication Tier 1: Local Adapter (JWT)** `[EXTRACTED]`
- implements → **Authentication Tier 2: CLI-Driven Key Exchange** `[EXTRACTED]`
- implements → **Authentication Tier 3: Agent Self-Registration** `[EXTRACTED]`
- references → **Approval Gates by Default** `[EXTRACTED]`

### Approval Gates by Default
*Source: `doc/plans/2026-02-18-agent-authentication.md`*

**Relationships:**
- references → **Agent Authentication System** `[EXTRACTED]`
- implements → **Issue-Approval Direct Linkage** `[INFERRED]`

### Authentication Tier 1: Local Adapter (JWT)
*Source: `doc/plans/2026-02-18-agent-authentication.md`*

**Relationships:**
- implements → **Agent Authentication System** `[EXTRACTED]`
- uses → **HS256 JWT Token Format** `[EXTRACTED]`

### Authentication Tier 2: CLI-Driven Key Exchange
*Source: `doc/plans/2026-02-18-agent-authentication.md`*

**Relationships:**
- implements → **Agent Authentication System** `[EXTRACTED]`

### Authentication Tier 3: Agent Self-Registration
*Source: `doc/plans/2026-02-18-agent-authentication.md`*

**Relationships:**
- implements → **Agent Authentication System** `[EXTRACTED]`

### Dual Authentication Path (DB Key + JWT)
*Source: `doc/plans/2026-02-18-agent-authentication-implementation.md`*

**Relationships:**
- implements → **Agent Authentication JWT Implementation** `[EXTRACTED]`
- references → **HS256 JWT Token Format** `[EXTRACTED]`

### HS256 JWT Token Format
*Source: `doc/plans/2026-02-18-agent-authentication-implementation.md`*

**Relationships:**
- uses → **Authentication Tier 1: Local Adapter (JWT)** `[EXTRACTED]`
- implements → **Agent Authentication JWT Implementation** `[EXTRACTED]`
- references → **Dual Authentication Path (DB Key + JWT)** `[EXTRACTED]`

### Issue-Approval Direct Linkage
*Source: `doc/plans/2026-02-19-agent-mgmt-followup-plan.md`*

**Relationships:**
- implements → **Approval Gates by Default** `[INFERRED]`

## Key Relationships Within Community

- **Agent Authentication JWT Implementation** → implements → **HS256 JWT Token Format**
- **Agent Authentication JWT Implementation** → implements → **Dual Authentication Path (DB Key + JWT)**
- **Agent Authentication System** → implements → **Authentication Tier 1: Local Adapter (JWT)**
- **Agent Authentication System** → implements → **Authentication Tier 2: CLI-Driven Key Exchange**
- **Agent Authentication System** → implements → **Authentication Tier 3: Agent Self-Registration**
- **Agent Authentication System** → references → **Approval Gates by Default**
- **Approval Gates by Default** → references → **Agent Authentication System**
- **Approval Gates by Default** → implements → **Issue-Approval Direct Linkage**
- **Authentication Tier 1: Local Adapter (JWT)** → implements → **Agent Authentication System**
- **Authentication Tier 1: Local Adapter (JWT)** → uses → **HS256 JWT Token Format**

---
[← Back to Index](index.md)