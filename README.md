# The operating system for autonomous AI companies

---

## The thesis

**Autonomous AI companies will become a major force in the global economy.** Not one company. Thousands. Millions. An entire economic layer that runs on AI labor, coordinated through software.

Right now, running an AI company means 20 Claude Code tabs, lost context on reboot, manually gathering state from six places, and runaway token burns that max your quota before you notice. You're not running a company. You're babysitting terminals.

**Doer is the control plane that makes autonomous companies real.** It is to AI workforces what the corporate operating system is to human ones — except this time, the operating system is actual software, not metaphor. Task management, org charts, budgets, governance, goal alignment, heartbeat monitoring. Every autonomous company needs these. That's us.

> **Our goal:** Doer-powered companies should collectively generate economic output that rivals the GDP of the world's largest countries.

<br/>

## What it does

|        | Step            | Example                                                            |
| ------ | --------------- | ------------------------------------------------------------------ |
| **01** | Define the goal | _"Build the #1 AI note-taking app to $1M MRR."_                    |
| **02** | Hire the team   | CEO, CTO, engineers, designers, marketers — any bot, any provider. |
| **03** | Approve and run | Review strategy. Set budgets. Hit go. Monitor from the dashboard.  |

<br/>

<div align="center">
<table>
  <tr>
    <td align="center"><strong>Works<br/>with</strong></td>
    <td align="center"><img src="doc/assets/logos/openclaw.svg" width="32" alt="OpenClaw" /><br/><sub>OpenClaw</sub></td>
    <td align="center"><img src="doc/assets/logos/claude.svg" width="32" alt="Claude" /><br/><sub>Claude Code</sub></td>
    <td align="center"><img src="doc/assets/logos/codex.svg" width="32" alt="Codex" /><br/><sub>Codex</sub></td>
    <td align="center"><img src="doc/assets/logos/cursor.svg" width="32" alt="Cursor" /><br/><sub>Cursor</sub></td>
    <td align="center"><img src="doc/assets/logos/bash.svg" width="32" alt="Bash" /><br/><sub>Bash</sub></td>
    <td align="center"><img src="doc/assets/logos/http.svg" width="32" alt="HTTP" /><br/><sub>HTTP</sub></td>
  </tr>
</table>

<em>If it can receive a heartbeat, it's hired. The minimum contract is: be callable.</em>

</div>

<br/>

## How it works

Doer is built on two layers:

<p align="center">
  <img src="doc/assets/architecture.png" alt="Doer Architecture" width="720" />
</p>

### 1. Control Plane (Doer itself)

The central nervous system. Manages everything the company needs to function:

- **Agent registry & org chart** — who reports to whom, titles, role descriptions
- **Task assignment** — hierarchical work tracing back to the company mission
- **Budget & cost tracking** — token spend per agent, monthly budgets, hard-stop enforcement
- **Goal hierarchy** — company → team → agent → task, so every action has a "why"
- **Heartbeat monitoring** — know when agents are alive, idle, or stuck
- **Board governance** — approve hires, override strategy, pause any agent at any time

### 2. Execution Services (adapters)

Doer doesn't run your agents. It orchestrates them and they phone home. Adapters connect any execution environment:

| Adapter | Mechanism | Example |
| ------- | --------- | ------- |
| `process` | Execute a child process | `python run_agent.py --agent-id {id}` |
| `http` | Send an HTTP request | `POST https://your-agent/hook/{id}` |
| `claude_local` | Local Claude Code process | Claude Code heartbeat worker |
| `codex_local` | Local Codex process | Codex CLI heartbeat worker |
| `opencode_local` | Local OpenCode process | OpenCode heartbeat worker |
| `openclaw_gateway` | OpenClaw gateway API | Managed OpenClaw agent |
| `cursor` | Cursor API/CLI bridge | Cursor-integrated agent |

### Agent integration levels

Agents can integrate progressively — start simple, deepen over time:

1. **Callable** (minimum) — Doer can start you. That's the only contract.
2. **Status reporting** — Agent reports back success/failure after execution.
3. **Fully instrumented** — Agent reports status, cost/token usage, task updates, and logs. Bidirectional.

Doer ships with reference agents at all three levels.

<br/>

## Features

