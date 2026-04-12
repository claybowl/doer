---
name: letta-memory
description: >
  Read and write Letta Cloud memory for stateful agent persistence across runs.
  Use this skill on every heartbeat to load your identity and learnings before
  working, and to save new learnings after completing work. This is how Super-Gremlins
  remember, grow, and get smarter over time. Required for all Super-Gremlin agents.
---

# Letta Memory Skill

You have a persistent identity in Letta Cloud. Your memory lives there across all runs.
**Read it before you work. Write to it after you work. This is how you learn.**

## Environment Variables

These are pre-injected in your heartbeat environment:

| Variable | Description |
|---|---|
| `LETTA_API_KEY` | Bearer token for Letta Cloud API |
| `LETTA_AGENT_ID` | Your Letta Cloud agent ID (e.g. `agent-xxxx`) |
| `LETTA_BASE_URL` | Defaults to `https://api.letta.com/v1` |
| `ALFIE_AGENT_ID` | Alfie's Letta agent ID for status reporting |

---

## Step 1 — Load Your Memory (Do This First, Every Run)

Before checking your Paperclip inbox or doing any work, load your Letta memory blocks.
Run this at the start of every heartbeat:

```python
import os, urllib.request, json

key    = os.environ["LETTA_API_KEY"]
aid    = os.environ["LETTA_AGENT_ID"]
base   = os.environ.get("LETTA_BASE_URL", "https://api.letta.com/v1").rstrip("/")

req = urllib.request.Request(
    f"{base}/agents/{aid}",
    headers={"Authorization": f"Bearer {key}", "Accept": "application/json"}
)
data   = json.loads(urllib.request.urlopen(req, timeout=10).read())
blocks = {b["label"]: b["value"] for b in data.get("memory", {}).get("blocks", [])}

# Print the blocks you care about
for label in ["persona", "learnings", "current_task"]:
    # label may use gremlin_<name>_<type> format
    for k, v in blocks.items():
        if label in k:
            print(f"\n=== {k} ===\n{v}")
```

The blocks contain:
- **`gremlin_[name]_persona`** — who you are, your specialty, your operating style
- **`gremlin_[name]_learnings`** — what you've learned from past runs (read this carefully)
- **`gremlin_[name]_current_task`** — what task you were last working on

Load this context into your working memory. Let it shape how you approach the current task.

---

## Step 2 — Search Archival Memory (When Relevant)

Before starting a task, search your long-term memory for past learnings relevant to this work:

```python
import os, urllib.request, json, urllib.parse

key  = os.environ["LETTA_API_KEY"]
aid  = os.environ["LETTA_AGENT_ID"]
base = os.environ.get("LETTA_BASE_URL", "https://api.letta.com/v1").rstrip("/")

query = "your search term here"  # e.g. the task domain, a tool name, a pattern
params = urllib.parse.urlencode({"query": query, "limit": 5})
req = urllib.request.Request(
    f"{base}/agents/{aid}/archival?{params}",
    headers={"Authorization": f"Bearer {key}", "Accept": "application/json"}
)
results = json.loads(urllib.request.urlopen(req, timeout=10).read())
for r in results.get("results", results if isinstance(results, list) else []):
    print(r.get("text", r))
```

Use this to pull up relevant past learnings before diving in. Past-you may have already solved this.

---

## Step 3 — Update current_task Block (When Starting a New Task)

When you begin a new task, record it so the Dream Team can track you during sleeptime synthesis:

