import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { issuesApi } from "@/api/issues";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import {
  Avatar,
  Icon,
  I,
  PriorityChip,
  StatusChip,
  formatRelative,
  Field,
} from "./utils";
import type {
  Agent,
  Issue,
  IssueComment,
  IssuePriority,
  IssueStatus,
} from "@doerai/shared";

/* ------------------------------------------------------------------
   Lane definitions — collapse the 7 IssueStatus values into 4 lanes.
   `blocked` stays a badge on the card (shows up inside Doing).
------------------------------------------------------------------ */
type LaneKey = "todo" | "doing" | "review" | "done";

const LANE_DEF: Record<LaneKey, { label: string; statuses: string[]; accent: string }> = {
  todo: { label: "Up next", statuses: ["backlog", "todo"], accent: "var(--ink-dim)" },
  doing: { label: "Doing", statuses: ["in_progress", "blocked"], accent: "var(--accent)" },
  review: { label: "Review", statuses: ["in_review"], accent: "var(--warn)" },
  done: { label: "Done", statuses: ["done", "cancelled"], accent: "var(--pulse)" },
};

function laneForStatus(status: string): LaneKey | null {
  for (const key of Object.keys(LANE_DEF) as LaneKey[]) {
    if (LANE_DEF[key].statuses.includes(status)) return key;
  }
  return null;
}

type PriorityFilter = "all" | "critical" | "high" | "medium" | "low";

function shortPriority(p: string): "P0" | "P1" | "P2" | "P3" | string {
  if (p === "critical") return "P0";
  if (p === "high") return "P1";
  if (p === "medium") return "P2";
  if (p === "low") return "P3";
  return p;
}

const STATUS_OPTIONS: { value: IssueStatus; label: string; color: string }[] = [
  { value: "backlog", label: "Backlog", color: "var(--ink-faint)" },
  { value: "todo", label: "Todo", color: "var(--ink-dim)" },
  { value: "in_progress", label: "In progress", color: "var(--accent)" },
  { value: "in_review", label: "In review", color: "var(--warn)" },
  { value: "blocked", label: "Blocked", color: "var(--danger)" },
  { value: "done", label: "Done", color: "var(--pulse)" },
  { value: "cancelled", label: "Cancelled", color: "var(--ink-faint)" },
];

const PRIORITY_OPTIONS: { value: IssuePriority; label: string; color: string; hint: string }[] = [
  { value: "critical", label: "Critical", color: "var(--danger)", hint: "P0" },
  { value: "high", label: "High", color: "var(--warn)", hint: "P1" },
  { value: "medium", label: "Medium", color: "var(--accent)", hint: "P2" },
  { value: "low", label: "Low", color: "var(--ink-faint)", hint: "P3" },
];

/* ------------------------------------------------------------------
   Hooks / helpers
------------------------------------------------------------------ */
function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
  enabled: boolean,
) {
  React.useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      handler();
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [ref, handler, enabled]);
}

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

/* ------------------------------------------------------------------
   Picker — generic single-select dropdown
------------------------------------------------------------------ */
type PickerOption<V> = {
  value: V;
  label: string;
  hint?: string;
  color?: string;
  avatarName?: string;
};

