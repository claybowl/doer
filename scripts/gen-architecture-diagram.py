#!/usr/bin/env python3
"""
Generate the Doer/Letta orchestration architecture as an Excalidraw scene.

Run:
    python3 scripts/gen-architecture-diagram.py

Outputs:
    doc/diagrams/2026-04-25-doer-letta-architecture.excalidraw

Open the file at https://excalidraw.com (drag-drop) or in any local
Excalidraw client. The diagram covers:
- Where each piece of the system lives (Mac vs Letta Cloud vs E2B sandbox)
- Memory blocks per agent + their purpose synopses
- The Constitution priority hierarchy
- Tool registries (Letta-side stub + Doer adapter interception)
- Heartbeat flow numbered end-to-end
- Skill auto-mounting per adapter

Reproducible: edit the data structures below and re-run to refresh.
"""

import json
import random
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Element factories
# ---------------------------------------------------------------------------

def _seed():
    return random.randint(1, 2_000_000_000)


def _common(elem_id: str, x: int, y: int, w: int, h: int,
            stroke="#1e1e1e", bg="transparent", fill="solid",
            stroke_width=2, stroke_style="solid", roughness=1, opacity=100,
            roundness: Optional[dict] = None):
    return {
        "id": elem_id,
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": bg,
        "fillStyle": fill,
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": roughness,
        "opacity": opacity,
        "groupIds": [],
        "frameId": None,
        "roundness": roundness,
        "seed": _seed(),
        "version": 1,
        "versionNonce": _seed(),
        "isDeleted": False,
        "boundElements": [],
        "updated": 1714000000000,
        "link": None,
        "locked": False,
    }


def rect(elem_id, x, y, w, h, **kwargs):
    e = _common(elem_id, x, y, w, h, **kwargs)
    e["type"] = "rectangle"
    if e["roundness"] is None:
        e["roundness"] = {"type": 3}
    return e


def diamond(elem_id, x, y, w, h, **kwargs):
    e = _common(elem_id, x, y, w, h, **kwargs)
    e["type"] = "diamond"
    return e


def ellipse(elem_id, x, y, w, h, **kwargs):
    e = _common(elem_id, x, y, w, h, **kwargs)
    e["type"] = "ellipse"
    return e


def text(elem_id, x, y, content, font_size=20, font_family=2, align="left",
         color="#1e1e1e", w=None, h=None, container_id=None):
    """Text. font_family: 1=Virgil(handwritten), 2=Helvetica, 3=Cascadia(mono)
    Always sets autoResize=true so Excalidraw fits text to content,
    preventing the silent-clip behavior when our manual w/h estimates
    are slightly off."""
    # Generous size estimate if not provided
    if w is None:
        max_line = max((len(line) for line in content.split("\n")), default=10)
        w = max(50, int(max_line * font_size * 0.7))
    if h is None:
        line_count = content.count("\n") + 1
        h = int(line_count * font_size * 1.4) + 8
    e = _common(elem_id, x, y, w, h)
    e["type"] = "text"
    e["text"] = content
    e["originalText"] = content
    e["fontSize"] = font_size
    e["fontFamily"] = font_family
    e["textAlign"] = align
    e["verticalAlign"] = "top"
    e["baseline"] = int(font_size * 0.91)
    e["containerId"] = container_id
    e["lineHeight"] = 1.25
    e["strokeColor"] = color
    e["autoResize"] = True       # critical: lets Excalidraw fit text to content
    e["customData"] = None
    return e


def arrow(elem_id, x1, y1, x2, y2, *, dashed=False, color="#1e1e1e",
          start_id=None, end_id=None, label=None):
    e = _common(elem_id, x1, y1, x2 - x1, y2 - y1, stroke=color,
                stroke_style="dashed" if dashed else "solid")
    e["type"] = "arrow"
    e["points"] = [[0, 0], [x2 - x1, y2 - y1]]
    e["startArrowhead"] = None
    e["endArrowhead"] = "arrow"
    e["lastCommittedPoint"] = None
    if start_id:
        e["startBinding"] = {"elementId": start_id, "focus": 0, "gap": 4}
    else:
        e["startBinding"] = None
    if end_id:
        e["endBinding"] = {"elementId": end_id, "focus": 0, "gap": 4}
    else:
        e["endBinding"] = None
    return e


# ---------------------------------------------------------------------------
# Color palette
# ---------------------------------------------------------------------------

