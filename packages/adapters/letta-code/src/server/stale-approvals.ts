// ─── Stale Letta cloud approval sweep ───────────────────────────────────────
//
// When a cloud-attached agent's process dies between a client-side tool's
// approval_request and its response, the Letta cloud conversation keeps a
// stale pending approval and rejects every subsequent message with
// 409 PENDING_APPROVAL ("the agent is waiting for approval on a tool call").
// The run then dies within seconds and every heartbeat re-wedges on the same
// stale approval. The only way out is to post an approval response covering
// the exact pending tool call IDs. This module probes for that state and
// denies the stale calls so the next turn can proceed.

export interface StaleApprovalSweepResult {
  /** Tool call IDs that were denied. */
  swept: string[];
}

export interface StaleApprovalSweepOptions {
  agentId: string;
  apiKey: string;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Probe attempts after the denial before giving up. */
  maxPolls?: number;
  pollIntervalMs?: number;
}

const PENDING_APPROVAL_PATTERN = /pending[_ -]?approval|waiting for approval|\b409\b/i;
const NO_PENDING_PATTERN = /no tool call is currently awaiting approval/i;
// Letta reports the pending IDs as a Python-repr list, e.g.
//   Invalid tool call IDs. Expected '['chatcmpl-tool-aaa', 'chatcmpl-tool-bbb']'
const EXPECTED_IDS_PATTERN = /Expected '(\[[^\]]*\])'/;

const PROBE_TOOL_CALL_ID = "chatcmpl-tool-DOERPROBE000";
const DEFAULT_MAX_POLLS = 10;
const DEFAULT_POLL_INTERVAL_MS = 3000;

/** True when an SDK turn failure looks like a stale cloud pending approval. */
export function isPendingApprovalError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return PENDING_APPROVAL_PATTERN.test(message);
}

/** Normalize a configured Letta base URL to include exactly one `/v1` suffix. */
export function normalizeLettaBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return /\/v1$/i.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

type ProbeOutcome =
  | { kind: "clean" }
  | { kind: "wedged"; toolCallIds: string[] }
  | { kind: "unknown" };

function approvalBody(toolCallIds: string[], reason: string): string {
  return JSON.stringify({
    messages: [{
      type: "approval",
      approvals: toolCallIds.map((toolCallId) => ({
        type: "approval",
        approve: false,
        reason,
        tool_call_id: toolCallId,
      })),
    }],
  });
}

function parseExpectedToolCallIds(body: string): string[] | null {
  const match = EXPECTED_IDS_PATTERN.exec(body);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1].replace(/'/g, '"'));
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((id): id is string => typeof id === "string");
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

/**
 * Probe the conversation with a denial for a nonexistent tool call ID. Letta
 * answers 400 either way: "No tool call is currently awaiting approval" when
 * clean, or "Invalid tool call IDs. Expected '[...]'" when wedged.
 */
async function probePendingApproval(
  baseUrl: string,
  options: StaleApprovalSweepOptions,
  fetchImpl: typeof fetch,
): Promise<ProbeOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/agents/${encodeURIComponent(options.agentId)}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey}`,
      },
      body: approvalBody([PROBE_TOOL_CALL_ID], "doer stale-approval probe"),
    });
  } catch {
    return { kind: "unknown" };
  }
  const body = await response.text().catch(() => "");
  if (NO_PENDING_PATTERN.test(body)) return { kind: "clean" };
  const toolCallIds = parseExpectedToolCallIds(body);
  if (toolCallIds) return { kind: "wedged", toolCallIds };
  return { kind: "unknown" };
}

/**
 * Deny any stale pending approval on the agent's cloud conversation.
 *
 * Returns the denied tool call IDs once the conversation probes clean, or
 * null when the agent is not wedged or the sweep could not complete (missing
 * vessel, credits exhausted, unexpected API shape — the caller rethrows the
 * original error in those cases).
 */
export async function sweepStaleApprovals(
  options: StaleApprovalSweepOptions,
): Promise<StaleApprovalSweepResult | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const maxPolls = options.maxPolls ?? DEFAULT_MAX_POLLS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const baseUrl = normalizeLettaBaseUrl(options.apiBaseUrl);

  const initial = await probePendingApproval(baseUrl, options, fetchImpl);
  if (initial.kind !== "wedged") return null;

  // The denial must cover every pending tool call ID in one request.
  let denial: Response;
  try {
    denial = await fetchImpl(`${baseUrl}/agents/${encodeURIComponent(options.agentId)}/messages/async`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey}`,
      },
      body: approvalBody(initial.toolCallIds, "doer: auto-denied stale approval after interrupted run"),
    });
  } catch {
    return null;
  }
  if (!denial.ok) return null;

  // The async denial takes a moment to clear the pending state; poll the
  // probe until the conversation reports no pending approval.
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await sleep(pollIntervalMs);
    const outcome = await probePendingApproval(baseUrl, options, fetchImpl);
    if (outcome.kind === "clean") return { swept: initial.toolCallIds };
    if (outcome.kind === "unknown") return null;
  }
  return null;
}
