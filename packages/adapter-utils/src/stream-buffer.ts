// ─── StreamTokenBuffer — Shared stream token accumulator ───────────────────
//
// Consolidates consecutive partial-token chunks of the same kind ("assistant"
// or "reasoning") into a single transcript entry. This avoids the UI rendering
// each chunk as a separate node — which inserts whitespace between words
// (e.g. "Heart" + "beat" → "Heart beat").
//
// This mirrors the trajectory format's approach to normalizing streaming
// output: partial tokens are accumulated into complete records before
// emission. See doc/plans/2026-07-31-acp-a2a-trajectory-analysis.md §4.
//
// Design goals:
// - Zero async: callers control when to flush (via `flush()` or by reading
//   `getBuffered()`). The async `emit()` call lives in the adapter, not here.
// - Synchronous append is cheap and allocation-free for the flush path.
// - `entries` array collects flushed records for trajectory assembly.

export type StreamKind = "assistant" | "reasoning";

export interface StreamTokenEntry {
  type: "assistant_message" | "reasoning_message";
  content: string;
}

export class StreamTokenBuffer {
  private buffer: { kind: StreamKind; text: string } | null = null;

  /** Flushed entries, in arrival order. Call `reset()` to clear. */
  readonly entries: StreamTokenEntry[] = [];

  /** Whether there is currently buffered text of any kind. */
  get isBuffered(): boolean {
    return this.buffer !== null && this.buffer.text.length > 0;
  }

  /** Peek at the current buffer without flushing. Returns null if empty. */
  getBuffered(): StreamTokenEntry | null {
    if (!this.buffer || this.buffer.text.length === 0) return null;
    return {
      type: this.buffer.kind === "assistant" ? "assistant_message" : "reasoning_message",
      content: this.buffer.text,
    };
  }

  /**
   * Append a streaming delta. If `kind` differs from the currently-buffered
   * kind, the buffer is flushed first (the caller should then emit the
   * returned entry).
   *
   * Returns the flushed entry if a kind change triggered a flush, or null
   * if nothing was flushed (the text was simply accumulated).
   */
  appendDelta(kind: StreamKind, text: string): StreamTokenEntry | null {
    if (!text) return null;
    if (this.buffer && this.buffer.kind !== kind) {
      return this.flush();
    }
    if (!this.buffer) {
      this.buffer = { kind, text: "" };
    }
    this.buffer.text += text;
    return null;
  }

  /**
   * Flush the current buffer into `entries` and return the flushed entry.
   * Returns null if the buffer was empty.
   */
  flush(): StreamTokenEntry | null {
    if (!this.buffer || this.buffer.text.length === 0) {
      this.buffer = null;
      return null;
    }
    const entry: StreamTokenEntry = {
      type: this.buffer.kind === "assistant" ? "assistant_message" : "reasoning_message",
      content: this.buffer.text,
    };
    this.entries.push(entry);
    this.buffer = null;
    return entry;
  }

  /** Clear buffer and entries. */
  reset(): void {
    this.buffer = null;
    this.entries.length = 0;
  }

  // ── SDK prefix-match support ─────────────────────────────────────────────
  //
  // Some SDK streaming APIs (notably @letta-ai/letta-agent-sdk) send BOTH
  // incremental delta events AND full-content events where the full content
  // starts with the already-accumulated delta text. This method handles
  // that pattern: it checks the buffered prefix against the full content,
  // returning only the delta (remainder) to emit. If the prefix doesn't
  // match, the full content is emitted as-is.
  //
  // After calling, the buffer is updated to the full content (or flushed
  // if the event is for a different kind).

  /**
   * Match a full-content streaming event against the accumulated delta buffer.
   *
   * @returns The text that was NOT yet emitted (the "remainder"), or null
   *          if nothing should be emitted (the full content was already
   *          seen as deltas). Returns the full content if there was no
   *          buffer or the prefix didn't match.
   */
  matchFullAndConsume(kind: StreamKind, fullContent: string): string | null {
    if (!fullContent) return null;

    if (!this.buffer || this.buffer.text.length === 0) {
      // No buffer — buffer the content in case future deltas match
      this.buffer = { kind, text: fullContent };
      return fullContent;
    }

    if (this.buffer.kind !== kind) {
      // Different kind — flush current, start fresh
      this.flush();
      this.buffer = { kind, text: fullContent };
      return fullContent;
    }

    // Same kind — check if full content starts with buffered content
    if (fullContent.startsWith(this.buffer.text)) {
      const remainder = fullContent.slice(this.buffer.text.length);
      this.buffer.text = fullContent; // advance buffer to full content
      return remainder || null; // return null for empty remainder
    }

    // Prefix doesn't match — flush and emit full content
    this.flush();
    this.buffer = { kind, text: fullContent };
    return fullContent;
  }
}
