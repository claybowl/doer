# Server & UI Layer

**Community 41** · 2 concepts · cohesion 1.00

## Concepts

### Server
*Source: `doc/spec_impl.md`*

**Relationships:**
- queries → **UI** `[EXTRACTED]`

### UI
*Source: `doc/spec_impl.md`*

**Relationships:**
- queries → **Server** `[EXTRACTED]`

## Key Relationships Within Community

- **Server** → queries → **UI**
- **UI** → queries → **Server**

---
[← Back to Index](index.md)