# Each "tier" has fill + stroke
COLORS = {
    "mac_zone": ("#f1f5f9", "#475569"),       # gray container — Clay's Mac
    "cloud_zone": ("#ede9fe", "#6d28d9"),     # purple container — Letta Cloud
    "tunnel_zone": ("#fef3c7", "#b45309"),    # amber — ngrok bridge
    "sandbox_zone": ("#dcfce7", "#15803d"),   # green — E2B sandbox

    "doer": ("#dbeafe", "#1e40af"),           # blue — Doer
    "fernweh": ("#bfdbfe", "#1d4ed8"),
    "adapter": ("#bae6fd", "#0369a1"),
    "skill": ("#fed7aa", "#c2410c"),
    "scheduler": ("#fecaca", "#b91c1c"),

    "agent": ("#e9d5ff", "#7e22ce"),          # purple — agents
    "constitution": ("#fee2e2", "#b91c1c"),   # red — high-priority
    "persona": ("#fce7f3", "#be185d"),

    "memory_rw": ("#fef9c3", "#a16207"),      # yellow — read-write memory
    "memory_ro": ("#e5e5e5", "#525252"),      # gray — read-only memory
    "core_block": ("#fef08a", "#854d0e"),     # darker yellow — core memory

    "tool_letta": ("#a7f3d0", "#047857"),     # green — Letta tools
    "tool_doer": ("#86efac", "#15803d"),

    "annotation": ("transparent", "#1e293b"),
    "flow_label": ("#fef9c3", "#854d0e"),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

elements = []


def add(*items):
    for i in items:
        elements.append(i)


def labeled_box(elem_id, x, y, w, h, label, *, fill_key, font_size=18,
                title_color=None, hint=None, hint_size=12,
                title_font_family=2, body_font_family=2):
    """Rectangle with a title and optional hint stacked inside.
    Returns the rect element (for arrow binding)."""
    fill, stroke = COLORS[fill_key]
    r = rect(elem_id, x, y, w, h, stroke=stroke, bg=fill,
             roundness={"type": 3}, stroke_width=2)
    add(r)
    title = text(f"{elem_id}-title", x + 10, y + 10, label,
                 font_size=font_size, font_family=title_font_family,
                 color=title_color or stroke, w=w - 20)
    add(title)
    if hint:
        h_y = y + 10 + int(font_size * 1.4)
        add(text(f"{elem_id}-hint", x + 10, h_y, hint,
                 font_size=hint_size, font_family=body_font_family,
                 color=stroke, w=w - 20))
    return r


def memory_block(elem_id, x, y, label, purpose, *, rw=True, w=240, h=70):
    """Compact memory block card."""
    fill_key = "memory_rw" if rw else "memory_ro"
    fill, stroke = COLORS[fill_key]
    r = rect(elem_id, x, y, w, h, stroke=stroke, bg=fill,
             roundness={"type": 3}, stroke_width=1)
    add(r)
    badge = "rw" if rw else "ro"
    add(text(f"{elem_id}-name", x + 8, y + 6, label,
             font_size=12, font_family=3, color=stroke, w=w - 60))
    add(text(f"{elem_id}-badge", x + w - 28, y + 6, badge,
             font_size=10, font_family=3, color=stroke, w=24, align="right"))
    add(text(f"{elem_id}-purpose", x + 8, y + 26, purpose,
             font_size=11, font_family=2, color=stroke, w=w - 16))
    return r


def annotation(elem_id, x, y, content, *, color="#1e293b", font_size=14,
               italic=False, w=None):
    return text(elem_id, x, y, content, font_size=font_size, font_family=2,
                color=color, w=w)


# ---------------------------------------------------------------------------
# LAYOUT: top zone — Clay's Mac
# ---------------------------------------------------------------------------

# Big container for "Clay's Mac"
add(labeled_box("mac-zone", 60, 60, 2480, 940, "Clay's Mac (localhost)",
                fill_key="mac_zone", font_size=28, title_color="#475569",
                hint="Doer + local adapters + Letta Code CLI all run here. Port 3100."))

# --- Doer / Paperclip (left side) ---
add(labeled_box("doer", 100, 140, 800, 480, "Doer  (paperclip on disk)",
                fill_key="doer", font_size=22,
                hint="Local server · port 3100 · the orchestration brain"))

# Inside Doer
add(labeled_box("doer-scheduler", 130, 220, 360, 100,
                "Heartbeat scheduler",
                fill_key="scheduler", font_size=14,
                hint="Decides when agents wake. Fires every ~30-60s\nper schedule. Sends wake message via adapter."))

add(labeled_box("doer-adapters", 510, 220, 360, 100,
                "Adapters (per type)",
                fill_key="adapter", font_size=14,
                hint="claude_local · codex_local · cursor · opencode_local\npi_local · letta_cloud · openclaw_gateway"))

add(labeled_box("doer-issues", 130, 340, 360, 80,
                "Issue queue + DB",
                fill_key="doer", font_size=14,
                hint="Embedded Postgres · 70+ tables\nIssues, agents, projects, runs, deliverables…"))

add(labeled_box("doer-deliverables", 510, 340, 360, 80,
                "Deliverables + StorageService",
                fill_key="doer", font_size=14,
                hint="files table · StorageService (local-disk / S3)\nmultipart upload + share-token portal"))

add(labeled_box("doer-fernweh", 130, 440, 360, 80,
                "Fernweh UI (the cockpit)",
                fill_key="fernweh", font_size=14,
                hint="Outputs · Agents · Issues · Goals · Memory…\nClay's interface to all of it"))

add(labeled_box("doer-skills", 510, 440, 360, 80,
                "skills/  directory",
                fill_key="skill", font_size=14,
                hint="doer · deliverable · gremlin · letta-memory…\nAuto-mounted into local adapters via tmpdir symlinks"))

add(annotation("doer-port", 140, 540,
               "API: http://localhost:3100/api/*\nInternal pg port: 54329",
               color="#1e40af", font_size=11))

# --- Local adapters running locally ---
add(labeled_box("local-adapters-zone", 940, 140, 700, 280,
                "Local-execution adapters",
                fill_key="adapter", font_size=18,
                hint="These adapters run subprocess agents ON Clay's Mac.\nAgents have access to local FS via Bash/Read/Write."))

agent_box_w = 200
agent_box_h = 80
local_agents = [
    ("claude-local", "claude_local",
     "Imp · Marshal · Mechanic · CEO\nUses Claude Code CLI"),
    ("codex-local", "codex_local",
     "OpenAI Codex CLI"),
    ("opencode-local", "opencode_local",
     "Pope Orby · Hunter · Closer · Maker\nUses opencode CLI"),
    ("cursor-local", "cursor_local",
     "Cursor CLI"),
]
for i, (eid, label, hint) in enumerate(local_agents):
    col = i % 3
    row = i // 3
    x = 970 + col * (agent_box_w + 20)
    y = 220 + row * (agent_box_h + 20)
    add(labeled_box(f"adapter-{eid}", x, y, agent_box_w, agent_box_h,
                    label, fill_key="adapter", font_size=12, hint=hint, hint_size=10))

# --- Letta Code CLI (right side, separate from Doer) ---
add(labeled_box("letta-code", 1680, 140, 820, 280,
                "Letta Code CLI  (interactive, only when Clay invokes it)",
                fill_key="mac_zone", font_size=18, title_color="#475569",
                hint="Clay's interactive Letta interface. Has Bash/Read/Write\nbuilt-ins that run on this Mac and reach localhost:3100\ndirectly. NOT available to Letta-Cloud agents at heartbeat time."))

add(annotation("letta-code-warning", 1700, 220,
               "⚠  Letta-Cloud agents (Dondog, Alfie, Chef, etc.) do NOT\n"
               "have access to these built-ins when they wake via heartbeat.\n"
               "They run in E2B sandbox in Letta's cloud — see below.",
               color="#b91c1c", font_size=14, w=780))

add(annotation("letta-code-tools", 1700, 320,
               "Letta Code built-ins:  Bash · Read · Write · Edit · Glob · Grep\n"
               "Reach localhost:3100 directly  ✅\n"
               "Use these for Clay's manual intervention, not for agent runs.",
               color="#475569", font_size=12, w=780))

# --- Skill detail under doer-skills ---
add(annotation("skill-detail", 130, 660,
               "How skills mount per adapter:",
               color="#c2410c", font_size=14))
add(annotation("skill-detail-claude", 130, 690,
               "claude_local:  fresh tmpdir/.claude/skills/* per run, symlinked from skills/ → ephemeral\n"
               "opencode_local:  persistent ~/.claude/skills/* shared with Claude Code → durable\n"
               "letta_cloud:  NOT a skill mount — instead, ensureDeliverableTool() registers\n"
               "  a 'produce_deliverable' Letta tool and attaches to each agent on hire.",
               color="#525252", font_size=11, w=850))

# Deliverable interception detail
add(labeled_box("interception", 1020, 460, 600, 180,
                "🪝  produce_deliverable interception",
                fill_key="skill", font_size=14,
                hint="When a letta_cloud agent calls produce_deliverable:\n"
                     "1. Letta sandbox runs a no-op stub (returns 'accepted')\n"
                     "2. Doer adapter sees tool_call_message in the stream\n"
                     "3. Adapter decodes base64 file_content_base64\n"
                     "4. Adapter POSTs multipart to /api/companies/:id/deliverables\n"
                     "5. StorageService stores file, deliverables row created\n"
                     "Bypasses ngrok — the work happens IN the adapter, on Clay's Mac."))


# ---------------------------------------------------------------------------
# MIDDLE ZONE — ngrok tunnel
# ---------------------------------------------------------------------------

add(labeled_box("ngrok", 100, 1040, 2440, 100,
                "ngrok tunnel  (ephemeral, restart = new URL)",
                fill_key="tunnel_zone", font_size=20,
                hint="https://hopeful-sawfish-gently.ngrok-free.app  →  localhost:3100\n"
                     "Bridges Letta Cloud's E2B sandbox into Clay's local Doer."))


# ---------------------------------------------------------------------------
# BOTTOM ZONE — Letta Cloud
# ---------------------------------------------------------------------------

add(labeled_box("cloud-zone", 60, 1180, 2480, 2500,
                "Letta Cloud  (remote, api.letta.com)",
                fill_key="cloud_zone", font_size=28, title_color="#6d28d9",
                hint="Stateful agents live here. Each agent has a system prompt + memory blocks +\n"
                     "attached tools. Agents persist memory across heartbeats. Tools execute in E2B sandbox."))

# E2B sandbox annotation
add(labeled_box("e2b", 100, 1260, 2400, 90,
                "E2B Python sandbox  (where every Letta tool runs)",
                fill_key="sandbox_zone", font_size=18,
                hint="Tool source_code (Python) executes here. Cannot reach localhost — uses ngrok.\n"
                     "No Bash/Read/Write built-ins. Only the tools attached to the agent."))

# --- Tool Registry ---
add(labeled_box("tool-registry", 100, 1380, 2400, 120,
                "Tool Registry  (account-scoped, shared across all your letta_cloud agents)",
                fill_key="tool_letta", font_size=18,
                hint="Tools you create live here. Each agent has a SUBSET attached.\n"
                     "Custom Python source (full impl OR no-op stub) + JSON args schema + description."))

tool_x_start = 130
tool_y = 1440
tool_w = 200
tool_h = 50
tools = [
    ("produce_deliverable", "no-op stub\n→ adapter intercepts"),
    ("read_paperclip_issues", "GET /api/.../issues"),
    ("create_paperclip_issue", "POST /api/.../issues"),
    ("update_paperclip_issue", "PATCH /api/.../issues"),
    ("send_awakening", "wake another agent"),
    ("send_proactive_alert", "Telegram → Clay"),
    ("dispatch_gremlin", "send task to gremlin"),
    ("read_council_notes", "read shared block"),
    ("write_council_decision", "write to council block"),
    ("read_dispatch_state", "Alfie's dispatch state"),
    ("read_agent_block", "peer agent's block"),
]
for i, (name, hint) in enumerate(tools):
    x = tool_x_start + (i % 6) * (tool_w + 10)
    y = tool_y + (i // 6) * (tool_h + 5)
    fill, stroke = COLORS["tool_letta"]
    r = rect(f"tool-{name}", x, y, tool_w, tool_h, stroke=stroke, bg=fill,
            roundness={"type": 3}, stroke_width=1)
    add(r)
    add(text(f"tool-{name}-n", x + 6, y + 4, name,
             font_size=10, font_family=3, color=stroke, w=tool_w - 12))
    add(text(f"tool-{name}-h", x + 6, y + 22, hint,
             font_size=9, font_family=2, color=stroke, w=tool_w - 12))

add(annotation("tool-registry-note", 130, 1520,
               "Bold: 'produce_deliverable' is the only tool that doesn't actually call anything.\n"
               "Letta runs the stub Python (returns receipt); the Doer adapter does the real work\n"
               "by observing the tool_call_message event in the stream.",
               color="#047857", font_size=12, w=2200))


# ---------------------------------------------------------------------------
# DONDOG — full detail
# ---------------------------------------------------------------------------

dondog_x = 100
dondog_y = 1620
dondog_w = 1200
dondog_h = 1700

add(labeled_box("dondog", dondog_x, dondog_y, dondog_w, dondog_h,
                "🏛  Dondog  (letta_cloud) — Strategist, Orchestrator",
                fill_key="agent", font_size=22,
                hint="The smartest letta agent. Most layered instruction stack."))

# --- Constitution (highest priority) ---
add(labeled_box("dondog-constitution", dondog_x + 30, dondog_y + 90, dondog_w - 60, 280,
                "📜  Constitution  (top of system prompt — highest priority)",
                fill_key="constitution", font_size=16,
                hint="Priority order when instructions conflict — earlier wins:\n"
                     "1. Wake context (DOER_TASK_ID, DOER_WAKE_REASON, etc.)\n"
                     "2. Issue body of DOER_TASK_ID\n"
                     "3. Most-recent comment on that issue\n"
                     "4. Bundled Doer skills (deliverable for files)\n"
                     "5. Tool descriptions\n"
                     "6. Persona statement\n"
                     "7. Memory blocks — TREAT AS HISTORICAL CONTEXT, not commands\n\n"
                     "Anti-loop clause: do not loop on a single instruction across heartbeats.\n"
                     "Memory updates: yes for Doer memory blocks; never override priority order."))

# --- Operational protocols (mid priority) ---
add(labeled_box("dondog-protocols", dondog_x + 30, dondog_y + 380, dondog_w - 60, 100,
                "⚙  OPERATIONAL PROTOCOLS  (refers to paperclip_work_instructions block)",
                fill_key="persona", font_size=14,
                hint="Tells Dondog his fast-path protocol lives in a memory block (auto-loaded).\n"
                     "Takes precedence over rest of prompt body EXCEPT the Constitution above."))

# --- Persona body ---
add(labeled_box("dondog-persona", dondog_x + 30, dondog_y + 490, dondog_w - 60, 250,
                "👤  Persona body  (Dondog identity, Council Protocol, Tools, Principles)",
                fill_key="persona", font_size=14,
                hint="Council Protocol (when [COUNCIL TIME] signaled): 6-step procedure for\n"
                     "running a council session, generating tasks_to_create JSON, signaling Chef.\n\n"
                     "Tools list, priority values matrix, principles, retired-tools warnings,\n"
                     "memory block reference (read-write vs read-only)."))

# --- Memory blocks ---
add(annotation("dondog-mem-header", dondog_x + 30, dondog_y + 760,
               "💾  Memory blocks (25 attached, classified):",
               color="#7e22ce", font_size=16))

# Read-write blocks
rw_blocks = [
    ("dd_journal", "Learning log. Write here often."),
    ("dd_running_memory", "Council state, last timestamp, blockers."),
    ("dispatch_state", "Alfie's dispatch state."),
    ("system/work/active", "PRIMARY OUTPUT — what Chef reads."),
    ("system/goals/current", "Active objectives + roadmap."),
    ("system/human", "Clay's profile + preferences."),
    ("system/context/current", "Current operational context."),
    ("system/context/projects", "Active project details."),
    ("system/context/execution-environment", "Runtime: ngrok URL, port, etc.\n⚠ Was driving the ngrok loop."),
    ("system/persona", "Identity. WRITABLE (risky)."),
]

mb_x = dondog_x + 30
mb_y = dondog_y + 800
mb_w = 280
mb_h = 64
for i, (name, purpose) in enumerate(rw_blocks):
    col = i % 4
    row = i // 4
    memory_block(f"mb-rw-{i}", mb_x + col * (mb_w + 10), mb_y + row * (mb_h + 8),
                 name, purpose, rw=True, w=mb_w, h=mb_h)

add(annotation("dondog-rw-label", dondog_x + 30, dondog_y + 790,
               "Read-write (Doer memory — agent SHOULD update these)",
               color="#a16207", font_size=11))

# Read-only blocks
ro_y_start = dondog_y + 1030
add(annotation("dondog-ro-label", dondog_x + 30, ro_y_start,
               "Read-only (reference, do not write)",
               color="#525252", font_size=11))

ro_blocks = [
    ("paperclip_work_instructions", "🔑 Core block — fast-path heartbeat protocol."),
    ("system/context/donjon", "Donjon org structure + mission."),
    ("system/context/mission", "Mission specifics."),
    ("system/context/background", "Background context."),
    ("system/context/resources", "Resources + references."),
    ("system/context/knowledge", "Domain knowledge."),
    ("system/context/letta-ecosystem", "Letta platform reference."),
    ("system/skills/capabilities", "Skill manifest."),
    ("system/skills/tools", "Tool documentation."),
    ("system/preferences/boundaries", "Behavioral boundaries."),
    ("system/preferences/communication", "Comm style preferences."),
    ("system/preferences/formatting", "Formatting preferences."),
    ("system/soul-extension", "Letta soul metadata."),
    ("dd_gremlin_manifest", "Registry of available gremlins."),
    ("dd_notion_index", "Notion workspace map."),
    ("dd_history", "Archived stale content."),
]

mb_y = ro_y_start + 25
for i, (name, purpose) in enumerate(ro_blocks):
    col = i % 4
    row = i // 4
    memory_block(f"mb-ro-{i}", mb_x + col * (mb_w + 10), mb_y + row * (mb_h + 8),
                 name, purpose, rw=False, w=mb_w, h=mb_h)

# Tools attached to Dondog
add(annotation("dondog-tools-label", dondog_x + 30, dondog_y + 1530,
               "🛠  Tools attached (10):  produce_deliverable · read_paperclip_issues ·\n"
               "  create_paperclip_issue · update_paperclip_issue · send_awakening ·\n"
               "  send_proactive_alert · dispatch_gremlin · read_council_notes ·\n"
               "  read_dispatch_state · read_agent_block",
               color="#047857", font_size=11, w=1140))

add(annotation("dondog-failure", dondog_x + 30, dondog_y + 1620,
               "🐛  Known failure modes:\n"
               "  • Ngrok-down loop (memory drift in execution-environment block — being fixed)\n"
               "  • Tool name truncation (read_paperclip_issu — model token error, not real tool)\n"
               "  • Cognitive overload from 9-layer instruction stack",
               color="#b91c1c", font_size=11, w=1140))


# ---------------------------------------------------------------------------
# OTHER LETTA AGENTS (compact)
# ---------------------------------------------------------------------------

other_x = 1340
other_y = 1620
other_w = 1180

add(labeled_box("other-agents", other_x, other_y, other_w, 1700,
                "Other Letta agents  (12 more — same architecture pattern as Dondog, varying detail)",
                fill_key="agent", font_size=18,
                hint="Each has its own persona, memory blocks (often the system/* set + custom),\n"
                     "and a subset of tools. Constitution should propagate to all eventually."))

agent_card_w = 360
agent_card_h = 100
others = [
    ("Alfie", "letta_cloud · Learning Processor · Dispatch",
     "dispatch_gremlin, read_dispatch_state\nReports to Dondog's strategy"),
    ("Chef", "letta_cloud · Kitchen Manager",
     "Receives [QUEUE FILL REQUEST]\ncreate_paperclip_issue · queue maintenance"),
    ("Forgemaster", "letta_cloud · System Architect",
     "Multi-agent build coordination"),
    ("Lorekeeper", "letta_cloud · Institutional Knowledge",
     "Donjon-history awareness · research"),
    ("Morpheus", "letta_cloud · Learning Processor",
     "Pattern extraction across runs"),
    ("Reverie", "letta_cloud", "Idea + creative reflection"),
    ("Oneiros", "letta_cloud", "Dream-state / sleeptime"),
    ("Overlord", "letta_cloud", "Strategic oversight"),
    ("Warlord", "letta_cloud", "Decisive execution"),
    ("Shadowhand", "letta_cloud", "Stealth ops + research"),
    ("The Tower Keeper", "letta_cloud (separate Letta account)",
     "Independent governance"),
    ("Noctua 2", "letta_cloud", "Owl — observation + analysis"),
]
for i, (name, role, tools_) in enumerate(others):
    col = i % 3
    row = i // 3
    x = other_x + 30 + col * (agent_card_w + 15)
    y = other_y + 80 + row * (agent_card_h + 15)
    add(labeled_box(f"agent-{name.replace(' ', '-').lower()}", x, y,
                    agent_card_w, agent_card_h, name,
                    fill_key="agent", font_size=14, hint=f"{role}\n{tools_}", hint_size=10))

# Local-adapter agents column (separate from letta cloud)
add(annotation("local-agents-anchor", other_x + 30, other_y + 720,
               "Note: agents on local adapters (claude_local, opencode_local, cursor)\n"
               "such as Imp, Pope Orby, Hunter, Closer, Maker — live in Doer's DB only.\n"
               "Their persona is in Doer's agent record, not in Letta. They get the\n"
               "deliverable skill via the SKILL.md file mounted into their CLI tmpdir.",
               color="#1e40af", font_size=12, w=1100))


# ---------------------------------------------------------------------------
# HEARTBEAT FLOW (numbered, right side)
# ---------------------------------------------------------------------------

flow_x = 100
flow_y = 3380
add(labeled_box("flow-zone", flow_x, flow_y, 2440, 280,
                "🔁  Heartbeat flow (Letta Cloud agent — what happens on each wake)",
                fill_key="flow_label", font_size=18,
                hint="Numbered end-to-end. Same pattern for any letta_cloud agent."))

steps = [
    "1. Doer's heartbeat scheduler decides agent X needs to wake (cron-like).",
    "2. letta_cloud adapter sends a message to agent X via Letta API; sets DOER_TASK_ID, DOER_WAKE_REASON, etc. as wake context.",
    "3. Letta Cloud loads agent X's system prompt + ALL memory blocks into the model's context. Constitution is at top.",
    "4. Model reasons. Resolves L1-L9 conflicts in real time. Decides which tool(s) to call.",
    "5. Tool source (Python) executes in Letta's E2B sandbox. Most tools curl ngrok → localhost:3100 to hit Doer.",
    "6. Doer routes accept the tool call (auth via injected key), execute, return JSON. Letta streams the result back to the model.",
    "7. Special case: 'produce_deliverable' is a no-op stub. The Doer adapter, watching the stream, intercepts and does the file storage itself.",
    "8. Adapter awaits any pending side-effects (deliverable uploads), then signals run-complete back to Doer.",
    "9. Doer marks the heartbeat run done; agent sleeps until the next wake.",
]
for i, step in enumerate(steps):
    add(annotation(f"step-{i}", flow_x + 30, flow_y + 70 + i * 22, step,
                   color="#854d0e", font_size=11, w=2400))


# ---------------------------------------------------------------------------
# FAILURE MODES MAP (right of heartbeat flow)
# ---------------------------------------------------------------------------

fail_x = 100
fail_y = 3700
add(labeled_box("fail-zone", fail_x, fail_y, 2440, 280,
                "⚠  Three failure modes (per the heartbeat-orchestration design doc)",
                fill_key="constitution", font_size=18,
                hint="Each mapped to which orchestration pattern addresses it."))

fail_w = 800
fail_h = 180
fail_items = [
    ("1. Layer drift",
     "Memory blocks evolve over time, contradict newer system instructions.\n"
     "Symptom: 'I previously decided X' beats current task.\n"
     "Example: Dondog ngrok-stuck loop.\n\n"
     "→ Addressed by:  C (memory hygiene) · D (Constitution priority order)"),
    ("2. Salience competition",
     "Conflicting instructions across layers. Model picks most-active in moment.\n"
     "Symptom: tools attached but not called. Skills mounted but ignored.\n"
     "Example: Imp's first attempt (markdown instead of file).\n\n"
     "→ Addressed by:  D (Constitution) · B (hard contracts on high-stakes paths)"),
    ("3. Cognitive overload",
     "Too many simultaneous instructions exceeds salience budget.\n"
     "Symptom: corner-cutting, looping, tool-name hallucination.\n"
     "Example: Dondog 'read_paperclip_issu' truncation.\n\n"
     "→ Addressed by:  A (mode-switched wakes — strip wake context to mode)"),
]
for i, (title, body) in enumerate(fail_items):
    x = fail_x + 30 + i * (fail_w + 10)
    y = fail_y + 60
    add(labeled_box(f"fail-{i}", x, y, fail_w, fail_h, title,
                    fill_key="constitution", font_size=14, hint=body, hint_size=11))


# ---------------------------------------------------------------------------
# CRITICAL KEY FLOW ARROWS
# ---------------------------------------------------------------------------

# Scheduler → ngrok → cloud
add(arrow("a-sched-ngrok", 310, 320, 310, 1040,
          color="#b91c1c", dashed=True))
add(annotation("a-sched-label", 320, 700,
               "(1) Wake message via\nLetta API (HTTPS)",
               color="#b91c1c", font_size=11, w=200))

# ngrok → cloud
add(arrow("a-ngrok-cloud", 1300, 1140, 1300, 1180,
          color="#b45309"))
add(annotation("a-tunnel-label", 1100, 1145,
               "Tool calls travel back through ngrok",
               color="#b45309", font_size=11, w=400))

# Doer skills → local adapters (auto-mount)
add(arrow("a-skills-claude", 700, 520, 1080, 220, color="#c2410c", dashed=True))
add(annotation("a-skills-label", 760, 580,
               "skills/* auto-mounted\n(symlink tmpdir → tools)",
               color="#c2410c", font_size=11))

# Interception arrow — produce_deliverable
add(arrow("a-intercept", 1320, 540, 870, 420, color="#15803d"))
add(annotation("a-intercept-label", 870, 470,
               "Adapter intercepts\ntool_call_message →\nstores file directly",
               color="#15803d", font_size=11))

# Constitution → memory blocks (priority)
add(arrow("a-const-mem", dondog_x + 600, dondog_y + 370,
          dondog_x + 600, dondog_y + 770, color="#b91c1c"))
add(annotation("a-const-mem-label", dondog_x + 620, dondog_y + 550,
               "Constitution declares memory\nblocks are HISTORICAL, not\ncommands. Anti-drift.",
               color="#b91c1c", font_size=11, w=300))

# paperclip_work_instructions ↔ Dondog protocols
add(arrow("a-pwi-protocol", dondog_x + 30 + 280 + 5, dondog_y + 1075,
          dondog_x + 600, dondog_y + 480, color="#854d0e", dashed=True))
add(annotation("a-pwi-label", dondog_x + 350, dondog_y + 800,
               "paperclip_work_instructions\nis the fast-path protocol\nreferenced from system prompt",
               color="#854d0e", font_size=10, w=280))


# ---------------------------------------------------------------------------
# GLOBAL TITLE + LEGEND
# ---------------------------------------------------------------------------

add(text("title", 60, 0,
         "Doer × Letta — Orchestration Architecture",
         font_size=36, color="#0f172a", w=1400))
add(text("subtitle", 60, 40,
         "Where memory blocks live, how they engage with system instructions, and how it all routes through Doer's heartbeat. — 2026-04-25",
         font_size=14, color="#475569", w=1900))

# Legend (top-right)
legend_x = 2160
legend_y = 0
add(labeled_box("legend", legend_x, legend_y, 380, 40,
                "Legend (color = role)", fill_key="annotation",
                font_size=14, title_color="#1e293b"))
legend_items = [
    ("doer", "Doer subsystems"),
    ("adapter", "Adapters / Letta Code"),
    ("agent", "Agents (Letta or local)"),
    ("constitution", "Constitution / persona"),
    ("memory_rw", "Read-write memory blocks"),
    ("memory_ro", "Read-only memory blocks"),
    ("tool_letta", "Letta tools"),
    ("skill", "Skills / interception"),
    ("scheduler", "Heartbeat scheduler"),
    ("tunnel_zone", "ngrok tunnel"),
    ("sandbox_zone", "E2B sandbox"),
]
for i, (key, label) in enumerate(legend_items):
    fill, stroke = COLORS[key]
    swatch = rect(f"legend-sw-{i}", legend_x + 10,
                  legend_y + 50 + i * 28, 18, 18,
                  stroke=stroke, bg=fill, roundness={"type": 3}, stroke_width=1)
    add(swatch)
    add(text(f"legend-tx-{i}", legend_x + 38, legend_y + 50 + i * 28,
             label, font_size=12, color="#1e293b", w=300))


# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------

scene = {
    "type": "excalidraw",
    "version": 2,
    "source": "https://github.com/donjon/doer (gen-architecture-diagram.py)",
    "elements": elements,
    "appState": {
        "gridSize": None,
        "viewBackgroundColor": "#ffffff",
    },
    "files": {},
}

repo_root = Path(__file__).resolve().parent.parent
out_path = repo_root / "doc" / "diagrams" / "2026-04-25-doer-letta-architecture.excalidraw"
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(scene, indent=2))
print(f"✓ Wrote {out_path}")
print(f"  Elements: {len(elements)}")
print(f"\nOpen in https://excalidraw.com (drag-drop) or Excalidraw desktop client.")
