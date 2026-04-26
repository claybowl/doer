import { describe, expect, it } from "vitest";
import { scanRunForHallucinatedDeliverable } from "../services/deliverable-scanner.js";

/**
 * Lock-in tests for the deliverable post-run scanner.
 *
 * The scanner is a heuristic safety net for the failure mode where an
 * agent's transcript claims a deliverable was produced but no
 * produce_deliverable tool call ever fires (Pope Orby smoke test
 * 2026-04-25). Tests cover both the obvious passes and the trickier
 * edge cases that would tempt false positives.
 */

describe("scanRunForHallucinatedDeliverable", () => {
  it("flags a claim of file production when produce_deliverable was never called", () => {
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt:
        "I have created the report.docx and it is ready for download.",
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(true);
    expect(result.evidence.toolCallSeen).toBe(false);
    expect(result.evidence.deliverableEventSeen).toBe(false);
    expect(result.evidence.claimSnippets.length).toBeGreaterThan(0);
  });

  it("clears a run that called produce_deliverable, even with claim language", () => {
    const stdout = [
      `{"type":"tool_call_message","name":"produce_deliverable","input":{"kind":"docx","filename":"r.docx"}}`,
      "I produced the report.docx and shipped it.",
    ].join("\n");
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: stdout,
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(false);
    expect(result.evidence.toolCallSeen).toBe(true);
  });

  it("clears a run when the deliverable side-effect log line is present", () => {
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: "[deliverable] stored id=abc-123 title=\"Report\"",
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(false);
    expect(result.evidence.deliverableEventSeen).toBe(true);
  });

  it("clears a run with no claim language and no tool call (nothing to flag)", () => {
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: "Looked at the queue. No assigned work this heartbeat.",
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(false);
    expect(result.evidence.claimSnippets).toHaveLength(0);
  });

  it("ignores claim-like text in noise lines (tool call JSON, instrumentation)", () => {
    const stdout = [
      `[doer] Removed maintainer-only OpenCode skill "report" from /skills`,
      `{"type":"tool_return_message","tool_return":"file ready: report.docx"}`,
    ].join("\n");
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: stdout,
      stderrExcerpt: "",
    });
    // Both lines look claim-shaped but they're our own/structured —
    // they're filtered out by the noise-line patterns.
    expect(result.suspicious).toBe(false);
  });

  it("flags 'spreadsheet is attached' style claims (deliverable noun + ready affirmative)", () => {
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: "The spreadsheet is attached for your review.",
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(true);
    expect(result.evidence.claimSnippets[0]).toContain("spreadsheet");
  });

  it("caps claim snippets at 3 to prevent payload bloat", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `I created file-${i}.docx for you.`);
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: lines.join("\n"),
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(true);
    expect(result.evidence.claimSnippets.length).toBeLessThanOrEqual(3);
  });

  it("truncates very long snippets to keep payload size bounded", () => {
    const longClaim = `I shipped the deliverable: ${"x".repeat(500)}.docx`;
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: longClaim,
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(true);
    expect(result.evidence.claimSnippets[0]?.length).toBeLessThanOrEqual(200);
    expect(result.evidence.claimSnippets[0]).toContain("...");
  });

  it("handles empty inputs without throwing", () => {
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: "",
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(false);
    expect(result.evidence.claimSnippets).toHaveLength(0);
  });

  it("scans stderr in addition to stdout", () => {
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: "",
      stderrExcerpt: "Generated the report.pdf successfully.",
    });
    expect(result.suspicious).toBe(true);
  });

  it("does not flag bare 'file' mentions without a production verb or affirmative", () => {
    const result = scanRunForHallucinatedDeliverable({
      stdoutExcerpt: "Looking at the source file to understand the structure.",
      stderrExcerpt: "",
    });
    expect(result.suspicious).toBe(false);
  });
});