```python
import os, urllib.request, json

key  = os.environ["LETTA_API_KEY"]
aid  = os.environ["LETTA_AGENT_ID"]
base = os.environ.get("LETTA_BASE_URL", "https://api.letta.com/v1").rstrip("/")

# Find the current_task block ID first
req = urllib.request.Request(
    f"{base}/agents/{aid}",
    headers={"Authorization": f"Bearer {key}", "Accept": "application/json"}
)
data = json.loads(urllib.request.urlopen(req, timeout=10).read())
blocks = data.get("memory", {}).get("blocks", [])
task_block = next((b for b in blocks if "current_task" in b.get("label", "")), None)

if task_block:
    block_id = task_block["id"]
    new_value = json.dumps({
        "task_id": "PAPERCLIP_TASK_ID_HERE",   # replace with actual
        "description": "Brief description of current task",
        "started_at": "ISO_TIMESTAMP_HERE",
        "status": "in_progress"
    })
    req = urllib.request.Request(
        f"{base}/blocks/{block_id}",
        data=json.dumps({"value": new_value}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="PATCH"
    )
    urllib.request.urlopen(req, timeout=10)
    print("current_task updated.")
```

---

## Step 4 — Save a Learning (Do This After Every Completed Task)

After you finish work, write what you learned to archival memory. **Be specific and honest.**
Include: what worked, what failed, what surprised you, what you'd do differently.

```python
import os, urllib.request, json, datetime

key  = os.environ["LETTA_API_KEY"]
aid  = os.environ["LETTA_AGENT_ID"]
base = os.environ.get("LETTA_BASE_URL", "https://api.letta.com/v1").rstrip("/")

learning = {
    "date":       datetime.datetime.utcnow().isoformat(),
    "task_id":    "TASK_ID",           # The Paperclip issue ID you worked on
    "domain":     "e.g. web_research", # Short domain tag for future search
    "what_worked": "...",              # Concrete. What approach succeeded?
    "what_failed": "...",              # What did you try that didn't work?
    "lesson":     "...",               # The one-sentence distilled rule for next time
    "tools_used": ["tool1", "tool2"],  # What tools/commands were effective?
}

text = f"LEARNING [{learning['domain']}] {learning['date']}\n" + json.dumps(learning, indent=2)

body = json.dumps({"text": text}).encode()
req  = urllib.request.Request(
    f"{base}/agents/{aid}/archival",
    data=body,
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    method="POST"
)
urllib.request.urlopen(req, timeout=10)
print("Learning saved to Letta archival memory.")
```

**You MUST save a learning after every completed task.** Even "nothing interesting happened" is a learning.
This is your long-term memory. Future-you depends on it.

---

## Step 5 — Update learnings Block (Periodically)

Every 5 runs or so, distill your top learnings from archival into the `gremlin_[name]_learnings`
core memory block. This keeps your best lessons always in-context:

```python
import os, urllib.request, json

key  = os.environ["LETTA_API_KEY"]
aid  = os.environ["LETTA_AGENT_ID"]
base = os.environ.get("LETTA_BASE_URL", "https://api.letta.com/v1").rstrip("/")

# Find learnings block
req = urllib.request.Request(
    f"{base}/agents/{aid}",
    headers={"Authorization": f"Bearer {key}", "Accept": "application/json"}
)
data   = json.loads(urllib.request.urlopen(req, timeout=10).read())
blocks = data.get("memory", {}).get("blocks", [])
learn_block = next((b for b in blocks if "learnings" in b.get("label", "")), None)

if learn_block:
    block_id = learn_block["id"]
    # Write updated distillation of top learnings
    new_value = """[Distilled lessons from completed tasks]

1. [Lesson from run N]
2. [Lesson from run N-1]
...keep the 10 most important and relevant lessons."""

    req = urllib.request.Request(
        f"{base}/blocks/{block_id}",
        data=json.dumps({"value": new_value}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="PATCH"
    )
    urllib.request.urlopen(req, timeout=10)
    print("Learnings block updated.")
```

---

## Critical Rules

- **Always load memory BEFORE working.** Never start a task cold.
- **Always save a learning AFTER completing.** Even a one-liner is better than nothing.
- **Be honest in learnings.** Failures are more valuable than successes.
- **Search archival before solving.** You may have solved this before.
- **Keep learnings block current.** Distill often so your best lessons stay in-context.

## Full Letta API Reference

See `skills/letta-memory/references/api.md` for the complete endpoint reference.
