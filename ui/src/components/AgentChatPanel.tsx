import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  toolName?: string;
}

interface AgentChatPanelProps {
  agentId: string;
  adapterType: string;
  fernweh?: boolean;
}

const LOCAL_ADAPTER_TYPES = new Set([
  "claude_local",
  "codex_local",
  "opencode_local",
  "pi_local",
  "hermes_local",
  "cursor",
]);

export function AgentChatPanel({ agentId, adapterType, fernweh = false }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLocalAdapter = LOCAL_ADAPTER_TYPES.has(adapterType);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLocalAdapter) {
    return (
      <div
        className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8"
        style={fernweh ? { color: "var(--ink-dim)" } : undefined}
      >
        <Wrench className="h-8 w-8" style={fernweh ? { color: "var(--ink-faint)" } : undefined} />
        <p className="text-sm font-medium" style={fernweh ? { color: "var(--ink-dim)" } : undefined}>Local adapter agent</p>
        <p className="text-xs max-w-xs" style={fernweh ? { color: "var(--ink-faint)" } : undefined}>
          In-app chat is available for Letta Cloud agents only. This agent uses a{" "}
          <span className="font-mono">{adapterType}</span> adapter which runs locally.
        </p>
      </div>
    );
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/agents/${agentId}/letta/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "error",
            content: (err as { error?: string }).error ?? "Request failed",
          },
        ]);
        return;
      }

      const data = await res.json() as { messages: Array<{ role: string; content: string; toolName?: string }> };
      const newMessages: ChatMessage[] = (data.messages ?? []).map((m, i) => ({
        id: `resp-${Date.now()}-${i}`,
        role: m.role === "tool" ? "tool" : "assistant",
        content: m.content,
        toolName: m.toolName,
      }));

      if (newMessages.length === 0) {
        // No assistant message — agent processed silently
        newMessages.push({
          id: `resp-${Date.now()}-empty`,
          role: "assistant",
          content: "(Agent processed your message with no text response)",
        });
      }

      setMessages((prev) => [...prev, ...newMessages]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "error",
          content: e instanceof Error ? e.message : "Network error",
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={fernweh ? { background: "var(--bg-raised)" } : undefined}>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs" style={fernweh ? { color: "var(--ink-faint)" } : undefined}>
              Send a message to start chatting.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "tool" ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs max-w-[80%]"
                style={fernweh ? {
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line-soft)",
                  color: "var(--ink-dim)",
                } : {
                  background: "hsl(var(--muted) / 0.4)",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                <Wrench className="h-3 w-3 shrink-0" />
                {msg.content}
              </div>
            ) : (
              <div
                className={cn(
                  "px-3 py-2 rounded-xl text-sm max-w-[80%] whitespace-pre-wrap break-words",
                  msg.role === "user" && "rounded-br-sm",
                  msg.role === "error" && "text-xs",
                  msg.role !== "user" && msg.role !== "error" && "rounded-bl-sm",
                )}
                style={
                  fernweh
                    ? msg.role === "user"
                      ? { background: "var(--accent)", color: "var(--bg)", border: "none" }
                      : msg.role === "error"
                        ? {
                            background: "color-mix(in oklab, var(--danger) 8%, var(--bg-raised))",
                            border: "1px solid color-mix(in oklab, var(--danger) 25%, var(--line))",
                            color: "var(--danger)",
                          }
                        : { background: "var(--bg-sunken)", color: "var(--ink)", border: "1px solid var(--line-soft)" }
                    : msg.role === "user"
                      ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                      : msg.role === "error"
                        ? { background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.3)", color: "hsl(var(--destructive))" }
                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                }
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
              style={fernweh
                ? { background: "var(--bg-sunken)", color: "var(--ink-dim)", border: "1px solid var(--line-soft)" }
                : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
              }
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 flex items-end gap-2"
        style={fernweh ? { borderTop: "1px solid var(--line)" } : { borderTop: "1px solid hsl(var(--border))" }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message the agent… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none rounded-lg px-3 py-2 text-sm focus:outline-none min-h-[38px] max-h-32"
          style={fernweh
            ? {
                background: "var(--bg-sunken)",
                color: "var(--ink)",
                border: "1px solid var(--line-soft)",
                overflow: input.includes("\n") ? "auto" : "hidden",
              }
            : {
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
                overflow: input.includes("\n") ? "auto" : "hidden",
              }
          }
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={() => void sendMessage()}
          disabled={!input.trim() || sending}
          className="shrink-0 h-9 w-9"
          style={fernweh && input.trim() && !sending
            ? { background: "var(--accent)", color: "var(--bg)", border: "none" }
            : undefined
          }
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
