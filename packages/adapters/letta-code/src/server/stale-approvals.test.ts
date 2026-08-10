import { describe, expect, it, vi } from "vitest";
import {
  isPendingApprovalError,
  normalizeLettaBaseUrl,
  sweepStaleApprovals,
} from "./stale-approvals.js";

function stubResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response;
}

function fetchSequence(...responses: Response[]): ReturnType<typeof vi.fn> {
  const queue = [...responses];
  return vi.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra fetch call");
    return next;
  });
}

const CLEAN_PROBE = stubResponse(400, "Cannot process approval response: No tool call is currently awaiting approval");
const BASE_OPTIONS = {
  agentId: "agent-abc",
  apiKey: "letta-key",
  apiBaseUrl: "https://api.letta.com",
  sleep: async () => undefined,
  pollIntervalMs: 0,
};

describe("isPendingApprovalError", () => {
  it("matches Letta 409 pending-approval failures", () => {
    expect(isPendingApprovalError(new Error("Request failed with status 409 PENDING_APPROVAL: the agent is waiting for approval on a tool call"))).toBe(true);
    expect(isPendingApprovalError(new Error("waiting for approval on a tool call"))).toBe(true);
    expect(isPendingApprovalError("409")).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(isPendingApprovalError(new Error("conversation not found"))).toBe(false);
    expect(isPendingApprovalError(new Error("402 payment required"))).toBe(false);
  });
});

describe("normalizeLettaBaseUrl", () => {
  it("appends /v1 when missing", () => {
    expect(normalizeLettaBaseUrl("https://api.letta.com")).toBe("https://api.letta.com/v1");
    expect(normalizeLettaBaseUrl("https://api.letta.com/")).toBe("https://api.letta.com/v1");
  });

  it("does not double-append /v1", () => {
    expect(normalizeLettaBaseUrl("https://api.letta.com/v1")).toBe("https://api.letta.com/v1");
    expect(normalizeLettaBaseUrl("https://api.letta.com/v1/")).toBe("https://api.letta.com/v1");
  });
});

describe("sweepStaleApprovals", () => {
  it("returns null without further calls when the conversation is clean", async () => {
    const fetchImpl = fetchSequence(CLEAN_PROBE);
    const result = await sweepStaleApprovals({ ...BASE_OPTIONS, fetchImpl });
    expect(result).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.letta.com/v1/agents/agent-abc/messages");
  });

  it("denies every pending tool call ID and polls until clean", async () => {
    const fetchImpl = fetchSequence(
      stubResponse(400, "Invalid tool call IDs. Expected '['chatcmpl-tool-aaa', 'chatcmpl-tool-bbb']'"),
      stubResponse(200, '{"id":"run-1"}'),
      CLEAN_PROBE,
    );
    const result = await sweepStaleApprovals({ ...BASE_OPTIONS, fetchImpl });

    expect(result).toEqual({ swept: ["chatcmpl-tool-aaa", "chatcmpl-tool-bbb"] });
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    const [denialUrl, denialInit] = fetchImpl.mock.calls[1];
    expect(denialUrl).toBe("https://api.letta.com/v1/agents/agent-abc/messages/async");
    const denialBody = JSON.parse(String((denialInit as RequestInit).body));
    expect(denialBody.messages[0].approvals).toEqual([
      { type: "approval", approve: false, reason: "doer: auto-denied stale approval after interrupted run", tool_call_id: "chatcmpl-tool-aaa" },
      { type: "approval", approve: false, reason: "doer: auto-denied stale approval after interrupted run", tool_call_id: "chatcmpl-tool-bbb" },
    ]);
    expect((denialInit as RequestInit).headers).toMatchObject({ authorization: "Bearer letta-key" });
  });

  it("returns null when the probe hits an unexpected state (missing vessel, credits)", async () => {
    for (const response of [
      stubResponse(404, "agent not found"),
      stubResponse(402, "insufficient credits"),
      stubResponse(500, "internal error"),
    ]) {
      const fetchImpl = fetchSequence(response);
      const result = await sweepStaleApprovals({ ...BASE_OPTIONS, fetchImpl });
      expect(result).toBeNull();
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it("returns null when the denial request fails", async () => {
    const fetchImpl = fetchSequence(
      stubResponse(400, "Invalid tool call IDs. Expected '['chatcmpl-tool-aaa']'"),
      stubResponse(500, "denial exploded"),
    );
    const result = await sweepStaleApprovals({ ...BASE_OPTIONS, fetchImpl });
    expect(result).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns null when the conversation stays wedged after the denial", async () => {
    const wedged = stubResponse(400, "Invalid tool call IDs. Expected '['chatcmpl-tool-aaa']'");
    const fetchImpl = fetchSequence(
      wedged,
      stubResponse(200, '{"id":"run-1"}'),
      wedged,
      wedged,
    );
    const result = await sweepStaleApprovals({ ...BASE_OPTIONS, fetchImpl, maxPolls: 2 });
    expect(result).toBeNull();
  });
});
