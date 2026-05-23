// packages/shared/src/council.ts

export type SessionTypeId = "full_council" | "interview" | "bidding" | string;
export type SessionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "completed_with_errors";
export type InvocationMode = "parallel" | "sequential";
export type ResolutionMode = "orchestrator" | "user_approval" | "auto";
export type CouncilAgentRole = "member" | "orchestrator" | "guest";

export interface IssueProposal {
  title: string;
  description?: string;
  priority?: "critical" | "high" | "medium" | "low";
  assigneeAgentId?: string;
  goalId?: string;
}

export interface AgentAddress {
  agentId: string;
  agentName: string;
  role: CouncilAgentRole;
  content: string;
  reasoning?: string;
  issueProposals: IssueProposal[];
  timestamp: string; // ISO 8601
  status: "completed" | "failed";
  error?: string;
}

export interface SessionDecision {
  summary: string;
  reasoning: string;
  issueProposals: IssueProposal[];
  orchestratorAgentId: string;
  timestamp: string; // ISO 8601
}

export interface CouncilParticipant {
  agentId: string;
  role: CouncilAgentRole;
}

export interface CouncilAgendaConfig {
  prompts: string[];
  perAgent: Record<string, string>; // agentId → directive
  outputConstraints: {
    minIssues: number;
    maxIssues: number;
  };
}

export interface CouncilConfig {
  companyId: string;
  enabledSessionTypes: SessionTypeId[];
  defaultSessionTypeId: SessionTypeId;
  invocationMode: InvocationMode;
  resolutionMode: ResolutionMode;
  schedule?: string; // cron, optional
  agenda: CouncilAgendaConfig;
  participants: Record<SessionTypeId, CouncilParticipant[]>; // per session type
}

export interface CouncilSession {
  id: string;
  companyId: string;
  sessionTypeId: SessionTypeId;
  status: SessionStatus;
  invocationMode: InvocationMode;
  resolutionMode: ResolutionMode;
  context: Record<string, unknown>;
  transcript: AgentAddress[];
  decision: SessionDecision | null;
  issuesCreated: string[];
  triggeredBy: "schedule" | "manual" | "api";
  error?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CouncilSessionContext {
  companyId: string;
  sessionTypeId: SessionTypeId;
  activeGoals: { id: string; title: string; level: string }[];
  openIssueCount: number;
  recentActivity: string[];
  budgetRemaining: number;
  agenda: string[];
  customContext: Record<string, unknown>;
}
