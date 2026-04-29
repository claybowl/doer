# Open-source orchestration for autonomous AI companies

**If OpenClaw is an _employee_, Doer is the _company_.**

Doer is a Node.js server and React UI that orchestrates a team of AI agents to run a business. Bring your own agents, assign goals, and track your agents' work and costs from one dashboard.

It looks like a task manager — but under the hood it has org charts, budgets, governance, goal alignment, and agent coordination.

**Manage business goals, not pull requests.**

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

<em>If it can receive a heartbeat, it's hired.</em>

</div>

<br/>

## Doer is right for you if

- ✅ You want to build **autonomous AI companies**
- ✅ You **coordinate many different agents** (OpenClaw, Codex, Claude, Cursor) toward a common goal
- ✅ You have **20 simultaneous Claude Code terminals** open and lose track of what everyone is doing
- ✅ You want agents running **autonomously 24/7**, but still want to audit work and chime in when needed
- ✅ You want to **monitor costs** and enforce budgets
- ✅ You want a process for managing agents that **feels like using a task manager**
- ✅ You want to manage your autonomous businesses **from your phone**

<br/>

## Features

<table>
<tr>
<td align="center" width="33%">
<h3>🔌 Bring Your Own Agent</h3>
Any agent, any runtime, one org chart. If it can receive a heartbeat, it's hired.
</td>
<td align="center" width="33%">
<h3>🎯 Goal Alignment</h3>
Every task traces back to the company mission. Agents know <em>what</em> to do and <em>why</em>.
</td>
<td align="center" width="33%">
<h3>💓 Heartbeats</h3>
Agents wake on a schedule, check work, and act. Delegation flows up and down the org chart.
</td>
</tr>
<tr>
<td align="center">
<h3>💰 Cost Control</h3>
Monthly budgets per agent. When they hit the limit, they stop. No runaway costs.
</td>
<td align="center">
<h3>🏢 Multi-Company</h3>
One deployment, many companies. Complete data isolation. One control plane for your portfolio.
</td>
<td align="center">
<h3>🎫 Ticket System</h3>
Every conversation traced. Every decision explained. Full tool-call tracing and immutable audit log.
</td>
</tr>
<tr>
<td align="center">
<h3>🛡️ Governance</h3>
You're the board. Approve hires, override strategy, pause or terminate any agent — at any time.
</td>
<td align="center">
<h3>📊 Org Chart</h3>
Hierarchies, roles, reporting lines. Your agents have a boss, a title, and a job description.
</td>
<td align="center">
<h3>📱 Mobile Ready</h3>
Monitor and manage your autonomous businesses from anywhere.
</td>
</tr>
</table>

<br/>

## Problems Doer solves

| Without Doer | With Doer |
| --- | --- |
| ❌ You have 20 Claude Code tabs open and can't track which one does what. On reboot you lose everything. | ✅ Tasks are ticket-based, conversations are threaded, sessions persist across reboots. |
| ❌ You manually gather context from several places to remind your bot what you're actually doing. | ✅ Context flows from the task up through the project and company goals — your agent always knows what to do and why. |
| ❌ Folders of agent configs are disorganized and you're re-inventing task management, communication, and coordination between agents. | ✅ Doer gives you org charts, ticketing, delegation, and governance out of the box — so you run a company, not a pile of scripts. |
| ❌ Runaway loops waste hundreds of dollars of tokens and max your quota before you even know what happened. | ✅ Cost tracking surfaces token budgets and throttles agents when they're out. Management prioritizes with budgets. |
| ❌ You have recurring jobs (customer support, social, reports) and have to remember to manually kick them off. | ✅ Heartbeats handle regular work on a schedule. Management supervises. |
| ❌ You have an idea, you have to find your repo, fire up Claude Code, keep a tab open, and babysit it. | ✅ Add a task in Doer. Your coding agent works on it until it's done. Management reviews their work. |

<br/>

## Why Doer is special

