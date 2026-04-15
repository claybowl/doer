import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "@/lib/router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { Identity } from "./Identity";
import {
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Issue } from "@paperclipai/shared";

const boardStatuses = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
];

const priorities = ["critical", "high", "medium", "low"];

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityLabel(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

interface Agent {
  id: string;
  name: string;
}

export interface KanbanBoardProps {
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  wipLimits?: Record<string, number>;
  swimlaneBy?: "none" | "assignee" | "priority";
  collapsedColumns?: string[];
  onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
  onToggleColumn?: (status: string) => void;
  onSetWipLimit?: (status: string, limit: number | undefined) => void;
}

/* ── Droppable Column ── */

function KanbanColumn({
  status,
  issues,
  agents,
  liveIssueIds,
  wipLimit,
  collapsed,
  onToggleCollapse,
  onSetWipLimit,
}: {
  status: string;
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  wipLimit?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSetWipLimit?: (limit: number | undefined) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const limitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLimit && limitInputRef.current) {
      limitInputRef.current.focus();
      limitInputRef.current.select();
    }
  }, [editingLimit]);

  const count = issues.length;
  const overLimit = wipLimit !== undefined && count > wipLimit;
  const atLimit = wipLimit !== undefined && count === wipLimit;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center min-w-[40px] w-[40px] shrink-0">
        <button
          onClick={onToggleCollapse}
          className="flex flex-col items-center gap-1 py-2 w-full hover:bg-accent/30 rounded-md transition-colors"
          title={`Expand ${statusLabel(status)}`}
        >
          <StatusIcon status={status} />
          <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90 mt-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      <div className="flex items-center gap-2 px-2 py-2 mb-1">
        <StatusIcon status={status} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1">
          {statusLabel(status)}
        </span>

        {/* WIP limit / count display */}
        {editingLimit ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(limitInput, 10);
              onSetWipLimit?.(isNaN(n) || n <= 0 ? undefined : n);
              setEditingLimit(false);
            }}
            className="flex items-center"
          >
            <input
              ref={limitInputRef}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onBlur={() => {
                const n = parseInt(limitInput, 10);
                onSetWipLimit?.(isNaN(n) || n <= 0 ? undefined : n);
                setEditingLimit(false);
              }}
              onKeyDown={(e) => e.key === "Escape" && setEditingLimit(false)}
              className="w-10 text-xs text-center border rounded px-1 py-0 h-5 bg-background"
              placeholder="∞"
              type="number"
              min="1"
            />
          </form>
        ) : (
          <button
            onClick={() => {
              setLimitInput(wipLimit ? String(wipLimit) : "");
              setEditingLimit(true);
            }}
            title={wipLimit ? `WIP limit: ${wipLimit}. Click to edit.` : "Click to set WIP limit"}
            className={`text-xs tabular-nums rounded px-1 transition-colors ${
              overLimit
                ? "text-red-500 font-semibold bg-red-500/10"
                : atLimit
                ? "text-amber-500 font-semibold bg-amber-500/10"
                : "text-muted-foreground/60 hover:text-muted-foreground"
            }`}
          >
            {wipLimit ? `${count}/${wipLimit}` : count}
            {overLimit && <AlertTriangle className="inline h-3 w-3 ml-0.5 -mt-0.5" />}
          </button>
        )}

        <button
          onClick={onToggleCollapse}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Collapse column"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-md p-1 space-y-1 transition-colors ${
          isOver ? "bg-accent/40" : "bg-muted/20"
        }`}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <KanbanCard
              key={issue.id}
              issue={issue}
              agents={agents}
              isLive={liveIssueIds?.has(issue.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

/* ── Draggable Card ── */

function KanbanCard({
  issue,
  agents,
  isLive,
  isOverlay,
  onUpdateIssue,
}: {
  issue: Issue;
  agents?: Agent[];
  isLive?: boolean;
  isOverlay?: boolean;
  onUpdateIssue?: (id: string, data: Record<string, unknown>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { issue } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  const prefix = issue.identifier
    ? issue.identifier.replace(/-\d+$/, "")
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group rounded-md border bg-card p-2.5 cursor-grab active:cursor-grabbing transition-shadow relative ${
        isDragging && !isOverlay ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-sm"}`}
    >
      {/* Quick actions — shown on hover, not during drag/overlay */}
      {!isOverlay && onUpdateIssue && (
        <div
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-0.5 rounded hover:bg-accent transition-colors">
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link
                  to={`/${prefix ? `${prefix}/` : ""}issues/${issue.identifier ?? issue.id}`}
                  className="flex items-center gap-2 w-full cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <PriorityIcon priority={issue.priority} />
                  Priority
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {priorities.map((p) => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => onUpdateIssue(issue.id, { priority: p })}
                      className="flex items-center gap-2"
                    >
                      <PriorityIcon priority={p} />
                      {priorityLabel(p)}
                      {issue.priority === p && (
                        <span className="ml-auto text-primary text-xs">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {agents && agents.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <Identity name="?" size="xs" />
                    Assign
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-48 overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() =>
                        onUpdateIssue(issue.id, { assigneeAgentId: null })
                      }
                    >
                      Unassigned
                    </DropdownMenuItem>
                    {agents.map((agent) => (
                      <DropdownMenuItem
                        key={agent.id}
                        onClick={() =>
                          onUpdateIssue(issue.id, { assigneeAgentId: agent.id })
                        }
                        className="flex items-center gap-2"
                      >
                        <Identity name={agent.name} size="xs" />
                        {agent.name}
                        {issue.assigneeAgentId === agent.id && (
                          <span className="ml-auto text-primary text-xs">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Link
        to={`/${prefix ? `${prefix}/` : ""}issues/${issue.identifier ?? issue.id}`}
        className="block no-underline text-inherit"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        <div className="flex items-start gap-1.5 mb-1.5">
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {issue.identifier ?? issue.id.slice(0, 8)}
          </span>
          {isLive && (
            <span className="relative flex h-2 w-2 shrink-0 mt-0.5">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
        </div>
        <p className="text-sm leading-snug line-clamp-2 mb-2 pr-5">{issue.title}</p>
        <div className="flex items-center gap-2">
          <PriorityIcon priority={issue.priority} />
          {issue.assigneeAgentId &&
            (() => {
              const name = agentName(issue.assigneeAgentId);
              return name ? (
                <Identity name={name} size="xs" />
              ) : (
                <span className="text-xs text-muted-foreground font-mono">
                  {issue.assigneeAgentId.slice(0, 8)}
                </span>
              );
            })()}
        </div>
      </Link>
    </div>
  );
}

/* ── Swimlane Row ── */

function SwimlaneRow({
  label,
  issues,
  agents,
  liveIssueIds,
  wipLimits,
  collapsedColumns,
  onToggleColumn,
  onSetWipLimit,
  onUpdateIssue,
}: {
  label: string;
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  wipLimits?: Record<string, number>;
  collapsedColumns?: string[];
  onToggleColumn?: (status: string) => void;
  onSetWipLimit?: (status: string, limit: number | undefined) => void;
  onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
}) {
  const [rowCollapsed, setRowCollapsed] = useState(false);

  const byStatus = useMemo(() => {
    const grouped: Record<string, Issue[]> = {};
    for (const s of boardStatuses) grouped[s] = [];
    for (const issue of issues) {
      if (grouped[issue.status]) grouped[issue.status].push(issue);
    }
    return grouped;
  }, [issues]);

  return (
    <div className="mb-4">
      <button
        onClick={() => setRowCollapsed((v) => !v)}
        className="flex items-center gap-2 px-1 py-1.5 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${rowCollapsed ? "" : "rotate-90"}`}
        />
        {label}
        <span className="text-muted-foreground/60 font-normal">{issues.length}</span>
      </button>
      {!rowCollapsed && (
        <div className="flex gap-3">
          {boardStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              issues={byStatus[status] ?? []}
              agents={agents}
              liveIssueIds={liveIssueIds}
              wipLimit={wipLimits?.[status]}
              collapsed={collapsedColumns?.includes(status)}
              onToggleCollapse={() => onToggleColumn?.(status)}
              onSetWipLimit={(limit) => onSetWipLimit?.(status, limit)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Board ── */

export function KanbanBoard({
  issues,
  agents,
  liveIssueIds,
  wipLimits,
  swimlaneBy = "none",
  collapsedColumns = [],
  onUpdateIssue,
  onToggleColumn,
  onSetWipLimit,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columnIssues = useMemo(() => {
    const grouped: Record<string, Issue[]> = {};
    for (const status of boardStatuses) grouped[status] = [];
    for (const issue of issues) {
      if (grouped[issue.status]) grouped[issue.status].push(issue);
    }
    return grouped;
  }, [issues]);

  const swimlaneGroups = useMemo(() => {
    if (swimlaneBy === "none") return null;

    if (swimlaneBy === "priority") {
      const groups: { key: string; label: string; issues: Issue[] }[] = [];
      const byPriority: Record<string, Issue[]> = {};
      for (const p of ["critical", "high", "medium", "low"]) byPriority[p] = [];
      byPriority["_none"] = [];
      for (const issue of issues) {
        (byPriority[issue.priority ?? "_none"] ?? byPriority["_none"]).push(issue);
      }
      for (const p of ["critical", "high", "medium", "low"]) {
        if (byPriority[p].length > 0)
          groups.push({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1), issues: byPriority[p] });
      }
      if (byPriority["_none"].length > 0)
        groups.push({ key: "_none", label: "No Priority", issues: byPriority["_none"] });
      return groups;
    }

    if (swimlaneBy === "assignee") {
      const byAgent: Record<string, Issue[]> = { __unassigned: [] };
      for (const issue of issues) {
        if (!issue.assigneeAgentId) {
          byAgent["__unassigned"].push(issue);
        } else {
          (byAgent[issue.assigneeAgentId] ??= []).push(issue);
        }
      }
      const groups: { key: string; label: string; issues: Issue[] }[] = [];
      for (const [agentId, agentIssues] of Object.entries(byAgent)) {
        if (agentIssues.length === 0) continue;
        const name =
          agentId === "__unassigned"
            ? "Unassigned"
            : (agents?.find((a) => a.id === agentId)?.name ?? agentId.slice(0, 8));
        groups.push({ key: agentId, label: name, issues: agentIssues });
      }
      return groups;
    }

    return null;
  }, [issues, swimlaneBy, agents]);

  const activeIssue = useMemo(
    () => (activeId ? issues.find((i) => i.id === activeId) : null),
    [activeId, issues]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;

    let targetStatus: string | null = null;

    if (boardStatuses.includes(over.id as string)) {
      targetStatus = over.id as string;
    } else {
      const targetIssue = issues.find((i) => i.id === over.id);
      if (targetIssue) targetStatus = targetIssue.status;
    }

    if (targetStatus && targetStatus !== issue.status) {
      onUpdateIssue(issueId, { status: targetStatus });
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    // Reserved for future visual feedback
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4 -mx-2 px-2">
        {swimlaneGroups ? (
          <div>
            {swimlaneGroups.map((group) => (
              <SwimlaneRow
                key={group.key}
                label={group.label}
                issues={group.issues}
                agents={agents}
                liveIssueIds={liveIssueIds}
                wipLimits={wipLimits}
                collapsedColumns={collapsedColumns}
                onToggleColumn={onToggleColumn}
                onSetWipLimit={onSetWipLimit}
                onUpdateIssue={onUpdateIssue}
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-3">
            {boardStatuses.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                issues={columnIssues[status] ?? []}
                agents={agents}
                liveIssueIds={liveIssueIds}
                wipLimit={wipLimits?.[status]}
                collapsed={collapsedColumns.includes(status)}
                onToggleCollapse={() => onToggleColumn?.(status)}
                onSetWipLimit={(limit) => onSetWipLimit?.(status, limit)}
              />
            ))}
          </div>
        )}
      </div>
      <DragOverlay>
        {activeIssue ? (
          <KanbanCard
            issue={activeIssue}
            agents={agents}
            isOverlay
            onUpdateIssue={onUpdateIssue}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
