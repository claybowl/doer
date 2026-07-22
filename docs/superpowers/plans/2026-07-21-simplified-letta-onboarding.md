# Simplified Letta Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the multi-agent/team onboarding flow with a two-step company-name and local Letta-agent setup while preserving Doer’s existing visual presentation.

**Architecture:** Keep `SpinupOnboarding` and its `MachineBackdrop`/`spinup.css` presentation layer, but reduce its state machine to company setup and one Letta agent. Use the existing `POST /companies/:companyId/agents` contract with `adapterType: "letta_code"` and `backend: "local"`; the server already provisions the default persistent MemFS memory binding for this adapter. Do not create teams, goals, projects, directives, or starter issues.

**Tech Stack:** React, TypeScript, TanStack Query, existing Doer API clients, Vitest, pnpm.

---

### Task 1: Add focused onboarding launch helpers/tests

**Files:**
- Create: `ui/src/lib/simplified-onboarding.ts`
- Test: `ui/src/lib/simplified-onboarding.test.ts`

- [ ] Add pure helpers that return the exact company payload and local Letta agent payload, plus a helper that chooses the post-creation company route from `issuePrefix`.
- [ ] Test that the agent payload is `letta_code`, uses `backend: "local"`, enables mods, uses standard permissions, and contains no cloud key or team/task fields.
- [ ] Test that whitespace-only names are rejected by the validation helper and that route output is company-prefixed.

### Task 2: Replace the seven-step Spin-up flow

**Files:**
- Modify: `ui/src/onboarding/SpinupOnboarding.tsx`
- Modify: `ui/src/App.tsx:249-285`

- [ ] Remove team, trio, directive, goal, project, issue, and team-import imports/state/templates/launch calls from `SpinupOnboarding`.
- [ ] Keep `MachineBackdrop`, `GearEyeBlue`, telemetry widgets, animation phases, close behavior, and `spinup.css`.
- [ ] Implement two form steps: required company name, then agent name defaulting to `Letta`.
- [ ] On launch, create/reuse the company, create exactly one local `letta_code` agent, and navigate to the company home after the existing surge/online presentation.
- [ ] Preserve retry safety: after company creation, retain its ID so an agent-creation failure retries only the agent instead of duplicating the company.
- [ ] Show inline errors and disable submit while requests are active; do not navigate on failure.
- [ ] Update the route page copy/button so it describes creating a company and Letta agent, not a starter task.

### Task 3: Verify the change

**Files:**
- No additional files.

- [ ] Run `pnpm --filter @doerai/ui typecheck`.
- [ ] Run `pnpm --filter @doerai/ui build`.
- [ ] Run the focused onboarding tests and inspect `git diff` to confirm the unrelated routine fix remains untouched.
- [ ] If the running dev server reloads successfully, verify `/onboarding` shows only the two-step flow on port `3101`.
