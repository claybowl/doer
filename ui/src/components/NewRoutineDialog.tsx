import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import {
  ISSUE_PRIORITIES,
  ROUTINE_CATCH_UP_POLICIES,
  ROUTINE_CONCURRENCY_POLICIES,
} from "@doerai/shared";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { useToast } from "../context/ToastContext";
import { agentsApi } from "../api/agents";
import { assetsApi } from "../api/assets";
import { projectsApi } from "../api/projects";
import { routinesApi } from "../api/routines";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronRight,
  Hexagon,
  Maximize2,
  Minimize2,
  Minus,
  Repeat,
} from "lucide-react";
import { cn } from "../lib/utils";
import { MarkdownEditor, type MarkdownEditorRef } from "./MarkdownEditor";
import {
  InlineEntitySelector,
  type InlineEntityOption,
} from "./InlineEntitySelector";
import { AgentIcon } from "./AgentIconPicker";

const concurrencyPolicyDescriptions: Record<string, string> = {
  coalesce_if_active: "Keep one follow-up run queued if the routine is already running.",
  always_enqueue: "Queue every trigger occurrence, even if a run is in flight.",
  skip_if_active: "Drop new occurrences while a run is still active.",
};

const catchUpPolicyDescriptions: Record<string, string> = {
  skip_missed: "Ignore windows missed while the scheduler or routine was paused.",
  enqueue_missed_with_cap: "Catch up missed schedule windows in capped batches.",
};

const priorityIcon: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className="h-3 w-3 text-rose-500" />,
  high: <ArrowUp className="h-3 w-3 text-orange-500" />,
  medium: <Minus className="h-3 w-3 text-muted-foreground" />,
  low: <ArrowDown className="h-3 w-3 text-blue-500" />,
};