Doer handles the hard orchestration details correctly.

| | |
| --- | --- |
| **Atomic execution.** | Task checkout and budget enforcement are atomic, so no double-work and no runaway spend. |
| **Persistent agent state.** | Agents resume the same task context across heartbeats instead of restarting from scratch. |
| **Runtime skill injection.** | Agents can learn Doer workflows and project context at runtime, without retraining. |
| **Governance with rollback.** | Approval gates are enforced, config changes are revisioned, and bad changes can be rolled back safely. |
| **Goal-aware execution.** | Tasks carry full goal ancestry so agents consistently see the "why," not just a title. |
| **Portable company templates.** | Export/import orgs, agents, and skills with secret scrubbing and collision handling. |
| **True multi-company isolation.** | Every entity is company-scoped, so one deployment can run many companies with separate data and audit trails. |

<br/>

## What Doer is not

| | |
| --- | --- |
| **Not a chatbot.** | Agents have jobs, not chat windows. |
| **Not an agent framework.** | We don't tell you how to build agents. We tell you how to run a company made of them. |
| **Not a workflow builder.** | No drag-and-drop pipelines. Doer models companies — with org charts, goals, budgets, and governance. |
| **Not a prompt manager.** | Agents bring their own prompts, models, and runtimes. Doer manages the organization they work in. |
| **Not a single-agent tool.** | This is for teams. If you have one agent, you probably don't need Doer. If you have twenty — you definitely do. |
| **Not a code review tool.** | Doer orchestrates work, not pull requests. Bring your own review process. |

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

## FAQ

**What does a typical setup look like?**
A single Node.js process manages an embedded Postgres and local file storage. For production, point it at your own Postgres and deploy however you like. Configure projects, agents, and goals — the agents take care of the rest.

If you're a solo entrepreneur, use Tailscale to access Doer on the go. Deploy to Vercel or a VPS when you need it public.

**Can I run multiple companies?**
Yes. A single deployment can run an unlimited number of companies with complete data isolation.

**How is Doer different from agents like OpenClaw or Claude Code?**
Doer _uses_ those agents. It orchestrates them into a company — with org charts, budgets, goals, governance, and accountability.

**Why should I use Doer instead of pointing my OpenClaw at Asana or Trello?**
Agent orchestration has subtleties: coordinating who has work checked out, maintaining sessions, monitoring costs, establishing governance. Doer does all of this. (Bring-your-own-ticket-system is on the roadmap.)

**Do agents run continuously?**
By default, agents run on scheduled heartbeats and event-based triggers (task assignment, @-mentions). You can also hook in continuous agents like OpenClaw. You bring your agent — Doer coordinates.

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

See [doc/DEVELOPING.md](doc/DEVELOPING.md) for the full development guide.

<br/>

## Roadmap

- ✅ Plugin system (add a knowledge base, custom tracing, queues, etc.)
- ✅ OpenClaw / claw-style agent employees
- ✅ Company import & export
- ✅ AGENTS.md configuration format
- ✅ Skills Manager
- ✅ Scheduled Routines
- ✅ Budget enforcement
- ⚪ Clipmart — browse and install pre-built company templates
- ⚪ Artifacts & Deployments
- ⚪ CEO Chat
- ⚪ Multiple Human Users
- ⚪ Cloud / Sandbox agents (Cursor, e2b)
- ⚪ Cloud deployments
- ⚪ Desktop App

<br/>

## Community & Plugins

Find plugins and more at [awesome-doer](https://github.com/gsxdsm/awesome-doer).

## Contributing

We welcome contributions. See the [contributing guide](CONTRIBUTING.md) for details.

<br/>

## Community

- [Discord](https://discord.gg/m4HZY7xNG3) — Join the community
- [GitHub Issues](https://github.com/doerai/doer/issues) — bugs and feature requests
- [GitHub Discussions](https://github.com/doerai/doer/discussions) — ideas and RFCs

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
