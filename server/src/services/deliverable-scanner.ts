/**
 * Deliverable post-run scanner — detects runs where the agent CLAIMED to
 * produce a deliverable but never actually called the produce_deliverable
 * tool. Pope Orby's failure mode (smoke test 2026-04-25) in concrete form:
 * the agent wrote "I've produced the .docx" in a comment without ever
 * invoking the tool that ships the file.
 *
 * This is the "deferred safety net" from the deliverables-track-a plan.
 * Heuristic-based — will have false positives. The strategy is to LOG
 * suspicious runs as a warning event the user can audit, not to block
 * or fail them. Once we observe accuracy in the wild we can tighten
 * thresholds, post issue comments, or block run completion.
 *
 * Inputs are the in-memory stdout/stderr excerpts that the adapter
 * writes during execution. They're length-capped (MAX_EXCERPT_BYTES)
 * but typically capture both the assistant's natural-language claims
 * and the tool_call_message JSON lines from streaming adapters. If
 * the buffer was truncated and we missed the tool call, we err on
 * the side of flagging — false positives are recoverable, silent
 * hallucinations are not.
 */

const FILE_EXTENSION_REGEX = /\.(docx|xlsx|pdf|pptx|csv|html|json|md|png|jpg)\b/i;

const PRODUCED_VERB_REGEX =
  /\b(produced|created|shipped|delivered|generated|wrote|built|saved|attached|exported|crafted|assembled|prepared)\b/i;

const DELIVERABLE_NOUN_REGEX =
  /\b(deliverable|file|document|spreadsheet|report|brief|proposal|presentation|template|export)\b/i;

const READY_AFFIRMATIVE_REGEX = /\b(ready|attached|complete|finished|done|here|available)\b/i;

// Lines we should ignore when scanning for "claims" — these are our own
// instrumentation or structured tool-call JSON, not the agent's prose.
const NOISE_LINE_PATTERNS = [
  /"tool_call_message"/,
  /"tool_return_message"/,
  /"reasoning_message"/,
  /^\[deliverable\]/m,
  /^\[doer\]/m,
  /^\[letta-cloud\]/m,
];

export interface DeliverableScanResult {
  /** True if the heuristic believes the run claimed a deliverable that never shipped. */
  suspicious: boolean;
  /** Human-readable reason, populated when suspicious. */
  reason?: string;
  /** Audit evidence — what the scanner found. Useful for investigating false positives. */
  evidence: {
    claimSnippets: string[];
    toolCallSeen: boolean;
    deliverableEventSeen: boolean;
  };
}

export interface DeliverableScanInput {
  stdoutExcerpt: string;
  stderrExcerpt: string;
}

/**
 * Scan a finished run's stdout/stderr for the hallucinated-deliverable
 * pattern. Returns a verdict + audit evidence; the caller decides what
 * to do (typically: append a warning run event when suspicious=true).
 */
export function scanRunForHallucinatedDeliverable(
  input: DeliverableScanInput,
): DeliverableScanResult {
  const stdout = input.stdoutExcerpt ?? "";
  const stderr = input.stderrExcerpt ?? "";
  const text = `${stdout}\n${stderr}`;

  // Did produce_deliverable get called? Two signals:
  //   1. The literal tool name in any line (covers most adapters that
  //      log tool calls inline).
  //   2. The deliverable side-effect log line we emit when the
  //      letta-cloud adapter successfully POSTs the file to Doer.
  const toolCallSeen = /\bproduce_deliverable\b/.test(text);
  const deliverableEventSeen = /\[deliverable\] stored id=/.test(stdout);

  // Already-shipped runs are not suspicious — we trust the tool call.
  if (toolCallSeen || deliverableEventSeen) {
    return {
      suspicious: false,
      evidence: { claimSnippets: [], toolCallSeen, deliverableEventSeen },
    };
  }

  // Find lines that read like the agent claiming file production.
  const claimSnippets: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (NOISE_LINE_PATTERNS.some((re) => re.test(line))) continue;

    const hasFilename = FILE_EXTENSION_REGEX.test(line);
    const hasProducedVerb = PRODUCED_VERB_REGEX.test(line);
    const hasDeliverableNoun = DELIVERABLE_NOUN_REGEX.test(line);
    const hasReadyAffirmative = READY_AFFIRMATIVE_REGEX.test(line);

    // Two ways the line "looks like" a deliverable claim:
    //   A) An action verb + a filename or deliverable noun
    //      ("I created the report.docx" / "shipped the deliverable")
    //   B) A deliverable noun + a ready/done affirmative
    //      ("the document is ready" / "spreadsheet is attached")
    const looksLikeClaim =
      (hasProducedVerb && (hasFilename || hasDeliverableNoun)) ||
      (hasDeliverableNoun && hasReadyAffirmative);

    if (looksLikeClaim) {
      // Cap snippet length so the warning event payload doesn't bloat.
      claimSnippets.push(line.length > 200 ? `${line.slice(0, 197)}...` : line);
      if (claimSnippets.length >= 3) break;
    }
  }

  if (claimSnippets.length === 0) {
    return {
      suspicious: false,
      evidence: { claimSnippets: [], toolCallSeen: false, deliverableEventSeen: false },
    };
  }

  return {
    suspicious: true,
    reason:
      "Run text contains language suggesting a deliverable was produced, but produce_deliverable was never called. Possible hallucination — verify the deliverable shipped.",
    evidence: {
      claimSnippets,
      toolCallSeen: false,
      deliverableEventSeen: false,
    },
  };
}