function Picker<V extends string>({
  placeholder,
  value,
  options,
  onChange,
  disabled,
  emptyLabel,
  width,
}: {
  placeholder?: string;
  value: V | null;
  options: PickerOption<V>[];
  onChange: (next: V | null) => void;
  disabled?: boolean;
  emptyLabel?: string;
  width?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", minWidth: width }}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: "var(--bg-raised)",
          color: current ? "var(--ink)" : "var(--ink-dim)",
          fontSize: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {current?.avatarName ? (
            <Avatar name={current.avatarName} size={16} />
          ) : current?.color ? (
            <span style={{ width: 8, height: 8, borderRadius: 999, background: current.color, flexShrink: 0 }} />
          ) : null}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current?.label ?? placeholder ?? "Select…"}
          </span>
        </span>
        <Icon
          d={I.chevron}
          size={10}
          style={{
            color: "var(--ink-faint)",
            transform: open ? "rotate(90deg)" : undefined,
            transition: "transform .1s var(--fw-ease)",
          }}
        />
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            maxHeight: 280,
            overflowY: "auto",
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
            padding: 4,
            zIndex: 50,
          }}
        >
          {emptyLabel ? (
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                border: "none",
                borderRadius: 6,
                background: value === null ? "var(--accent-soft)" : "transparent",
                color: "var(--ink-dim)",
                fontSize: 12,
                fontStyle: "italic",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (value !== null) e.currentTarget.style.background = "var(--bg-sunken)";
              }}
              onMouseLeave={(e) => {
                if (value !== null) e.currentTarget.style.background = "transparent";
              }}
            >
              {emptyLabel}
            </button>
          ) : null}
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  border: "none",
                  borderRadius: 6,
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink)",
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-sunken)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                {opt.avatarName ? (
                  <Avatar name={opt.avatarName} size={16} />
                ) : opt.color ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: opt.color,
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <span>{opt.label}</span>
                {opt.hint ? (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      color: "var(--ink-faint)",
                      fontFamily: "var(--fw-font-mono)",
                    }}
                  >
                    {opt.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------
   Inline title / description editors
------------------------------------------------------------------ */
function InlineTitleEdit({
  value,
  onSave,
  pending,
}: {
  value: string;
  onSave: (v: string) => void;
  pending?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          if (trimmed && trimmed !== value) onSave(trimmed);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        style={{
          width: "100%",
          border: "1px solid var(--accent)",
          borderRadius: 6,
          padding: "6px 8px",
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "var(--font-display-active)",
          background: "var(--bg)",
          color: "var(--ink)",
          outline: "none",
          margin: 0,
        }}
      />
    );
  }

  return (
    <h2
      onClick={() => setEditing(true)}
      className="fw-display"
      title="Click to edit"
      style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.3,
        cursor: "text",
        padding: "1px 8px",
        marginLeft: -8,
        borderRadius: 6,
        transition: "background .1s var(--fw-ease)",
        opacity: pending ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-raised)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {value || "Untitled"}
    </h2>
  );
}

