# Plugin Scaffolding

**Community 22** · 6 concepts · cohesion 0.33

## Concepts

### Create Doer Plugin Scaffolding
*Source: `packages/plugins/create-doer-plugin/README.md`*

**Relationships:**
- ? → **Plugin Scaffolding Tool** `[1.0]`

### Plugin Deployment Model

**Relationships:**
- ? → **Plugin Local Development Path** `[1.0]`
- ? → **Plugin Scaffolding Tool** `[0.8]`

### Plugin Development Workflow

**Relationships:**
- ? → **Plugin Scaffolding Tool** `[1.0]`

### Plugin Local Development Path

**Relationships:**
- ? → **Plugin Deployment Model** `[1.0]`

### Plugin Scaffold Templates

**Relationships:**
- ? → **Plugin Scaffolding Tool** `[1.0]`

### Plugin Scaffolding Tool

**Relationships:**
- ? → **Create Doer Plugin Scaffolding** `[1.0]`
- ? → **Plugin Scaffold Templates** `[1.0]`
- ? → **Plugin Development Workflow** `[1.0]`
- ? → **Plugin Deployment Model** `[0.8]`

## Key Relationships Within Community

- **Create Doer Plugin Scaffolding** → ? → **Plugin Scaffolding Tool**
- **Plugin Deployment Model** → ? → **Plugin Local Development Path**
- **Plugin Deployment Model** → ? → **Plugin Scaffolding Tool**
- **Plugin Development Workflow** → ? → **Plugin Scaffolding Tool**
- **Plugin Local Development Path** → ? → **Plugin Deployment Model**
- **Plugin Scaffold Templates** → ? → **Plugin Scaffolding Tool**
- **Plugin Scaffolding Tool** → ? → **Create Doer Plugin Scaffolding**
- **Plugin Scaffolding Tool** → ? → **Plugin Scaffold Templates**
- **Plugin Scaffolding Tool** → ? → **Plugin Development Workflow**
- **Plugin Scaffolding Tool** → ? → **Plugin Deployment Model**

---
[← Back to Index](index.md)