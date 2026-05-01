# Adapter Packages

**Community 18** · 7 concepts · cohesion 0.43

## Concepts

### @doerai/adapter-claude-local
*Source: `packages/adapters/claude-local`*

**Relationships:**
- depends_on → **@doerai/adapter-utils** `[EXTRACTED]`
- cites → **Doer Architecture & Adapter System** `[INFERRED]`

### @doerai/adapter-codex-local
*Source: `packages/adapters/codex-local`*

**Relationships:**
- depends_on → **@doerai/adapter-utils** `[EXTRACTED]`
- cites → **Doer Architecture & Adapter System** `[INFERRED]`

### @doerai/adapter-openclaw-gateway
*Source: `packages/adapters/openclaw-gateway`*

**Relationships:**
- depends_on → **@doerai/adapter-utils** `[EXTRACTED]`
- implements → **OpenClaw Gateway Transport** `[EXTRACTED]`
- cites → **Doer Architecture & Adapter System** `[INFERRED]`

### @doerai/adapter-pi-local
*Source: `packages/adapters/pi-local`*

**Relationships:**
- depends_on → **@doerai/adapter-utils** `[EXTRACTED]`
- cites → **Doer Architecture & Adapter System** `[INFERRED]`

### Doer Architecture & Adapter System
*Source: `CLAUDE.md`*

**Relationships:**
- cites → **@doerai/adapter-claude-local** `[INFERRED]`
- cites → **@doerai/adapter-codex-local** `[INFERRED]`
- cites → **@doerai/adapter-openclaw-gateway** `[INFERRED]`
- cites → **@doerai/adapter-pi-local** `[INFERRED]`

### OpenClaw Gateway Transport
*Source: `packages/adapters/openclaw-gateway/README.md`*

**Relationships:**
- implements → **@doerai/adapter-openclaw-gateway** `[EXTRACTED]`

### @doerai/adapter-utils
*Source: `packages/adapter-utils`*

**Relationships:**
- depends_on → **@doerai/adapter-claude-local** `[EXTRACTED]`
- depends_on → **@doerai/adapter-codex-local** `[EXTRACTED]`
- depends_on → **@doerai/adapter-openclaw-gateway** `[EXTRACTED]`
- depends_on → **@doerai/adapter-pi-local** `[EXTRACTED]`

## Key Relationships Within Community

- **@doerai/adapter-claude-local** → depends_on → **@doerai/adapter-utils**
- **@doerai/adapter-claude-local** → cites → **Doer Architecture & Adapter System**
- **@doerai/adapter-codex-local** → depends_on → **@doerai/adapter-utils**
- **@doerai/adapter-codex-local** → cites → **Doer Architecture & Adapter System**
- **@doerai/adapter-openclaw-gateway** → depends_on → **@doerai/adapter-utils**
- **@doerai/adapter-openclaw-gateway** → implements → **OpenClaw Gateway Transport**
- **@doerai/adapter-openclaw-gateway** → cites → **Doer Architecture & Adapter System**
- **@doerai/adapter-pi-local** → depends_on → **@doerai/adapter-utils**
- **@doerai/adapter-pi-local** → cites → **Doer Architecture & Adapter System**
- **Doer Architecture & Adapter System** → cites → **@doerai/adapter-claude-local**

---
[← Back to Index](index.md)