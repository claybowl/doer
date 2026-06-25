import { describe, expect, it } from "vitest";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import { buildWakeMessage } from "@doerai/adapter-letta-cloud/server";

/**
 * Unit tests for the wake-message builder. These lock in the
 * Constitution-aligned behavior added 2026-04-26: when the heartbeat
 * context names a task, the agent is given a TASK MODE wake that
 * overrides their queue-review heartbeatPrompt; otherwise it falls
 * through to a QUEUE REVIEW preamble + the existing prompt.
 *
 * The bug we're guarding against: Dondog ran his standard queue-review
 * protocol on a wake where DON-380 was waiting for him, because the
 * wake message made no mention of an assigned task. See
 * `doc/plans/2026-04-25-heartbeat-orchestration.md` (Pattern A).
 */

function makeCtx(
  context: Record<string, unknown>,
  agentName = "Dondog",
): AdapterExecutionContext {
  return {
    runId: "run-1",
    agent: { id: "agent-1", name: agentName, companyId: "company-1" },
    runtime: {} as never,
    config: {} as never,
    context,
    onLog: async () => undefined,
  } as unknown as AdapterExecutionContext;
}

describe("letta-cloud buildWakeMessage", () => {
  it("emits TASK MODE when context.taskKey is set", () => {
    const ctx = makeCtx({
      taskKey: "DON-380",
      taskId: "uuid-380",
      wakeReason: "issue_assigned",
    });
    const msg = buildWakeMessage(ctx, "[PAPERCLIP HEARTBEAT] queue review");

    expect(msg).toContain("[DOER HEARTBEAT — TASK MODE]");
    expect(msg).toContain("YOUR TASK: DON-380");
    expect(msg).toContain("WAKE REASON: issue_assigned");
    // The base queue-review message MUST NOT leak into TASK MODE,
    // otherwise it competes with the issue body for salience.
    expect(msg).not.toContain("queue review");
    // Constitution reference is required so the agent knows wake
    // context outranks memory blocks.
    expect(msg).toContain("Constitution");
  });

  it("falls back to taskId, then issueId, when taskKey is absent", () => {
    const onlyTaskId = buildWakeMessage(
      makeCtx({ taskId: "uuid-task" }),
      "base",
    );
    expect(onlyTaskId).toContain("YOUR TASK: uuid-task");

    const onlyIssueId = buildWakeMessage(
      makeCtx({ issueId: "uuid-issue" }),
      "base",
    );
    expect(onlyIssueId).toContain("YOUR TASK: uuid-issue");
  });

  it("includes triggering comment id when present", () => {
    const msg = buildWakeMessage(
      makeCtx({ taskKey: "DON-1", wakeCommentId: "comment-xyz" }),
      "base",
    );
    expect(msg).toContain("TRIGGERING COMMENT: comment-xyz");
  });

  it("emits QUEUE REVIEW preamble + base message when no task is named", () => {
    const ctx = makeCtx({ wakeReason: "timer_tick" }, "Dondog");
    const msg = buildWakeMessage(ctx, "[PAPERCLIP HEARTBEAT] do the protocol");

    expect(msg).toContain("[DOER HEARTBEAT — QUEUE REVIEW MODE]");
    expect(msg).toContain("Dondog");
    // The agent MUST be told to look for assigned issues before
    // doing meta-management. This is the periodic-wake corrective.
    expect(msg.toLowerCase()).toContain("assigned");
    // Original heartbeatPrompt is preserved at the bottom.
    expect(msg).toContain("[PAPERCLIP HEARTBEAT] do the protocol");
  });

  it("falls back to 'agent' when agent name is missing", () => {
    const ctx = {
      runId: "run-1",
      agent: undefined,
      context: {},
      onLog: async () => undefined,
    } as unknown as AdapterExecutionContext;
    const msg = buildWakeMessage(ctx, "base");
    expect(msg).toContain("(agent) have been woken");
  });

  it("treats whitespace-only context fields as absent", () => {
    const msg = buildWakeMessage(
      makeCtx({ taskKey: "   ", taskId: "" }),
      "queue base",
    );
    // No real task → falls through to QUEUE REVIEW
    expect(msg).toContain("QUEUE REVIEW MODE");
    expect(msg).not.toContain("TASK MODE");
  });

  it("inlines issue title and description when injected by heartbeat", () => {
    const ctx = makeCtx({
      taskKey: "DON-500",
      wakeReason: "issue_assigned",
      issueTitle: "Fix the widget crash",
      issueDescription: "The widget crashes on null input.\n\nSteps to reproduce:\n1. Open widget\n2. Submit empty form",
    });
    const msg = buildWakeMessage(ctx, "base");

    expect(msg).toContain("TITLE: Fix the widget crash");
    expect(msg).toContain("── ISSUE BODY ──");
    expect(msg).toContain("The widget crashes on null input.");
    // No fallback read instruction when description is present
    expect(msg).not.toContain("Read the issue body for DON-500");
  });

  it("falls back to read instruction when no description is injected", () => {
    const ctx = makeCtx({ taskKey: "DON-501", wakeReason: "issue_assigned" });
    const msg = buildWakeMessage(ctx, "base");

    expect(msg).not.toContain("── ISSUE BODY ──");
    expect(msg).toContain("Read the issue body for DON-501");
  });
});