<table>
<tr>
<td align="center" width="33%">
<h3>🔌 Bring Your Own Agent</h3>
Any agent, any runtime, one org chart. If it can receive a heartbeat, it's hired. We don't tell you how to build agents — we tell you how to run a company made of them.
</td>
<td align="center" width="33%">
<h3>🎯 Goal Alignment</h3>
Every task traces back to the company mission through a parent chain. Agents always know <em>what</em> to do and <em>why</em>. "I'm researching Facebook ads → because I need to grow signups → because we're building the #1 AI note-taking app."
</td>
<td align="center" width="33%">
<h3>💓 Heartbeats</h3>
Agents wake on a schedule, check work, and act. Delegation flows up and down the org chart. No more manually kicking off recurring jobs — customer support, social posts, reports run on rhythm.
</td>
</tr>
<tr>
<td align="center">
<h3>💰 Cost Control</h3>
Monthly budgets per agent. Soft alerts when approaching limits. Hard-stop auto-pause when budgets are hit. Token spend attributed to tasks, projects, and companies. No runaway costs.
</td>
<td align="center">
<h3>🏢 Multi-Company</h3>
One deployment, many companies. Complete data isolation. One control plane for your entire portfolio — run an agency, an internal team, and a startup simultaneously.
</td>
<td align="center">
<h3>🎫 Ticket System</h3>
Every conversation traced. Every decision explained. Full tool-call tracing and immutable audit log. At any moment, understand exactly what happened and why.
</td>
</tr>
<tr>
<td align="center">
<h3>🛡️ Governance</h3>
You're the board. Approve hires, override strategy, pause or terminate any agent. Approval gates for high-impact decisions. Config changes are revisioned — roll back safely.
</td>
<td align="center">
<h3>📊 Org Chart</h3>
Hierarchies, roles, reporting lines. Your agents have a boss, a title, and a job description. Cross-team task delegation with manager escalation protocols and billing code tracking.
</td>
<td align="center">
<h3>📱 Mobile Ready</h3>
Monitor and manage your autonomous businesses from anywhere. Run locally via Tailscale, or deploy to the cloud when you need public access.
</td>
</tr>
</table>

<br/>

## The problem Doer solves

Running AI agents at scale reveals a set of problems that task management tools were never designed to handle:

| Without Doer | With Doer |
| --- | --- |
| ❌ 20 Claude Code tabs, lost context on reboot, no idea who's doing what | ✅ Ticket-based tasks, threaded conversations, persistent sessions across reboots |
| ❌ Manually gather context from multiple places to remind agents what they're working on | ✅ Context flows from task → project → company goal — agents always know what to do and why |
| ❌ Folders of agent configs, re-inventing task management, communication, and coordination | ✅ Org charts, ticketing, delegation, and governance out of the box — you run a company, not a pile of scripts |
| ❌ Runaway loops burn hundreds of dollars before you notice | ✅ Cost tracking surfaces token budgets, throttles agents when they're out, and the board can pause anything instantly |
| ❌ Recurring jobs (customer support, social, reports) require manually kicking them off | ✅ Heartbeats handle regular work on a schedule. Management supervises |
| ❌ Have an idea → find the repo → fire up Claude Code → keep a tab open → babysit it | ✅ Add a task in Doer. Your coding agent works on it until done. You review when ready |
| ❌ Can't tell if an agent is stuck, idle, or working | ✅ Heartbeat health tracking. Every agent's status visible at a glance |
| ❌ No accountability — agent makes a bad decision and no one knows why | ✅ Full audit log. Every decision traced. Every tool call recorded. Immutable. |

<br/>

## Why Doer is different

Orchestrating AI agents is harder than it looks. Doer handles the details correctly:

| | |
| --- | --- |
| **Atomic execution.** | Task checkout and budget enforcement are atomic. No double-work. No runaway spend. |
| **Persistent agent state.** | Agents resume the same task context across heartbeats instead of restarting from scratch. |
| **Runtime skill injection.** | Agents can learn Doer workflows and project context at runtime, without retraining. |
| **Governance with rollback.** | Approval gates are enforced, config changes are revisioned, and bad changes can be rolled back safely. |
| **Goal-aware execution.** | Tasks carry full goal ancestry so agents consistently see the "why," not just a title. |
| **Portable company templates.** | Export/import orgs, agents, and skills with secret scrubbing and collision handling. |
| **True multi-company isolation.** | Every entity is company-scoped. One deployment, many companies, separate data and audit trails. |
| **Progressive disclosure.** | Surface layer: human-readable summary. Middle: checklist/steps/artifacts. Bottom: raw logs/transcripts. |

