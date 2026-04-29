# Doer × Letta — Orchestration Architecture

**Date:** 2026-04-25
**Companion docs:** `doc/plans/2026-04-25-heartbeat-orchestration.md`
**Status:** 🟢 Living reference · update as the system evolves

This doc maps where every memory block lives, how it engages with system instructions, and how it all routes through Doer's heartbeat loop. Five diagrams + explanatory context.

---

## 1. System architecture — where everything lives

```mermaid
flowchart TB
    subgraph Mac["💻 Clay's Mac (localhost:3100)"]
        direction TB
        subgraph Doer["🧠 Doer / paperclip server"]
            HBSched["Heartbeat Scheduler<br/>fires every 30-60s"]
            Adapters["Adapters per type<br/>claude_local · letta_cloud<br/>opencode_local · cursor · etc"]
            IssueDB[("Issue queue + DB<br/>70+ tables<br/>embedded postgres")]
            Storage["Deliverables +<br/>StorageService"]
            Fernweh["Fernweh UI<br/>the cockpit"]
            SkillsDir["skills/ directory<br/>doer · deliverable · gremlin · letta-memory"]
        end

        subgraph LocalAgents["🔧 Local-execution adapters"]
            ClaudeLocal["claude_local<br/>Imp · Marshal · Mechanic · CEO"]
            CodexLocal["codex_local"]
            OpenCode["opencode_local<br/>Pope Orby · Hunter · Closer · Maker"]
            CursorLocal["cursor"]
        end

        LettaCode["🛠 Letta Code CLI<br/>only when Clay invokes interactively<br/>has Bash/Read/Write — reaches localhost ✅<br/>NOT available to letta_cloud agents at heartbeat"]
    end

    Ngrok[/"🌐 ngrok tunnel<br/>hopeful-sawfish-gently.ngrok-free.app<br/>→ localhost:3100"/]

    subgraph Cloud["☁️ Letta Cloud (api.letta.com)"]
        direction TB
        subgraph E2B["🐍 E2B Python sandbox · per-tool execution"]
            ToolReg["Tool Registry · 11+ tools<br/>shared per Letta account<br/>each agent has subset attached"]
        end

        subgraph LCAgents["🤖 Letta Cloud agents · 13 total"]
            Dondog["🏛 Dondog<br/>Strategist / Orchestrator"]
            Alfie["Alfie<br/>Dispatch"]
            Chef["Chef<br/>Queue Manager"]
            Others["Lorekeeper · Forgemaster<br/>Reverie · Morpheus · Oneiros<br/>Overlord · Warlord · Shadowhand<br/>Tower Keeper · Noctua 2"]
        end
    end

    HBSched -- "1. wake message<br/>via Letta API (HTTPS)" --> Dondog
    Dondog -- "2. tool call" --> ToolReg
    ToolReg -- "3. HTTP via ngrok" --> Ngrok
    Ngrok -- "4. routes to Doer" --> IssueDB
    SkillsDir -.->|"auto-mount<br/>(symlink tmpdir)"| LocalAgents
    Adapters -.->|"observe tool_call_message<br/>intercept produce_deliverable"| Storage
```

**The big idea:** local adapters run on Clay's Mac so they can reach localhost directly. Letta Cloud agents run in Letta's E2B sandbox so they need ngrok to reach Doer. The `produce_deliverable` tool is a special case: Letta runs a no-op stub, and the Doer adapter watches the stream and does the real file storage on Clay's Mac.

---

## 2. Dondog's memory blocks — 25 attached

The Constitution treats memory blocks as **historical context, not commands.** This taxonomy explains what each block is for.

