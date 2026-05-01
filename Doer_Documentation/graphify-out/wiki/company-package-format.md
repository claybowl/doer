# Company Package Format

**Community 15** · 8 concepts · cohesion 0.29

## Concepts

### Company Package Format
*Source: `docs/guides/board-operator/importing-and-exporting.md`*

**Relationships:**
- references → **COMPANY.md Format** `[EXTRACTED]`
- references → **AGENTS.md Format** `[EXTRACTED]`
- implements → **Doer Spec Mapping** `[EXTRACTED]`

### AGENTS.md Format
*Source: `docs/companies/companies-spec.md`*

**Relationships:**
- references → **Company Package Format** `[EXTRACTED]`
- calls → **Agent Companies Package Format** `[EXTRACTED]`
- calls → **SKILL.md Format** `[EXTRACTED]`

### COMPANY.md Format
*Source: `docs/companies/companies-spec.md`*

**Relationships:**
- references → **Company Package Format** `[EXTRACTED]`
- calls → **Agent Companies Package Format** `[EXTRACTED]`

### Doer Spec Mapping
*Source: `docs/companies/companies-spec.md`*

**Relationships:**
- references → **Vendor Extensions** `[EXTRACTED]`
- implements → **Company Package Format** `[EXTRACTED]`

### Agent Companies Package Format
*Source: `docs/companies/companies-spec.md`*

**Relationships:**
- calls → **COMPANY.md Format** `[EXTRACTED]`
- calls → **AGENTS.md Format** `[EXTRACTED]`

### SKILL.md Format
*Source: `docs/companies/companies-spec.md`*

**Relationships:**
- calls → **AGENTS.md Format** `[EXTRACTED]`

### Source References
*Source: `docs/companies/companies-spec.md`*

**Relationships:**
- rationale_for → **Vendor Extensions** `[EXTRACTED]`

### Vendor Extensions
*Source: `docs/companies/companies-spec.md`*

**Relationships:**
- rationale_for → **Source References** `[EXTRACTED]`
- references → **Doer Spec Mapping** `[EXTRACTED]`

## Key Relationships Within Community

- **Company Package Format** → references → **COMPANY.md Format**
- **Company Package Format** → references → **AGENTS.md Format**
- **Company Package Format** → implements → **Doer Spec Mapping**
- **AGENTS.md Format** → references → **Company Package Format**
- **AGENTS.md Format** → calls → **Agent Companies Package Format**
- **AGENTS.md Format** → calls → **SKILL.md Format**
- **COMPANY.md Format** → references → **Company Package Format**
- **COMPANY.md Format** → calls → **Agent Companies Package Format**
- **Doer Spec Mapping** → references → **Vendor Extensions**
- **Doer Spec Mapping** → implements → **Company Package Format**

---
[← Back to Index](index.md)