<br/>

## What Doer is not

Clear boundaries make for better tools:

| | |
| --- | --- |
| **Not a chatbot.** | Agents have jobs, not chat windows. Communication happens through tasks and comments. |
| **Not an agent framework.** | We don't tell you how to build agents. We tell you how to run a company made of them. |
| **Not a workflow builder.** | No drag-and-drop pipelines. Doer models companies — with org charts, goals, budgets, and governance. |
| **Not a prompt manager.** | Agents bring their own prompts, models, and runtimes. Doer manages the organization they work in. |
| **Not a single-agent tool.** | This is for teams. If you have one agent, you probably don't need Doer. If you have twenty — you definitely do. |
| **Not a code review tool.** | Doer orchestrates work, not pull requests. Bring your own review process. |
| **Not a Jira/Linear replacement.** | These tools track human work. Doer coordinates autonomous AI workforces — fundamentally different problems. |

<br/>

## Design principles

Everything in Doer follows these principles, derived from the research in [GOAL.md](doc/GOAL.md) and [PRODUCT.md](doc/PRODUCT.md):

1. **Time-to-first-success under 5 minutes.** Fresh install → CEO completes first task in one sitting.
2. **Board-level abstraction always wins.** Default view answers: what is the company doing, who's doing it, why, what did it cost, what needs approval.
3. **Conversation stays attached to work.** Even "chat with CEO" resolves to strategy threads, decisions, tasks, or approvals.
4. **Progressive disclosure.** Human-readable at surface, detailed beneath. No raw bash logs at the top layer.
5. **Output-first.** Work isn't done until you see the result: file, document, preview link, screenshot, plan, or PR.
6. **Local-first, cloud-ready.** Same mental model whether running solo on localhost or deployed publicly.
7. **Safe autonomy.** Auto mode is allowed; hidden token burn is not.
8. **Thin core, rich edges.** Optional chat, knowledge bases, and specialized surfaces go into plugins — not the control plane.

<br/>

## Quickstart

Open source. Self-hosted. No Doer account required.

```bash
git clone https://github.com/doerai/doer.git
cd doer
pnpm install
pnpm dev
```

Open `http://localhost:3100`. An embedded PostgreSQL database is created automatically — no external setup required.

> **Requirements:** Node.js 20+, pnpm 9+

<br/>

## Deployment modes

Doer supports three deployment profiles, giving you security appropriate to your context:

| Mode | Exposure | Auth | Use case |
| ---- | -------- | ---- | -------- |
| `local_trusted` | loopback only | none | Single-operator local machine |
| `authenticated + private` | LAN / VPN / Tailscale | login required | Private network access |
| `authenticated + public` | internet-facing | login required | Cloud deployment |

Default onboarding is interactive — run `pnpm dev` and Doer guides you through setup. See [DEPLOYMENT-MODES.md](doc/DEPLOYMENT-MODES.md) for the canonical model.

<br/>

## FAQ

**What does a typical setup look like?**
A single Node.js process manages an embedded Postgres and local file storage. For production, point it at your own Postgres and deploy however you like. Configure projects, agents, and goals — the agents take care of the rest.

If you're a solo entrepreneur, use Tailscale to access Doer on the go. Deploy to Vercel or a VPS when you need it public.

**Can I run multiple companies?**
Yes. A single deployment can run an unlimited number of companies with complete data isolation. Run an agency, an internal team, and a startup — all from one dashboard.

**How is Doer different from agents like OpenClaw or Claude Code?**
Doer _uses_ those agents. It orchestrates them into a company — with org charts, budgets, goals, governance, and accountability. Think of it as the difference between having employees and having a company.

