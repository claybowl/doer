# Adapter Registry

**Community 14** · 9 concepts · cohesion 0.33

## Concepts

### Adapter Model
*Source: `docs/start/architecture.md`*

**Relationships:**
- implements → **Execution Adapters** `[EXTRACTED]`
- references → **Claude Local Adapter** `[EXTRACTED]`
- references → **Codex Local Adapter** `[EXTRACTED]`
- references → **Process Adapter** `[EXTRACTED]`
- references → **HTTP Adapter** `[EXTRACTED]`

### Adapter Registry System
*Source: `docs/adapters/creating-an-adapter.md`*

**Relationships:**
- conceptually_related_to → **Adapter Model** `[EXTRACTED]`

### Claude Local Adapter
*Source: `docs/adapters/claude-local.md`*

**Relationships:**
- references → **Adapter Model** `[EXTRACTED]`
- implements → **Session Persistence** `[EXTRACTED]`
- implements → **Skills Injection Mechanism** `[EXTRACTED]`

### Codex Local Adapter
*Source: `docs/adapters/codex-local.md`*

**Relationships:**
- references → **Adapter Model** `[EXTRACTED]`
- implements → **Session Persistence** `[EXTRACTED]`
- implements → **Skills Injection Mechanism** `[EXTRACTED]`

### Gemini Local Adapter
*Source: `docs/adapters/gemini-local.md`*

**Relationships:**
- references → **Adapter Model** `[EXTRACTED]`
- implements → **Session Persistence** `[EXTRACTED]`
- implements → **Skills Injection Mechanism** `[EXTRACTED]`

### HTTP Adapter
*Source: `docs/adapters/http.md`*

**Relationships:**
- references → **Adapter Model** `[EXTRACTED]`

### Process Adapter
*Source: `docs/adapters/process.md`*

**Relationships:**
- references → **Adapter Model** `[EXTRACTED]`

### Session Persistence
*Source: `docs/adapters/claude-local.md`*

**Relationships:**
- implements → **Claude Local Adapter** `[EXTRACTED]`
- implements → **Codex Local Adapter** `[EXTRACTED]`
- implements → **Gemini Local Adapter** `[EXTRACTED]`

### Skills Injection Mechanism
*Source: `docs/adapters/creating-an-adapter.md`*

**Relationships:**
- conceptually_related_to → **Skills (Reusable Instructions)** `[EXTRACTED]`
- implements → **Claude Local Adapter** `[EXTRACTED]`
- implements → **Codex Local Adapter** `[EXTRACTED]`
- implements → **Gemini Local Adapter** `[EXTRACTED]`

## Key Relationships Within Community

- **Adapter Model** → references → **Claude Local Adapter**
- **Adapter Model** → references → **Codex Local Adapter**
- **Adapter Model** → references → **Process Adapter**
- **Adapter Model** → references → **HTTP Adapter**
- **Adapter Model** → references → **Gemini Local Adapter**
- **Adapter Model** → conceptually_related_to → **Adapter Registry System**
- **Adapter Registry System** → conceptually_related_to → **Adapter Model**
- **Claude Local Adapter** → references → **Adapter Model**
- **Claude Local Adapter** → implements → **Session Persistence**
- **Claude Local Adapter** → implements → **Skills Injection Mechanism**

---
[← Back to Index](index.md)