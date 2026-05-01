# Orchestration & Supervision

**Community 3** · 22 concepts · cohesion 0.11

## Concepts

### Account Research & Lead Generation
*Source: `agents/hunter/AGENTS.md`*

**Relationships:**
- implements → **Hunter** `[EXTRACTED]`

### Agent Communication via Comments
*Source: `docs/guides/agent-developer/comments-and-communication.md`*

**Relationships:**
- references → **Heartbeat Protocol** `[EXTRACTED]`

### AI Agents (Employees)
*Source: `docs/start/core-concepts.md`*

**Relationships:**
- conceptually_related_to → **Company Entity** `[EXTRACTED]`
- conceptually_related_to → **Issues (Tasks)** `[EXTRACTED]`
- conceptually_related_to → **Heartbeats (Wake Cycles)** `[EXTRACTED]`
- conceptually_related_to → **Skills (Reusable Instructions)** `[EXTRACTED]`

### Alfie Commander
*Source: `agents/hunter/AGENTS.md`*

**Relationships:**
- references → **Hunter** `[EXTRACTED]`

### Alfie Supervisor Agent
*Source: `agents/sleuth/AGENTS.md`*

**Relationships:**
- references → **Sleuth Agent** `[EXTRACTED]`
- references → **Artificer Agent** `[EXTRACTED]`
- references → **Scribe Agent** `[EXTRACTED]`
- references → **Closer Agent** `[EXTRACTED]`
- references → **Blueprint Agent** `[EXTRACTED]`

### Artificer Agent
*Source: `agents/artificer/AGENTS.md`*

**Relationships:**
- implements → **Super-Gremlin Protocol** `[EXTRACTED]`
- references → **Alfie Supervisor Agent** `[EXTRACTED]`

### Blueprint Agent
*Source: `agents/blueprint/AGENTS.md`*

**Relationships:**
- implements → **Super-Gremlin Protocol** `[EXTRACTED]`
- references → **Alfie Supervisor Agent** `[EXTRACTED]`

### Budget Enforcement
*Source: `docs/guides/agent-developer/cost-reporting.md`*

**Relationships:**
- conceptually_related_to → **Cost Reporting** `[EXTRACTED]`

### Closer Agent
*Source: `agents/hunter/SERVICEPRO_OUTREACH_STATUS.md`*

**Relationships:**
- implements → **Super-Gremlin Protocol** `[EXTRACTED]`
- references → **Alfie Supervisor Agent** `[EXTRACTED]`

### Cost Reporting
*Source: `docs/guides/agent-developer/cost-reporting.md`*

**Relationships:**
- references → **Heartbeat Protocol** `[EXTRACTED]`
- conceptually_related_to → **Budget Enforcement** `[EXTRACTED]`

### Doer Task Management
*Source: `agents/hunter/AGENTS.md`*

**Relationships:**
- references → **Hunter** `[EXTRACTED]`

### Heartbeat Protocol
*Source: `agents/hunter/AGENTS.md`*

**Relationships:**
- implements → **Hunter** `[EXTRACTED]`
- implements → **Super-Gremlin Protocol** `[EXTRACTED]`
- references → **Doer Control Plane** `[EXTRACTED]`
- implements → **Heartbeats (Wake Cycles)** `[EXTRACTED]`
- references → **Atomic Task Checkout** `[EXTRACTED]`

### Heartbeats (Wake Cycles)
*Source: `docs/start/core-concepts.md`*

**Relationships:**
- conceptually_related_to → **AI Agents (Employees)** `[EXTRACTED]`
- implements → **Heartbeat Protocol** `[EXTRACTED]`

### Hunter
*Source: `agents/hunter/AGENTS.md`*

**Relationships:**
- implements → **Super-Gremlin Pattern** `[EXTRACTED]`
- references → **Alfie Commander** `[EXTRACTED]`
- references → **Letta Cloud Memory** `[EXTRACTED]`
- references → **Doer Task Management** `[EXTRACTED]`
- implements → **Heartbeat Protocol** `[EXTRACTED]`

### Issues (Tasks)
*Source: `docs/start/core-concepts.md`*

**Relationships:**
- conceptually_related_to → **AI Agents (Employees)** `[EXTRACTED]`
- implements → **Atomic Task Checkout** `[EXTRACTED]`

### Letta Cloud Memory System
*Source: `agents/sleuth/AGENTS.md`*

**Relationships:**
- shares_data_with → **Super-Gremlin Protocol** `[EXTRACTED]`

### Letta Cloud Memory
*Source: `agents/hunter/AGENTS.md`*

**Relationships:**
- references → **Hunter** `[EXTRACTED]`

### Scribe Agent
*Source: `agents/scribe/AGENTS.md`*

**Relationships:**
- implements → **Super-Gremlin Protocol** `[EXTRACTED]`
- references → **Alfie Supervisor Agent** `[EXTRACTED]`

### Skills (Reusable Instructions)
*Source: `docs/guides/agent-developer/writing-a-skill.md`*

**Relationships:**
- conceptually_related_to → **AI Agents (Employees)** `[EXTRACTED]`
- conceptually_related_to → **Skills Injection Mechanism** `[EXTRACTED]`

### Sleuth Agent
*Source: `agents/sleuth/AGENTS.md`*

**Relationships:**
- implements → **Super-Gremlin Protocol** `[EXTRACTED]`
- references → **Alfie Supervisor Agent** `[EXTRACTED]`

### Super-Gremlin Protocol
*Source: `agents/sleuth/AGENTS.md`*

**Relationships:**
- implements → **Sleuth Agent** `[EXTRACTED]`
- implements → **Artificer Agent** `[EXTRACTED]`
- implements → **Scribe Agent** `[EXTRACTED]`
- implements → **Closer Agent** `[EXTRACTED]`
- implements → **Blueprint Agent** `[EXTRACTED]`

### Atomic Task Checkout
*Source: `docs/guides/agent-developer/task-workflow.md`*

**Relationships:**
- references → **Heartbeat Protocol** `[EXTRACTED]`
- implements → **Issues (Tasks)** `[EXTRACTED]`

## Key Relationships Within Community

- **Account Research & Lead Generation** → implements → **Hunter**
- **Agent Communication via Comments** → references → **Heartbeat Protocol**
- **AI Agents (Employees)** → conceptually_related_to → **Issues (Tasks)**
- **AI Agents (Employees)** → conceptually_related_to → **Heartbeats (Wake Cycles)**
- **AI Agents (Employees)** → conceptually_related_to → **Skills (Reusable Instructions)**
- **Alfie Commander** → references → **Hunter**
- **Alfie Supervisor Agent** → references → **Sleuth Agent**
- **Alfie Supervisor Agent** → references → **Artificer Agent**
- **Alfie Supervisor Agent** → references → **Scribe Agent**
- **Alfie Supervisor Agent** → references → **Closer Agent**

---
[← Back to Index](index.md)