function InlineDescriptionEdit({
  value,
  onSave,
  pending,
}: {
  value: string | null;
  onSave: (v: string) => void;
  pending?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? "");
  React.useEffect(() => setDraft(value ?? ""), [value]);

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== (value ?? "")) onSave(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        rows={6}
        style={{
          width: "100%",
          border: "1px solid var(--accent)",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: 13,
          lineHeight: 1.55,
          background: "var(--bg)",
          color: "var(--ink)",
          outline: "none",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      title="Click to edit (⌘↵ to save)"
      style={{
        margin: 0,
        fontSize: 13,
        lineHeight: 1.55,
        color: value ? "var(--ink-dim)" : "var(--ink-faint)",
        whiteSpace: "pre-wrap",
        cursor: "text",
        padding: 8,
        borderRadius: 6,
        border: "1px dashed transparent",
        fontStyle: value ? "normal" : "italic",
        opacity: pending ? 0.6 : 1,
        transition: "all .1s var(--fw-ease)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--line)";
        e.currentTarget.style.background = "var(--bg-raised)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {value || "Add a description…"}
    </p>
  );
}

/* ------------------------------------------------------------------
   Comment composer + thread
------------------------------------------------------------------ */
function CommentComposer({
  onSubmit,
  pending,
}: {
  onSubmit: (body: string, reopen: boolean, interrupt: boolean) => void;
  pending: boolean;
}) {
  const [body, setBody] = React.useState("");
  const [reopen, setReopen] = React.useState(false);
  const [interrupt, setInterrupt] = React.useState(false);

  const canSubmit = body.trim().length > 0 && !pending;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--bg-raised)",
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a comment… (⌘↵ to send)"
        rows={3}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            onSubmit(body.trim(), reopen, interrupt);
            setBody("");
            setReopen(false);
            setInterrupt(false);
          }
        }}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--ink)",
          fontSize: 13,
          lineHeight: 1.5,
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={reopen}
            onChange={(e) => setReopen(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          Reopen if done
        </label>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={interrupt}
            onChange={(e) => setInterrupt(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          Interrupt run
        </label>
        <button
          onClick={() => {
            if (!canSubmit) return;
            onSubmit(body.trim(), reopen, interrupt);
            setBody("");
            setReopen(false);
            setInterrupt(false);
          }}
          disabled={!canSubmit}
          style={{
            marginLeft: "auto",
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid var(--accent)",
            background: canSubmit ? "var(--accent)" : "var(--bg-sunken)",
            color: canSubmit ? "var(--bg)" : "var(--ink-faint)",
            fontSize: 12,
            fontWeight: 500,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function CommentsThread({
  comments,
  agents,
  loading,
}: {
  comments: IssueComment[];
  agents: Map<string, Agent>;
  loading: boolean;
}) {
  if (loading && comments.length === 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading comments…</span>
    );
  }
  if (comments.length === 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>
        No comments yet.
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {comments.map((c) => {
        const author = c.authorAgentId ? agents.get(c.authorAgentId) ?? null : null;
        const displayName = author?.name ?? (c.authorUserId ? "User" : "System");
        return (
          <div
            key={c.id}
            style={{
              display: "flex",
              gap: 10,
              padding: 10,
              borderRadius: 8,
              background: "var(--bg-raised)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <Avatar name={displayName} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{displayName}</span>
                <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                  {formatRelative(c.createdAt)}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "var(--ink-dim)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {c.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------
   Card
------------------------------------------------------------------ */
function IssueCard({
  issue,
  assignee,
  active,
  onClick,
}: {
  issue: Issue;
  assignee: Agent | null;
  active: boolean;
  onClick: () => void;
}) {
  const blocked = issue.status === "blocked";
  const cancelled = issue.status === "cancelled";
  return (
    <div
      onClick={onClick}
      className="fw-card"
      style={{
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        border: active ? "1px solid var(--accent)" : undefined,
        boxShadow: active ? "0 0 0 2px var(--accent-soft)" : undefined,
        opacity: cancelled ? 0.55 : 1,
        transition: "border .1s var(--fw-ease), box-shadow .1s var(--fw-ease)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--bg-raised)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "";
      }}
    >
      {/* Top row: identifier + priority + blocked flag */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
          {issue.identifier ?? issue.id.slice(0, 6)}
        </span>
        <PriorityChip priority={shortPriority(issue.priority)} />
        {blocked ? (
          <span
            className="fw-chip"
            style={{ color: "var(--danger)", borderColor: "var(--danger)", fontSize: 10 }}
          >
            blocked
          </span>
        ) : null}
      </div>

      {/* Title */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.35,
          textDecoration: cancelled ? "line-through" : undefined,
          color: "var(--ink)",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {issue.title ?? "Untitled"}
      </span>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {assignee ? (
            <>
              <Avatar name={assignee.name} size={18} />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {assignee.name}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>unassigned</span>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatRelative(issue.updatedAt)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Lane column
------------------------------------------------------------------ */
function Lane({
  laneKey,
  issues,
  byId,
  selectedId,
  onSelect,
}: {
  laneKey: LaneKey;
  issues: Issue[];
  byId: Map<string, Agent>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const def = LANE_DEF[laneKey];
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 260,
        flex: 1,
        maxWidth: 360,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 2px 6px",
          borderBottom: `2px solid ${def.accent}`,
        }}
      >
        <span className="fw-uc" style={{ color: def.accent, fontWeight: 600 }}>
          {def.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: "auto" }}>
          {issues.length}
        </span>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 40 }}>
        {issues.length === 0 ? (
          <div
            style={{
              padding: 14,
              border: "1px dashed var(--line)",
              borderRadius: 8,
              textAlign: "center",
              fontSize: 11,
              color: "var(--ink-faint)",
            }}
          >
            Nothing here.
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              assignee={issue.assigneeAgentId ? byId.get(issue.assigneeAgentId) ?? null : null}
              active={selectedId === issue.id}
              onClick={() => onSelect(issue.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Interactive detail drawer
------------------------------------------------------------------ */
function InteractiveIssueDrawer({
  issue,
  agents,
  byId,
  companyId,
  companyPrefix,
  onClose,
}: {
  issue: Issue | null;
  agents: Agent[];
  byId: Map<string, Agent>;
  companyId: string;
  companyPrefix: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  React.useEffect(() => {
    if (!issue) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Ignore Escape while user is editing a field (let the field cancel first).
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [issue, onClose]);

  /* -------- Issue update mutation (optimistic) -------- */
  const updateMutation = useMutation<Issue, Error, Partial<Issue>, { prev?: Issue[] }>({
    mutationFn: async (patch) => {
      if (!issue) throw new Error("No issue selected");
      return issuesApi.update(issue.id, patch as Record<string, unknown>);
    },
    onMutate: async (patch) => {
      if (!issue) return {};
      const key = queryKeys.issues.list(companyId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Issue[]>(key);
      if (prev) {
        queryClient.setQueryData<Issue[]>(
          key,
          prev.map((i) => (i.id === issue.id ? { ...i, ...patch } : i)),
        );
      }
      return { prev };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKeys.issues.list(companyId), ctx.prev);
      }
      pushToast({
        title: "Update failed",
        body: errMessage(err, "Server rejected the change."),
        tone: "error",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
    },
  });

  /* -------- Comments -------- */
  const commentsQuery = useQuery({
    queryKey: issue ? queryKeys.issues.comments(issue.id) : ["issues", "comments", "none"],
    queryFn: () => issuesApi.listComments(issue!.id),
    enabled: !!issue,
    refetchInterval: 20_000,
  });

  const addCommentMutation = useMutation<
    IssueComment,
    Error,
    { body: string; reopen?: boolean; interrupt?: boolean }
  >({
    mutationFn: ({ body, reopen, interrupt }) => {
      if (!issue) throw new Error("No issue selected");
      return issuesApi.addComment(issue.id, body, reopen, interrupt);
    },
    onSuccess: () => {
      if (!issue) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.comments(issue.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
      pushToast({ title: "Comment added", tone: "success" });
    },
    onError: (err) => {
      pushToast({
        title: "Comment failed",
        body: errMessage(err, "Could not post comment."),
        tone: "error",
      });
    },
  });

  /* -------- Checkout / release -------- */
  const checkoutMutation = useMutation<Issue, Error, string>({
    mutationFn: (agentId) => {
      if (!issue) throw new Error("No issue selected");
      return issuesApi.checkout(issue.id, agentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
      pushToast({ title: "Checked out", tone: "success" });
    },
    onError: (err) => {
      pushToast({
        title: "Checkout failed",
        body: errMessage(err, "Could not check out."),
        tone: "error",
      });
    },
  });

  const releaseMutation = useMutation<Issue, Error, void>({
    mutationFn: () => {
      if (!issue) throw new Error("No issue selected");
      return issuesApi.release(issue.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
      pushToast({ title: "Released", tone: "success" });
    },
    onError: (err) => {
      pushToast({
        title: "Release failed",
        body: errMessage(err, "Could not release."),
        tone: "error",
      });
    },
  });

  if (!issue) return null;

  const assignee = issue.assigneeAgentId ? byId.get(issue.assigneeAgentId) ?? null : null;
  const updatePending = updateMutation.isPending;
  const comments = commentsQuery.data ?? [];
  const checkedOut = !!issue.checkoutRunId;

  const assigneeOptions: PickerOption<string>[] = agents
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => ({
      value: a.id,
      label: a.name,
      hint: a.title ?? a.role,
      avatarName: a.name,
    }));

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.32)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
          animation: "fw-fade-in .15s var(--fw-ease)",
        }}
      />
      <aside
        role="dialog"
        aria-label={`Issue ${issue.identifier ?? issue.id}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(620px, 94vw)",
          background: "var(--bg, #fafafa)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.18)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          animation: "fw-slide-in-right .22s var(--fw-ease)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {issue.identifier ?? issue.id.slice(0, 8)}
              </span>
              <StatusChip status={issue.status} />
              <PriorityChip priority={shortPriority(issue.priority)} />
              {checkedOut ? (
                <span
                  className="fw-chip"
                  style={{ color: "var(--accent)", borderColor: "var(--accent)", fontSize: 10 }}
                >
                  checked out
                </span>
              ) : null}
            </div>
            <InlineTitleEdit
              value={issue.title ?? ""}
              onSave={(next) => updateMutation.mutate({ title: next })}
              pending={updatePending}
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              borderRadius: 8,
              padding: 6,
              color: "var(--ink-dim)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon d={I.x} size={12} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Description */}
          <Field label="Description">
            <InlineDescriptionEdit
              value={issue.description}
              onSave={(next) => updateMutation.mutate({ description: next || null })}
              pending={updatePending}
            />
          </Field>

          {/* Status / Priority / Assignee pickers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <Field label="Status">
              <Picker<IssueStatus>
                value={issue.status}
                options={STATUS_OPTIONS}
                onChange={(next) => {
                  if (!next || next === issue.status) return;
                  updateMutation.mutate({ status: next });
                }}
              />
            </Field>
            <Field label="Priority">
              <Picker<IssuePriority>
                value={issue.priority}
                options={PRIORITY_OPTIONS}
                onChange={(next) => {
                  if (!next || next === issue.priority) return;
                  updateMutation.mutate({ priority: next });
                }}
              />
            </Field>
          </div>

          <Field label="Assignee">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Picker<string>
                value={issue.assigneeAgentId}
                options={assigneeOptions}
                placeholder="Unassigned"
                emptyLabel="— Unassign"
                onChange={(next) =>
                  updateMutation.mutate({ assigneeAgentId: next ?? null })
                }
                width={260}
              />
              {assignee ? (
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {assignee.title ?? assignee.role} · {assignee.adapterType}
                </span>
              ) : null}
            </div>
          </Field>

          {/* Checkout / release */}
          {assignee ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {checkedOut ? (
                <button
                  onClick={() => releaseMutation.mutate()}
                  disabled={releaseMutation.isPending}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--bg-raised)",
                    color: "var(--ink)",
                    fontSize: 12,
                    cursor: releaseMutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {releaseMutation.isPending ? "Releasing…" : "Release"}
                </button>
              ) : (
                <button
                  onClick={() => checkoutMutation.mutate(assignee.id)}
                  disabled={checkoutMutation.isPending}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--accent)",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: checkoutMutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {checkoutMutation.isPending ? "Checking out…" : "Checkout"}
                </button>
              )}
              <span style={{ fontSize: 11, color: "var(--ink-faint)", alignSelf: "center" }}>
                {checkedOut
                  ? "Held by a run. Release to let other agents pick it up."
                  : "Lock the issue to this assignee."}
              </span>
            </div>
          ) : null}

          {/* Timestamps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Started">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {issue.startedAt ? formatRelative(issue.startedAt) : "—"}
              </span>
            </Field>
            <Field label="Completed">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {issue.completedAt ? formatRelative(issue.completedAt) : "—"}
              </span>
            </Field>
            <Field label="Updated">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {formatRelative(issue.updatedAt)}
              </span>
            </Field>
            <Field label="Created">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {formatRelative(issue.createdAt)}
              </span>
            </Field>
          </div>

          {issue.projectId ? (
            <Field label="Project">
              <a
                href={`/${companyPrefix}/projects/${issue.projectId}`}
                className="fw-mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  textDecoration: "none",
                  borderBottom: "1px dashed var(--line)",
                  paddingBottom: 1,
                }}
              >
                {issue.projectId}
              </a>
            </Field>
          ) : null}

          {/* Comments */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Comments ({comments.length})
            </span>
            <CommentsThread
              comments={comments}
              agents={byId}
              loading={commentsQuery.isLoading}
            />
            <CommentComposer
              onSubmit={(body, reopen, interrupt) =>
                addCommentMutation.mutate({ body, reopen, interrupt })
              }
              pending={addCommentMutation.isPending}
            />
          </div>

          {/* Escape hatch to classic */}
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={`/${companyPrefix}/issues/${issue.identifier ?? issue.id}`}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: "var(--ink-dim)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Open full view in classic <Icon d={I.arrow} size={11} />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */
export function FernwehWork() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const companyPrefix = selectedCompany?.issuePrefix ?? "";

  const issuesQuery = useQuery({
    queryKey: companyId ? queryKeys.issues.list(companyId) : ["issues", "none"],
    queryFn: () => issuesApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  // All hooks above the conditional return.
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [onlyMine, setOnlyMine] = React.useState(false); // placeholder for future
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const issues = issuesQuery.data ?? [];
  const agents = agentsQuery.data ?? [];

  const agentById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((issue) => {
      if (priorityFilter !== "all" && issue.priority !== priorityFilter) return false;
      if (q) {
        const assignee = issue.assigneeAgentId
          ? agentById.get(issue.assigneeAgentId)?.name ?? ""
          : "";
        const hay = [issue.title ?? "", issue.identifier ?? "", assignee]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [issues, priorityFilter, search, agentById]);

  const byLane = React.useMemo(() => {
    const map: Record<LaneKey, Issue[]> = { todo: [], doing: [], review: [], done: [] };
    for (const issue of filtered) {
      const lane = laneForStatus(issue.status);
      if (!lane) continue;
      map[lane].push(issue);
    }
    // Sort each lane: priority ascending, then updatedAt descending.
    const prioRank = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    for (const k of Object.keys(map) as LaneKey[]) {
      map[k].sort((a, b) => {
        const ap = prioRank[a.priority] ?? 99;
        const bp = prioRank[b.priority] ?? 99;
        if (ap !== bp) return ap - bp;
        const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bt - at;
      });
    }
    return map;
  }, [filtered]);

  const selected = selectedId ? issues.find((i) => i.id === selectedId) ?? null : null;

  if (!selectedCompany || !companyId) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to view work.</p>
      </div>
    );
  }

  const total = issues.length;

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        margin: "0 auto",
        maxWidth: 1600,
        width: "100%",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Work
          </span>
          <h1
            className="fw-display"
            style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}
          >
            {selectedCompany.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fw-chip">{total} issues</span>
          <span className="fw-chip">{byLane.doing.length} doing</span>
          <span className="fw-chip">{byLane.review.length} review</span>
        </div>
      </header>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {(["all", "critical", "high", "medium", "low"] as PriorityFilter[]).map((key) => {
            const active = priorityFilter === key;
            const label = key === "all" ? "All" : key[0].toUpperCase() + key.slice(1);
            return (
              <button
                key={key}
                onClick={() => setPriorityFilter(key)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink-dim)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          <span style={{ textDecoration: onlyMine ? "none" : "line-through", opacity: 0.6 }}>
            Only mine
          </span>
          <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>(coming soon)</span>
        </label>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              minWidth: 240,
            }}
          >
            <Icon
              d="M21 21l-4.35-4.35 M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
              size={13}
              style={{ color: "var(--ink-faint)" }}
            />
            <input
              placeholder="Search issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 12,
                color: "var(--ink)",
                width: "100%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Board */}
      {total === 0 ? (
        <div className="fw-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)" }}>
          No issues yet. Create one from the classic UI to get the lanes moving.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            overflowX: "auto",
            paddingBottom: 12,
          }}
        >
          {(Object.keys(LANE_DEF) as LaneKey[]).map((key) => (
            <Lane
              key={key}
              laneKey={key}
              issues={byLane[key]}
              byId={agentById}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 0",
          borderTop: "1px solid var(--line-soft)",
          color: "var(--ink-faint)",
          fontSize: 11,
        }}
      >
        <Icon d={I.issues} size={11} />
        <span>
          Click a card for detail · Esc to close · Click title / description to edit · refetches every 30s.
        </span>
      </footer>

      {/* Drawer */}
      <InteractiveIssueDrawer
        issue={selected}
        agents={agents}
        byId={agentById}
        companyId={companyId}
        companyPrefix={companyPrefix}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
