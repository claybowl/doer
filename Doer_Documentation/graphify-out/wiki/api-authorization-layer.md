# API Authorization Layer

**Community 25** · 4 concepts · cohesion 0.50

## Concepts

### API Route
*Source: `doc/api2.md`*

**Relationships:**
- respects → **Company Scope** `[EXTRACTED]`

### Authorization
*Source: `doc/api2.md`*

**Relationships:**
- enforces → **Company Scope** `[EXTRACTED]`
- specifies → **Humans and Permissions** `[EXTRACTED]`

### Company Scope
*Source: `doc/api2.md`*

**Relationships:**
- enforces → **Authorization** `[EXTRACTED]`
- respects → **API Route** `[EXTRACTED]`

### Humans and Permissions
*Source: `doc/plans/plans.md`*

**Relationships:**
- specifies → **Authorization** `[EXTRACTED]`

## Key Relationships Within Community

- **API Route** → respects → **Company Scope**
- **Authorization** → enforces → **Company Scope**
- **Authorization** → specifies → **Humans and Permissions**
- **Company Scope** → enforces → **Authorization**
- **Company Scope** → respects → **API Route**
- **Humans and Permissions** → specifies → **Authorization**

---
[← Back to Index](index.md)