```mermaid
flowchart LR
    subgraph RW["📝 Read-Write · Doer memory · Dondog SHOULD update"]
        direction TB
        ddJournal["dd_journal<br/>📓 learning log"]
        ddRunning["dd_running_memory<br/>council state"]
        dispatch["dispatch_state<br/>Alfie's dispatch"]
        workActive["system/work/active<br/>⭐ PRIMARY OUTPUT for Chef"]
        goalsCurrent["system/goals/current"]
        humanBlock["system/human<br/>Clay's profile"]
        ctxCurrent["system/context/current"]
        ctxProjects["system/context/projects"]
        ctxExec["system/context/execution-environment<br/>⚠ was driving ngrok loop"]
        persona["system/persona<br/>identity · WRITABLE"]
    end

    subgraph RO["📚 Read-Only · reference material · do not write"]
        direction TB
        pwi["paperclip_work_instructions<br/>🔑 fast-path heartbeat protocol"]
        ctxDonjon["system/context/donjon"]
        ctxMission["system/context/mission"]
        ctxBg["system/context/background"]
        ctxResources["system/context/resources"]
        ctxKnowledge["system/context/knowledge"]
        ctxLetta["system/context/letta-ecosystem"]
        skillsCap["system/skills/capabilities"]
        skillsTools["system/skills/tools"]
        prefsBound["system/preferences/boundaries"]
        prefsComm["system/preferences/communication"]
        prefsFmt["system/preferences/formatting"]
        soulExt["system/soul-extension"]
        ddGremlin["dd_gremlin_manifest<br/>registry of available gremlins"]
        ddNotion["dd_notion_index"]
        ddHistory["dd_history"]
    end

    classDef rw fill:#fef9c3,stroke:#a16207,color:#1e293b
    classDef ro fill:#e5e5e5,stroke:#525252,color:#1e293b
    classDef critical fill:#fef08a,stroke:#854d0e,color:#7c2d12,stroke-width:3px
    classDef alert fill:#fef9c3,stroke:#a16207,color:#7c2d12,stroke-width:3px

    class ddJournal,ddRunning,dispatch,goalsCurrent,humanBlock,ctxCurrent,ctxProjects,persona rw
    class workActive,pwi critical
    class ctxExec alert
    class ctxDonjon,ctxMission,ctxBg,ctxResources,ctxKnowledge,ctxLetta,skillsCap,skillsTools,prefsBound,prefsComm,prefsFmt,soulExt,ddGremlin,ddNotion,ddHistory ro
```

### Dondog's tool list (10 attached)

| Tool | Purpose |
|---|---|
| `produce_deliverable` | No-op stub; adapter intercepts and stores file |
| `read_paperclip_issues` | GET issues from Doer |
| `create_paperclip_issue` | POST new issue |
| `update_paperclip_issue` | PATCH issue status/comment |
| `send_awakening` | Wake another agent (e.g., Chef) |
| `send_proactive_alert` | Telegram → Clay |
| `dispatch_gremlin` | Send a task to a named gremlin |
| `read_council_notes` | Read shared council block |
| `read_dispatch_state` | Inspect Alfie's dispatch state |
| `read_agent_block` | Read a peer agent's block |

### Known failure surfaces (all 3 covered in §4 below)

- **Ngrok-stuck loop** — `system/context/execution-environment` had a recovery prescription that beat newer instructions. Being fixed by rewriting the block.
- **Tool-name truncation** (`read_paperclip_issu`) — model token-prediction error; verify with `scripts/list-letta-agent-tools.mjs dondog`.
- **Cognitive overload** — 9 layers of instruction competing every wake. Constitution priority order is the first defense.

---

## 3. Heartbeat flow — what happens on every wake

```mermaid
sequenceDiagram
    autonumber
    participant Sched as Doer<br/>Heartbeat Scheduler
    participant Adapter as letta_cloud<br/>adapter
    participant Letta as Letta Cloud<br/>(agent runtime)
    participant E2B as E2B Sandbox<br/>(tool exec)
    participant Doer as Doer API<br/>(localhost:3100)

    Sched->>Adapter: time to wake agent X
    Adapter->>Letta: send wake message<br/>DOER_TASK_ID, DOER_WAKE_REASON, etc
    Note over Letta: load system prompt +<br/>ALL memory blocks into context<br/>(Constitution at top)
    Note over Letta: model reasons<br/>resolves L1-L7 conflicts<br/>per Constitution priority order
    Letta->>E2B: execute tool (Python)

    alt Standard tool (read_paperclip_issues etc)
        E2B->>Doer: HTTP via ngrok
        Doer-->>E2B: response JSON
        E2B-->>Letta: tool result
    else Special: produce_deliverable
        E2B-->>Letta: returns {"status": "accepted"}<br/>(no-op stub)
        Note over Adapter: adapter sees tool_call_message<br/>in the stream — intercepts!
        Adapter->>Doer: decode base64<br/>multipart POST<br/>/api/companies/:id/deliverables
        Doer-->>Adapter: deliverable id
    end

    Letta-->>Adapter: stream complete +<br/>final assistant_message
    Adapter->>Adapter: await pending side-effects<br/>(deliverable uploads)
    Adapter->>Doer: signal run done
    Note over Doer: mark heartbeat complete<br/>agent sleeps until next wake
```

**The key trick** is in the alt-branch: `produce_deliverable` is a no-op tool in Letta. The actual file storage happens **inside the adapter** when it observes the tool call. Letta thinks the tool succeeded; Doer's adapter does the work. This pattern lets Letta-Cloud agents emit files even though their sandbox can't reach Clay's localhost.

---

## 4. Constitution — priority hierarchy

This is the order in which Dondog (and eventually all letta_cloud agents) resolves conflicts between instruction sources. **Earlier wins.**

