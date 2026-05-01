# Memory Substrate

**Community 32** · 3 concepts · cohesion 1.00

## Concepts

### Letta Core Memory Blocks
*Source: `doc/plans/2026-04-17-memfs-memory.md`*

**Relationships:**
- references → **Memfs Memory Substrate** `[EXTRACTED]`
- semantically_similar_to → **Memfs Strategy Pattern (Adapter Layer)** `[INFERRED]`

### Memfs Memory Substrate
*Source: `doc/plans/2026-04-17-memfs-memory.md`*

**Relationships:**
- implements → **Memfs Strategy Pattern (Adapter Layer)** `[EXTRACTED]`
- references → **Letta Core Memory Blocks** `[EXTRACTED]`

### Memfs Strategy Pattern (Adapter Layer)
*Source: `doc/plans/2026-04-17-memfs-memory.md`*

**Relationships:**
- implements → **Memfs Memory Substrate** `[EXTRACTED]`
- semantically_similar_to → **Letta Core Memory Blocks** `[INFERRED]`

## Key Relationships Within Community

- **Letta Core Memory Blocks** → references → **Memfs Memory Substrate**
- **Letta Core Memory Blocks** → semantically_similar_to → **Memfs Strategy Pattern (Adapter Layer)**
- **Memfs Memory Substrate** → implements → **Memfs Strategy Pattern (Adapter Layer)**
- **Memfs Memory Substrate** → references → **Letta Core Memory Blocks**
- **Memfs Strategy Pattern (Adapter Layer)** → implements → **Memfs Memory Substrate**
- **Memfs Strategy Pattern (Adapter Layer)** → semantically_similar_to → **Letta Core Memory Blocks**

---
[← Back to Index](index.md)