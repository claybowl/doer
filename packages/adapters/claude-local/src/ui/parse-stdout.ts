import type { TranscriptEntry } from "@doerai/adapter-utils";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function errorText(value: unknown): string {
  if (typeof value === "string") return value;
  const rec = asRecord(value);
  if (!rec) return "";
  const msg =
    (typeof rec.message === "string" && rec.message) ||
    (typeof rec.error === "string" && rec.error) ||
    (typeof rec.code === "string" && rec.code) ||
    "";
  if (msg) return msg;
  try {
    return JSON.stringify(rec);
  } catch {
    return "";
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseClaudeStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const parsed = asRecord(safeJsonParse(line));
  if (!parsed) {
    return [{ kind: "stdout", ts, text: line }];
  }

  const type = typeof parsed.type === "string" ? parsed.type : "";
  if (type === "system" && parsed.subtype === "init") {
    return [
      {
        kind: "init",
        ts,
        model: typeof parsed.model === "string" ? parsed.model : "unknown",
        sessionId: typeof parsed.session_id === "string" ? parsed.session_id : "",
      },
    ];
  }

  // Other system subtypes (hook_started, hook_response, status, post_turn_summary,
  // ...) carry no user-facing dialogue. Drop them so they don't render as raw JSON
  // noise in the transcript.
  if (type === "system") {
    return [];
  }

  // Partial-message streaming: when invoked with --include-partial-messages,
  // Claude emits incremental Anthropic stream events. Render text/thinking deltas
  // live (marked delta:true so the transcript builder coalesces them). The complete
  // "assistant" message that follows omits text/thinking (handled below) to avoid
  // double-rendering — deltas are the source of truth for readable text.
  if (type === "stream_event") {
    const event = asRecord(parsed.event);
    if (!event) return [];
    if (event.type === "content_block_delta") {
      const delta = asRecord(event.delta);
      if (!delta) return [];
      if (delta.type === "text_delta") {
        const text = typeof delta.text === "string" ? delta.text : "";
        return text ? [{ kind: "assistant", ts, text, delta: true }] : [];
      }
      if (delta.type === "thinking_delta") {
        const text = typeof delta.thinking === "string" ? delta.thinking : "";
        return text ? [{ kind: "thinking", ts, text, delta: true }] : [];
      }
    }
    return [];
  }

  if (type === "assistant") {
    const message = asRecord(parsed.message) ?? {};
    const content = Array.isArray(message.content) ? message.content : [];
    const entries: TranscriptEntry[] = [];
    for (const blockRaw of content) {
      const block = asRecord(blockRaw);
      if (!block) continue;
      const blockType = typeof block.type === "string" ? block.type : "";
      // text/thinking are streamed live via stream_event deltas (see above); the
      // complete assistant message repeats them verbatim, so skip them here to avoid
      // double-rendering. The final answer also survives in the `result` event.
      // Only tool_use blocks are rendered from the complete message (tool input is
      // not usefully streamable as partial JSON).
      if (blockType === "tool_use") {
        entries.push({
          kind: "tool_call",
          ts,
          name: typeof block.name === "string" ? block.name : "unknown",
          toolUseId:
            typeof block.id === "string"
              ? block.id
              : typeof block.tool_use_id === "string"
                ? block.tool_use_id
                : undefined,
          input: block.input ?? {},
        });
      }
    }
    // A text-only assistant message (the common case) yields no entries here
    // because its text was already streamed via deltas. Return nothing rather than
    // dumping the raw JSON line.
    return entries;
  }

  if (type === "user") {
    const message = asRecord(parsed.message) ?? {};
    const content = Array.isArray(message.content) ? message.content : [];
    const entries: TranscriptEntry[] = [];
    for (const blockRaw of content) {
      const block = asRecord(blockRaw);
      if (!block) continue;
      const blockType = typeof block.type === "string" ? block.type : "";
      if (blockType === "text") {
        const text = typeof block.text === "string" ? block.text : "";
        if (text) entries.push({ kind: "user", ts, text });
      } else if (blockType === "tool_result") {
        const toolUseId = typeof block.tool_use_id === "string" ? block.tool_use_id : "";
        const isError = block.is_error === true;
        let text = "";
        if (typeof block.content === "string") {
          text = block.content;
        } else if (Array.isArray(block.content)) {
          const parts: string[] = [];
          for (const part of block.content) {
            const p = asRecord(part);
            if (p && typeof p.text === "string") parts.push(p.text);
          }
          text = parts.join("\n");
        }
        entries.push({ kind: "tool_result", ts, toolUseId, content: text, isError });
      }
    }
    if (entries.length > 0) return entries;
    // fall through to stdout for user messages without recognized blocks
  }

  if (type === "result") {
    const usage = asRecord(parsed.usage) ?? {};
    const inputTokens = asNumber(usage.input_tokens);
    const outputTokens = asNumber(usage.output_tokens);
    const cachedTokens = asNumber(usage.cache_read_input_tokens);
    const costUsd = asNumber(parsed.total_cost_usd);
    const subtype = typeof parsed.subtype === "string" ? parsed.subtype : "";
    const isError = parsed.is_error === true;
    const errors = Array.isArray(parsed.errors) ? parsed.errors.map(errorText).filter(Boolean) : [];
    const text = typeof parsed.result === "string" ? parsed.result : "";
    return [{
      kind: "result",
      ts,
      text,
      inputTokens,
      outputTokens,
      cachedTokens,
      costUsd,
      subtype,
      isError,
      errors,
    }];
  }

  return [{ kind: "stdout", ts, text: line }];
}