function formatPolicyName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NewRoutineDialog() {
  const { newRoutineOpen, newRoutineDefaults, closeNewRoutine } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const descriptionEditorRef = useRef<MarkdownEditorRef>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeAgentId, setAssigneeAgentId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [concurrencyPolicy, setConcurrencyPolicy] = useState("coalesce_if_active");
  const [catchUpPolicy, setCatchUpPolicy] = useState("skip_missed");
  const [expanded, setExpanded] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [priorityOpen, setPriorityOpen] = useState(false);

  // Apply defaults when dialog opens (one-time merge — local state wins
  // once user has interacted, defaults only fill blanks).
  const appliedProjectId = projectId || newRoutineDefaults.projectId || "";
  const appliedAssigneeAgentId =
    assigneeAgentId || newRoutineDefaults.assigneeAgentId || "";

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && newRoutineOpen,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && newRoutineOpen,
  });

  const projectOptions = useMemo<InlineEntityOption[]>(
    () =>
      (projects ?? [])
        .filter((p) => !p.archivedAt)
        .map((p) => ({
          id: p.id,
          label: p.name,
          searchText: p.name,
        })),
    [projects],
  );

  const agentOptions = useMemo<InlineEntityOption[]>(
    () =>
      (agents ?? []).map((a) => ({
        id: a.id,
        label: a.name,
        searchText: a.name,
      })),
    [agents],
  );

  function reset() {
    setTitle("");
    setDescription("");
    setProjectId("");
    setAssigneeAgentId("");
    setPriority("medium");
    setConcurrencyPolicy("coalesce_if_active");
    setCatchUpPolicy("skip_missed");
    setExpanded(false);
    setAdvancedOpen(false);
  }

  // Reset state whenever the dialog closes so the next open is clean.
  useEffect(() => {
    if (!newRoutineOpen) reset();
  }, [newRoutineOpen]);

  const createRoutine = useMutation({
    mutationFn: () =>
      routinesApi.create(selectedCompanyId!, {
        projectId: appliedProjectId,
        assigneeAgentId: appliedAssigneeAgentId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        concurrencyPolicy,
        catchUpPolicy,
        ...(newRoutineDefaults.goalId ? { goalId: newRoutineDefaults.goalId } : {}),
      }),
    onSuccess: async (routine) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.routines.list(selectedCompanyId!),
      });
      pushToast({
        title: "Routine created",
        body: "Add the first trigger to turn it into a live workflow.",
        tone: "success",
      });
      closeNewRoutine();
      navigate(`/routines/${routine.id}?tab=triggers`);
    },
    onError: (err) => {
      pushToast({
        title: "Could not create routine",
        body: err instanceof Error ? err.message : "Doer rejected the request.",
        tone: "error",
      });
    },
  });

  const uploadDescriptionImage = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      return assetsApi.uploadImage(selectedCompanyId, file, "routines/drafts");
    },
  });

  const canSubmit =
    !!selectedCompanyId &&
    !!title.trim() &&
    !!appliedProjectId &&
    !!appliedAssigneeAgentId &&
    !createRoutine.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    createRoutine.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const currentProject = projectOptions.find((p) => p.id === appliedProjectId);
  const currentAssignee = (agents ?? []).find(
    (a) => a.id === appliedAssigneeAgentId,
  );

  return (
    <Dialog
      open={newRoutineOpen}
      onOpenChange={(open) => {
        if (!open) closeNewRoutine();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn("p-0 gap-0", expanded ? "sm:max-w-2xl" : "sm:max-w-lg")}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {selectedCompany && (
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-medium">
                {selectedCompany.name.slice(0, 3).toUpperCase()}
              </span>
            )}
            <span className="text-muted-foreground/60">&rsaquo;</span>
            <span className="inline-flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" />
              New routine
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => closeNewRoutine()}
            >
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <input
            className="w-full text-lg font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50"
            placeholder="Routine title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                descriptionEditorRef.current?.focus();
              }
            }}
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="px-4 pb-2">
          <MarkdownEditor
            ref={descriptionEditorRef}
            value={description}
            onChange={setDescription}
            placeholder="Describe what this routine does when it runs…"
            bordered={false}
            contentClassName={cn(
              "text-sm text-muted-foreground",
              expanded ? "min-h-[220px]" : "min-h-[120px]",
            )}
            imageUploadHandler={async (file) => {
              const asset = await uploadDescriptionImage.mutateAsync(file);
              return asset.contentPath;
            }}
          />
        </div>

        {/* Property chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-border flex-wrap">
          {/* Project (required) */}
          <InlineEntitySelector
            value={appliedProjectId}
            options={projectOptions}
            placeholder="Project"
            noneLabel="No project"
            searchPlaceholder="Search projects…"
            emptyMessage="No projects found"
            onChange={setProjectId}
            disablePortal
            renderTriggerValue={(opt) => (
              <span className="inline-flex items-center gap-1.5">
                <Hexagon className="h-3 w-3 text-muted-foreground" />
                {opt?.label ?? "Project"}
              </span>
            )}
          />

          {/* Assignee agent (required) */}
          <InlineEntitySelector
            value={appliedAssigneeAgentId}
            options={agentOptions}
            placeholder="Assignee"
            noneLabel="No assignee"
            searchPlaceholder="Search agents…"
            emptyMessage="No agents found"
            onChange={setAssigneeAgentId}
            disablePortal
            renderTriggerValue={(opt) => {
              const agent = agents?.find((a) => a.id === opt?.id);
              return (
                <span className="inline-flex items-center gap-1.5">
                  {agent ? (
                    <AgentIcon icon={agent.icon} className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Bot className="h-3 w-3 text-muted-foreground" />
                  )}
                  {opt?.label ?? "Assignee"}
                </span>
              );
            }}
          />

          {/* Priority */}
          <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors capitalize">
                {priorityIcon[priority]}
                {priority}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {ISSUE_PRIORITIES.map((p) => (
                <button
                  key={p}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 capitalize",
                    p === priority && "bg-accent",
                  )}
                  onClick={() => {
                    setPriority(p);
                    setPriorityOpen(false);
                  }}
                >
                  {priorityIcon[p]}
                  {p}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Advanced toggle */}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            {advancedOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Advanced
          </button>
        </div>

        {/* Advanced panel */}
        {advancedOpen && (
          <div className="px-4 py-3 border-t border-border space-y-3 bg-muted/30">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Concurrency policy
              </div>
              <div className="grid grid-cols-1 gap-1">
                {ROUTINE_CONCURRENCY_POLICIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      "text-left px-2 py-1.5 rounded text-xs hover:bg-accent/40 transition-colors",
                      p === concurrencyPolicy &&
                        "bg-accent border border-border/60",
                    )}
                    onClick={() => setConcurrencyPolicy(p)}
                  >
                    <div className="font-medium">{formatPolicyName(p)}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {concurrencyPolicyDescriptions[p]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Catch-up policy
              </div>
              <div className="grid grid-cols-1 gap-1">
                {ROUTINE_CATCH_UP_POLICIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      "text-left px-2 py-1.5 rounded text-xs hover:bg-accent/40 transition-colors",
                      p === catchUpPolicy &&
                        "bg-accent border border-border/60",
                    )}
                    onClick={() => setCatchUpPolicy(p)}
                  >
                    <div className="font-medium">{formatPolicyName(p)}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {catchUpPolicyDescriptions[p]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {!appliedProjectId
              ? "Pick a project"
              : !appliedAssigneeAgentId
                ? "Pick an assignee"
                : currentProject && currentAssignee
                  ? `Will run as ${currentAssignee.name} in ${currentProject.label}`
                  : ""}
          </div>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            {createRoutine.isPending ? "Creating…" : "Create routine"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
