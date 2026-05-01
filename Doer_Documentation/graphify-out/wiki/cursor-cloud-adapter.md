# Cursor Cloud Adapter

**Community 36** · 3 concepts · cohesion 0.67

## Concepts

### Cursor REST API Integration
*Source: `doc/plans/2026-02-23-cursor-cloud-adapter.md`*

**Relationships:**
- implements → **Cursor Cloud Agent Adapter** `[EXTRACTED]`

### Cursor Cloud Agent Adapter
*Source: `doc/plans/2026-02-23-cursor-cloud-adapter.md`*

**Relationships:**
- implements → **Cursor REST API Integration** `[EXTRACTED]`
- implements → **Cursor Webhook Status Updates** `[EXTRACTED]`

### Cursor Webhook Status Updates
*Source: `doc/plans/2026-02-23-cursor-cloud-adapter.md`*

**Relationships:**
- implements → **Cursor Cloud Agent Adapter** `[EXTRACTED]`

## Key Relationships Within Community

- **Cursor REST API Integration** → implements → **Cursor Cloud Agent Adapter**
- **Cursor Cloud Agent Adapter** → implements → **Cursor REST API Integration**
- **Cursor Cloud Agent Adapter** → implements → **Cursor Webhook Status Updates**
- **Cursor Webhook Status Updates** → implements → **Cursor Cloud Agent Adapter**

---
[← Back to Index](index.md)