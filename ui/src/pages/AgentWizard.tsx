import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { useCompany } from "../context/CompanyContext";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { cn, agentUrl } from "../lib/utils";
import {
  Bot,
  FileSearch,
  PenLine,
  ShoppingCart,
  FolderKanban,
  Headset,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
} from "lucide-react";

// ─── Templates ───────────────────────────────────────────────────────────────

type Template = {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  role: string;
  instructions: string;
  tone: string;
};

const TEMPLATES: Template[] = [
  {
    id: "researcher",
    icon: <FileSearch className="h-6 w-6" />,
    name: "Research Agent",
    description: "Finds, summarises, and synthesises information on any topic.",
    role: "general",
    tone: "Technical",
    instructions:
      "You are a research specialist. When given a topic, gather comprehensive information, evaluate source credibility, and produce clear, structured summaries with key insights and open questions.",
  },
  {
    id: "writer",
    icon: <PenLine className="h-6 w-6" />,
    name: "Content Writer",
    description: "Drafts, edits, and polishes written content at scale.",
    role: "general",
    tone: "Creative",
    instructions:
      "You are a professional content writer. Create engaging, well-structured content tailored to the target audience. Adapt tone and style as requested. Proofread carefully before delivery.",
  },
  {
    id: "sales",
    icon: <ShoppingCart className="h-6 w-6" />,
    name: "Sales Assistant",
    description: "Qualifies leads, drafts outreach, and tracks pipeline tasks.",
    role: "general",
    tone: "Professional",
    instructions:
      "You are a sales assistant focused on converting leads into customers. Qualify prospects, personalise outreach messages, follow up diligently, and log all activities clearly.",
  },
  {
    id: "pm",
    icon: <FolderKanban className="h-6 w-6" />,
    name: "Project Manager",
    description: "Coordinates tasks, tracks blockers, and keeps teams aligned.",
    role: "manager",
    tone: "Direct",
    instructions:
      "You are a project manager. Break work into clear tasks, assign ownership, track progress, surface blockers early, and ensure the team ships on schedule.",
  },
  {
    id: "support",
    icon: <Headset className="h-6 w-6" />,
    name: "Customer Support",
    description: "Resolves tickets and delivers consistent customer experiences.",
    role: "general",
    tone: "Casual",
    instructions:
      "You are a customer support specialist. Respond promptly and empathetically to customer queries, resolve issues efficiently, and escalate when needed. Always leave customers feeling heard.",
  },
  {
    id: "custom",
    icon: <Wand2 className="h-6 w-6" />,
    name: "Custom",
    description: "Start from scratch — describe exactly what you need.",
    role: "general",
    tone: "Professional",
    instructions: "",
  },
];

const TONES = ["Professional", "Casual", "Technical", "Creative", "Direct"];

const STEP_LABELS = [
  "Purpose",
  "Personality",
  "Skills",
  "Tasks",
  "Review",
];

// ─── Wizard State ─────────────────────────────────────────────────────────────

type WizardState = {
  templateId: string;
  customDescription: string;
  tone: string;
  agentName: string;
  customInstructions: string;
  toolToggles: Record<string, boolean>;
  taskReceipt: "manual" | "auto" | "scheduled";
  defaultPriority: "critical" | "high" | "medium" | "low";
};

const INITIAL_STATE: WizardState = {
  templateId: "",
  customDescription: "",
  tone: "Professional",
  agentName: "",
  customInstructions: "",
  toolToggles: { web_search: false, code_execution: false },
  taskReceipt: "manual",
  defaultPriority: "medium",
};

// ─── Step Components ──────────────────────────────────────────────────────────

