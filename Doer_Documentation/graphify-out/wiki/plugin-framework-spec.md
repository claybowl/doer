# Plugin Framework Spec

**Community 29** · 4 concepts · cohesion 0.50

## Concepts

### OpenCode Plugin Ideas and Patterns
*Source: `doc/plugins/ideas-from-opencode.md`*

**Relationships:**
- conceptually_related_to → **Plugin Framework Specification** `[EXTRACTED]`

### Plugin Authoring Guide
*Source: `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`*

**Relationships:**
- references → **Plugin Framework Specification** `[EXTRACTED]`
- rationale_for → **Plugin Distribution via NPM** `[EXTRACTED]`

### Plugin Distribution via NPM
*Source: `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`*

**Relationships:**
- rationale_for → **Plugin Authoring Guide** `[EXTRACTED]`

### Plugin Framework Specification
*Source: `doc/plugins/PLUGIN_SPEC.md`*

**Relationships:**
- conceptually_related_to → **OpenCode Plugin Ideas and Patterns** `[EXTRACTED]`
- references → **Plugin Authoring Guide** `[EXTRACTED]`

## Key Relationships Within Community

- **OpenCode Plugin Ideas and Patterns** → conceptually_related_to → **Plugin Framework Specification**
- **Plugin Authoring Guide** → references → **Plugin Framework Specification**
- **Plugin Authoring Guide** → rationale_for → **Plugin Distribution via NPM**
- **Plugin Distribution via NPM** → rationale_for → **Plugin Authoring Guide**
- **Plugin Framework Specification** → conceptually_related_to → **OpenCode Plugin Ideas and Patterns**
- **Plugin Framework Specification** → references → **Plugin Authoring Guide**

---
[← Back to Index](index.md)