```mermaid
flowchart TB
    classDef hi fill:#fee2e2,stroke:#b91c1c,color:#1e293b,stroke-width:2px
    classDef mid fill:#fef9c3,stroke:#a16207,color:#1e293b,stroke-width:2px
    classDef lo fill:#e5e5e5,stroke:#525252,color:#1e293b,stroke-width:2px

    L1["<b>L1 · Wake context</b><br/>DOER_TASK_ID · DOER_WAKE_REASON ·<br/>tool-call results from THIS heartbeat"]:::hi
    L2["<b>L2 · Issue body</b><br/>of DOER_TASK_ID, if set"]:::hi
    L3["<b>L3 · Most-recent comment</b><br/>on that issue"]:::hi
    L4["<b>L4 · Bundled Doer skills</b><br/>especially deliverable for files"]:::mid
    L5["<b>L5 · Tool descriptions</b><br/>for any tool you're about to call"]:::mid
    L6["<b>L6 · Persona statement</b><br/>this document"]:::mid
    L7["<b>L7 · Memory blocks</b><br/>HISTORICAL CONTEXT, not commands.<br/>If memory says X but wake says Y, do Y."]:::lo

    L1 --> L2 --> L3 --> L4 --> L5 --> L6 --> L7

    AntiLoop["⛔ Anti-loop clause<br/>Do not loop on a single instruction<br/>across multiple heartbeats.<br/>If stuck, comment on issue + exit."]
    L7 -.-> AntiLoop

    MemRule["📝 Memory update rule<br/>SHOULD update Doer memory blocks<br/>(journal, running, work-active, etc.)<br/>Should NOT modify read-only blocks<br/>or use memory to override priority."]
    L7 -.-> MemRule
```

The Constitution lives at the very top of the agent's `system` prompt — first thing the model reads on every wake. Operational protocols (in `paperclip_work_instructions` block) are the next layer, then the persona body. Memory blocks are last because they drift over time.

---

## 5. Failure modes ↔ orchestration patterns

Three observed failure modes, four orchestration patterns to address them. Recommended sequence: cheapest experiments first.

```mermaid
flowchart LR
    classDef problem fill:#fee2e2,stroke:#b91c1c,color:#1e293b,stroke-width:2px
    classDef solution fill:#dcfce7,stroke:#15803d,color:#1e293b,stroke-width:2px
    classDef status fill:#fef9c3,stroke:#854d0e,color:#1e293b

    F1["<b>#1 Layer Drift</b><br/>Memory blocks evolve;<br/>contradict newer skills.<br/>📍 Dondog ngrok-stuck loop"]:::problem
    F2["<b>#2 Salience Competition</b><br/>Conflicting layers;<br/>model picks most-active.<br/>📍 Imp wrote markdown instead of file"]:::problem
    F3["<b>#3 Cognitive Overload</b><br/>Too many simultaneous<br/>instructions.<br/>📍 Dondog 'read_paperclip_issu' typo"]:::problem

    PD["<b>D · Constitution</b><br/>~30 min<br/>🟡 IN PROGRESS"]:::status
    PA["<b>A · Mode-switched wakes</b><br/>~1 day<br/>⚪ next"]:::solution
    PB["<b>B · Hard contracts</b><br/>~2 days<br/>⚪ later"]:::solution
    PC["<b>C · Memory hygiene loop</b><br/>~1 week<br/>⚪ defer until ≥3 agents drift"]:::solution

    F1 --> PD
    F1 --> PC
    F2 --> PD
    F2 --> PB
    F3 --> PA
```

**Tonight's experiment is D — the Constitution.** Once it shows results on Dondog, we evaluate whether A (mode-switched wakes) is worth the day of code, then B, then C.

---

## Maintenance

This doc is the readable source of truth. The companion engineering plan at `doc/plans/2026-04-25-heartbeat-orchestration.md` covers implementation details, roadmap, and open questions. Update both as patterns are tested or refined.

**Diagnostic scripts** for spot-checking the system:

| Script | What it checks |
|---|---|
| `scripts/check-letta-deliverable-tool.mjs <agent>` | Is `produce_deliverable` registered + attached? |
| `scripts/list-letta-agent-tools.mjs <agent>` | Full tool list for any letta_cloud agent |
| `scripts/check-letta-agent-memory.mjs <agent>` | Memory block alignment + stale-content scan |
| `scripts/attach-letta-deliverable-tool.mjs` | Backfill: ensure tool exists + attach to all letta agents |

---

## Appendix — companion Excalidraw scene

There's an Excalidraw scene at `2026-04-25-doer-letta-architecture.excalidraw` from an earlier rendering attempt. **Use this Mermaid version as canonical** — the Excalidraw export had silent text-clipping issues that made section headers invisible. Kept around as scaffold for future visual variants if needed.