function StepPurpose({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">What will this agent do?</h2>
        <p className="text-sm text-muted-foreground mt-1">Pick a template or describe your own.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              const name = state.agentName || (t.id !== "custom" ? t.name : "");
              const tone = t.id !== "custom" ? t.tone : state.tone;
              setState({ ...state, templateId: t.id, agentName: name, tone });
            }}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
              state.templateId === t.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50",
            )}
          >
            <span className="mt-0.5 shrink-0 text-muted-foreground">{t.icon}</span>
            <div>
              <div className="font-medium text-sm">{t.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
            </div>
            {state.templateId === t.id && (
              <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
          </button>
        ))}
      </div>

      {state.templateId === "custom" && (
        <div className="mt-2">
          <label className="text-xs text-muted-foreground mb-1 block">Describe your agent</label>
          <textarea
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
            rows={4}
            placeholder="E.g. An agent that monitors competitor websites and sends me weekly digests..."
            value={state.customDescription}
            onChange={(e) => setState({ ...state, customDescription: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

function StepPersonality({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Agent personality</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure how this agent communicates.</p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Agent name</label>
        <input
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g. Research Bot"
          value={state.agentName}
          onChange={(e) => setState({ ...state, agentName: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => setState({ ...state, tone })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                state.tone === tone
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Custom instructions <span className="text-muted-foreground/60">(optional, max 500 chars)</span>
        </label>
        <textarea
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
          rows={3}
          maxLength={500}
          placeholder="Any specific behaviors or constraints for this agent..."
          value={state.customInstructions}
          onChange={(e) => setState({ ...state, customInstructions: e.target.value })}
        />
        <p className="text-xs text-muted-foreground/60 text-right mt-0.5">
          {state.customInstructions.length}/500
        </p>
      </div>
    </div>
  );
}

function StepSkills({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  const tools: { key: string; label: string; description: string }[] = [
    { key: "web_search", label: "Web search", description: "Search the internet for up-to-date information." },
    { key: "code_execution", label: "Code execution", description: "Run scripts and analyze data programmatically." },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Tools & capabilities</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose what this agent can access.</p>
      </div>

      <div className="space-y-3">
        {tools.map((tool) => (
          <div
            key={tool.key}
            className="flex items-start gap-3 rounded-lg border border-border p-4"
          >
            <input
              id={`tool-${tool.key}`}
              type="checkbox"
              className="mt-0.5"
              checked={!!state.toolToggles[tool.key]}
              onChange={(e) =>
                setState({
                  ...state,
                  toolToggles: { ...state.toolToggles, [tool.key]: e.target.checked },
                })
              }
            />
            <label htmlFor={`tool-${tool.key}`} className="cursor-pointer">
              <div className="text-sm font-medium">{tool.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{tool.description}</div>
            </label>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        <User className="h-5 w-5 mx-auto mb-2 opacity-40" />
        Document upload and URL ingestion coming soon
      </div>
    </div>
  );
}

function StepTasks({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  const receipts: { value: WizardState["taskReceipt"]; label: string; description: string }[] = [
    { value: "manual", label: "Manual", description: "Tasks are assigned by a human or manager agent." },
    { value: "auto", label: "Auto-assign", description: "Agent picks up matching unassigned tasks automatically." },
    { value: "scheduled", label: "Scheduled", description: "Agent wakes on a recurring schedule." },
  ];
  const priorities: WizardState["defaultPriority"][] = ["critical", "high", "medium", "low"];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Task configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">How should this agent receive and handle work?</p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Task receipt</label>
        <div className="space-y-2">
          {receipts.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setState({ ...state, taskReceipt: r.value })}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                state.taskReceipt === r.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                  state.taskReceipt === r.value ? "border-primary" : "border-muted-foreground/40",
                )}
              >
                {state.taskReceipt === r.value && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Default priority</label>
        <div className="flex gap-2">
          {priorities.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setState({ ...state, defaultPriority: p })}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                state.defaultPriority === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepReview({
  state,
  onEdit,
}: {
  state: WizardState;
  onEdit: (step: number) => void;
}) {
  const template = TEMPLATES.find((t) => t.id === state.templateId);
  const activeTools = Object.entries(state.toolToggles)
    .filter(([, v]) => v)
    .map(([k]) => k.replace("_", " "));

  function Row({ label, value, step }: { label: string; value: string; step: number }) {
    return (
      <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-sm mt-0.5">{value}</div>
        </div>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ml-4 shrink-0"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Review & create</h2>
        <p className="text-sm text-muted-foreground mt-1">Confirm your agent configuration.</p>
      </div>

      <div className="rounded-lg border border-border px-4">
        <Row label="Template" value={template?.name ?? "—"} step={0} />
        <Row label="Name" value={state.agentName || "—"} step={1} />
        <Row label="Tone" value={state.tone} step={1} />
        {state.customInstructions && (
          <Row label="Custom instructions" value={state.customInstructions} step={1} />
        )}
        <Row
          label="Tools"
          value={activeTools.length > 0 ? activeTools.join(", ") : "None"}
          step={2}
        />
        <Row label="Task receipt" value={state.taskReceipt} step={3} />
        <Row label="Default priority" value={state.defaultPriority} step={3} />
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

function buildAgentPayload(state: WizardState): Record<string, unknown> {
  const template = TEMPLATES.find((t) => t.id === state.templateId);
  const baseInstructions = template?.id !== "custom" ? template?.instructions ?? "" : state.customDescription;
  const tonePrefix = `Tone: ${state.tone}. `;
  const combinedInstructions = [
    tonePrefix + baseInstructions,
    state.customInstructions,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    name: state.agentName || template?.name || "New Agent",
    role: template?.role ?? "general",
    adapterType: "claude_local",
    adapterConfig: {
      cwd: "",
      instructionsFilePath: "",
      promptTemplate: combinedInstructions,
      model: "",
      dangerouslySkipPermissions: true,
      heartbeatEnabled: state.taskReceipt === "scheduled",
      intervalSec: 300,
      search: state.toolToggles["web_search"] ?? false,
    },
  };
}

export function AgentWizard() {
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      agentsApi.create(selectedCompanyId!, buildAgentPayload(state)),
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
      navigate(agentUrl(agent as { id: string; urlKey?: string | null }));
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    },
  });

  const canAdvance = () => {
    if (step === 0) return Boolean(state.templateId);
    if (step === 1) return state.agentName.trim().length > 0;
    return true;
  };

  function advance() {
    if (step < 4) setStep(step + 1);
    else {
      setError(null);
      createMutation.mutate();
    }
  }

  const STEPS = [
    <StepPurpose key="purpose" state={state} setState={setState} />,
    <StepPersonality key="personality" state={state} setState={setState} />,
    <StepSkills key="skills" state={state} setState={setState} />,
    <StepTasks key="tasks" state={state} setState={setState} />,
    <StepReview key="review" state={state} onEdit={setStep} />,
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Bot className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">New Agent</span>
      </div>

      {/* Progress */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex items-center gap-1 max-w-2xl mx-auto">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "border-2 border-primary text-primary"
                        : "border border-muted-foreground/30 text-muted-foreground/50",
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs hidden sm:block",
                    i === step ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn("h-px flex-1 mx-1", i < step ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {STEPS[step]}
          {error && <p className="text-xs text-destructive mt-4">{error}</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
          disabled={createMutation.isPending}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={advance}
          disabled={!canAdvance() || createMutation.isPending}
          className={!canAdvance() ? "opacity-50" : ""}
        >
          {createMutation.isPending
            ? "Creating…"
            : step === 4
              ? "Create Agent"
              : "Next"}
          {step < 4 && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
