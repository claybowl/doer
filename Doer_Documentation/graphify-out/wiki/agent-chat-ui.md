# Agent Chat UI

**Community 34** · 3 concepts · cohesion 0.67

## Concepts

### Agent Chat UI
*Source: `doc/plans/2026-03-11-agent-chat-ui-and-issue-backed-conversations.md`*

**Relationships:**
- implements → **Issue-Backed Conversations Model** `[EXTRACTED]`
- uses → **assistant-ui Kit** `[EXTRACTED]`

### assistant-ui Kit
*Source: `doc/plans/2026-03-11-agent-chat-ui-and-issue-backed-conversations.md`*

**Relationships:**
- uses → **Agent Chat UI** `[EXTRACTED]`

### Issue-Backed Conversations Model
*Source: `doc/plans/2026-03-11-agent-chat-ui-and-issue-backed-conversations.md`*

**Relationships:**
- implements → **Agent Chat UI** `[EXTRACTED]`

## Key Relationships Within Community

- **Agent Chat UI** → implements → **Issue-Backed Conversations Model**
- **Agent Chat UI** → uses → **assistant-ui Kit**
- **assistant-ui Kit** → uses → **Agent Chat UI**
- **Issue-Backed Conversations Model** → implements → **Agent Chat UI**

---
[← Back to Index](index.md)