**Why should I use Doer instead of pointing my OpenClaw at Asana or Trello?**
Agent orchestration has subtleties that human task management tools don't address: atomic task checkout (preventing double-work), persistent session state (resuming context across heartbeats), budget enforcement (hard-stop on token limits), governance gates (board approval for hires and strategy). Doer does all of these. (Bring-your-own-ticket-system is on the roadmap.)

**Do agents run continuously?**
By default, agents run on scheduled heartbeats and event-based triggers (task assignment, @-mentions). You can also hook in continuous agents like OpenClaw. You bring your agent — Doer coordinates.

**What's the minimum to integrate an agent?**
Be callable. That's it. Doer can invoke you via command or webhook. From there, progressively deepen: status reporting, cost tracking, bidirectional task management. See [SPEC.md](doc/SPEC.md) for the full agent protocol.

**Is this secure?**
In `local_trusted` mode, Doer binds to loopback only. In `authenticated` modes, all endpoints require authentication. Agent API keys are hashed at rest and scoped to their company. Board actions are logged immutably.

<br/>

## Development

```bash
pnpm dev              # Full dev (API + UI, watch mode)
pnpm dev:once         # Single boot, no file watching
pnpm dev:server       # Server only
pnpm build            # Build all packages
pnpm typecheck        # Type-check all packages
pnpm test:run         # Run unit tests
pnpm db:generate      # Compile schema + generate migration
pnpm db:migrate       # Apply pending migrations
```

See [DEVELOPING.md](doc/DEVELOPING.md) for the full development guide. See [DATABASE.md](doc/DATABASE.md) for schema and migration details.

<br/>

## Documentation

| Audience | Guide |
| -------- | ----- |
| Board operators | [Creating a company](docs/guides/board-operator/creating-a-company.md) · [Managing agents](docs/guides/board-operator/managing-agents.md) · [Managing tasks](docs/guides/board-operator/managing-tasks.md) · [Costs & budgets](docs/guides/board-operator/costs-and-budgets.md) · [Approvals](docs/guides/board-operator/approvals.md) · [Import/export](docs/guides/board-operator/importing-and-exporting.md) |
| Agent developers | [Agent Developer Guide](docs/guides/agent-developer/) — adapter contracts, heartbeat protocol, integration levels |
| Self-hosters | [Deployment modes](doc/DEPLOYMENT-MODES.md) · [Docker](doc/DOCKER.md) · [Releasing](doc/RELEASING.md) |
| Contributors | [CONTRIBUTING.md](CONTRIBUTING.md) · [AGENTS.md](AGENTS.md) |

<br/>

## Roadmap

- ✅ Plugin system (knowledge bases, custom tracing, queues)
- ✅ OpenClaw / claw-style agent employees
- ✅ Company import & export
- ✅ AGENTS.md configuration format
- ✅ Skills Manager
- ✅ Scheduled Routines
- ✅ Budget enforcement
- ✅ Desktop App
- ⚪ ClipHub — browse and install pre-built company templates
- ⚪ Artifacts & Deployments — first-class outputs with previews
- ⚪ CEO Chat — conversational strategy interface that resolves to structured decisions
- ⚪ Multiple Human Users — coarse team-level access
- ⚪ Cloud / Sandbox agents (Cursor, e2b)
- ⚪ Cloud deployments (one-click)
- ⚪ Bring-your-own-ticket-system (Linear, Jira, etc.)

<br/>

## Community & Plugins

- [Discord](https://discord.gg/m4HZY7xNG3) — Join the community
- [GitHub Issues](https://github.com/doerai/doer/issues) — Bugs and feature requests
- [GitHub Discussions](https://github.com/doerai/doer/discussions) — Ideas and RFCs
- [awesome-doer](https://github.com/gsxdsm/awesome-doer) — Community plugins and resources

<br/>

## Contributing

We welcome contributions. See the [contributing guide](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for repo conventions, development workflow, and the definition of done.

<br/>

## License

MIT &copy; 2026 Doer

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=doerai/doer&type=date&legend=top-left)](https://www.star-history.com/?repos=doerai%2Fdoer&type=date&legend=top-left)

<br/>

---

<p align="center">
  <img src="doc/assets/footer.jpg" alt="" width="720" />
</p>

<p align="center">
  <sub>Open source under MIT. Built for people who want to run companies, not babysit agents.</sub>
</p>
