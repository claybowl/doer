import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Layout } from "./components/Layout";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { authApi } from "./api/auth";
import { healthApi } from "./api/health";
import { Dashboard } from "./pages/Dashboard";
import { Companies } from "./pages/Companies";
import { Agents } from "./pages/Agents";
import { AgentDetail } from "./pages/AgentDetail";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Issues } from "./pages/Issues";
import { IssueDetail } from "./pages/IssueDetail";
import { Routines } from "./pages/Routines";
import { RoutineDetail } from "./pages/RoutineDetail";
import { ExecutionWorkspaceDetail } from "./pages/ExecutionWorkspaceDetail";
import { Goals } from "./pages/Goals";
import { GoalDetail } from "./pages/GoalDetail";
import { Approvals } from "./pages/Approvals";
import { ApprovalDetail } from "./pages/ApprovalDetail";
import { Costs } from "./pages/Costs";
import { Activity } from "./pages/Activity";
import { Inbox } from "./pages/Inbox";
import { CompanySettings } from "./pages/CompanySettings";
import { CompanySkills } from "./pages/CompanySkills";
import { CompanyExport } from "./pages/CompanyExport";
import { CompanyImport } from "./pages/CompanyImport";
import { Webhooks } from "./pages/Webhooks";
import { ForgotPasswordPage } from "./pages/ForgotPassword";
import { ResetPasswordPage } from "./pages/ResetPassword";
import { VerifyEmailPage } from "./pages/VerifyEmail";
import { AgentWizard } from "./pages/AgentWizard";
import { LandingPage } from "./pages/LandingPage";
import { PricingPage } from "./pages/PricingPage";
import { DesignGuide } from "./pages/DesignGuide";
import { InstanceGeneralSettings } from "./pages/InstanceGeneralSettings";
import { InstanceSettings } from "./pages/InstanceSettings";
import { InstanceExperimentalSettings } from "./pages/InstanceExperimentalSettings";
import { PluginManager } from "./pages/PluginManager";
import { PluginSettings } from "./pages/PluginSettings";
import { AdapterManager } from "./pages/AdapterManager";
import { PluginPage } from "./pages/PluginPage";
import { CompanyHome } from "./pages/CompanyHome";
import { OrgHQ } from "./pages/OrgHQ";
import { SchruteBenchmark } from "./pages/SchruteBenchmark";
import { RunTranscriptUxLab } from "./pages/RunTranscriptUxLab";
import { OrgChart } from "./pages/OrgChart";
import { NewAgent } from "./pages/NewAgent";
import { AuthPage } from "./pages/Auth";
import { BoardClaimPage } from "./pages/BoardClaim";
import { CliAuthPage } from "./pages/CliAuth";
import { InviteLandingPage } from "./pages/InviteLanding";
import { NotFoundPage } from "./pages/NotFound";
import { FernwehShell } from "./fernweh/FernwehShell";
import { FernwehDashboard } from "./fernweh/FernwehDashboard";
import { FernwehHome } from "./fernweh/FernwehHome";
import { FernwehOrgChart } from "./fernweh/FernwehOrgChart";
import { FernwehAgents } from "./fernweh/FernwehAgents";
import { FernwehWork } from "./fernweh/FernwehWork";
import { FernwehIssues } from "./fernweh/FernwehIssues";
import { FernwehInbox } from "./fernweh/FernwehInbox";
import { FernwehActivity } from "./fernweh/FernwehActivity";
import { FernwehApprovals } from "./fernweh/FernwehApprovals";
import { FernwehCosts } from "./fernweh/FernwehCosts";
import { FernwehMemory } from "./fernweh/FernwehMemory";
import { FernwehGoals } from "./fernweh/FernwehGoals";
import { FernwehRoutines } from "./fernweh/FernwehRoutines";
import { FernwehGoalDetail } from "./fernweh/FernwehGoalDetail";
import { FernwehRoutineDetail } from "./fernweh/FernwehRoutineDetail";
import { FernwehSchruteBenchmark } from "./fernweh/FernwehSchruteBenchmark";
import { FernwehWikiGraph } from "./fernweh/FernwehWikiGraph";
import { FernwehCouncil } from "./fernweh/FernwehCouncil";
import { FernwehProjects } from "./fernweh/FernwehProjects";
import { FernwehAgentDetail } from "./fernweh/FernwehAgentDetail";
import { FernwehNewAgent } from "./fernweh/FernwehNewAgent";
import { FernwehDeliverables } from "./fernweh/FernwehDeliverables";
import { FernwehIssueDetail } from "./fernweh/FernwehIssueDetail";
import { FernwehApprovalDetail } from "./fernweh/FernwehApprovalDetail";
import { FernwehProjectDetail } from "./fernweh/FernwehProjectDetail";
import { FernwehPreferences } from "./fernweh/FernwehPreferences";
import { FernwehInstanceSettings } from "./fernweh/FernwehInstanceSettings";
import { FernwehCompanySettings } from "./fernweh/FernwehCompanySettings";
import { FernwehCompanySkills } from "./fernweh/FernwehCompanySkills";
import { FernwehCompanyExport } from "./fernweh/FernwehCompanyExport";
import { FernwehCompanyImport } from "./fernweh/FernwehCompanyImport";
import { FernwehCompanies } from "./fernweh/FernwehCompanies";
import { FernwehDesignGuide } from "./fernweh/FernwehDesignGuide";
import { FernwehWebhooks } from "./fernweh/FernwehWebhooks";
import { FernwehExecutionWorkspaceDetail } from "./fernweh/FernwehExecutionWorkspaceDetail";
import { FernwehRunDetail } from "./fernweh/FernwehRunDetail";
import { FernwehCompanyBranding } from "./fernweh/FernwehCompanyBranding";
import { PortalPage } from "./portal/PortalPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ApiHealthBanner } from "./components/ApiHealthBanner";
import { queryKeys } from "./lib/queryKeys";
import { useCompany } from "./context/CompanyContext";
import { useDialog } from "./context/DialogContext";
import { loadLastInboxTab } from "./lib/inbox";
import { shouldRedirectCompanylessRouteToOnboarding } from "./lib/onboarding-route";

function BootstrapPendingPage({ hasActiveInvite = false }: { hasActiveInvite?: boolean }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Instance setup required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasActiveInvite
            ? "No instance admin exists yet. A bootstrap invite is already active. Check your Doer startup logs for the first admin invite URL, or run this command to rotate it:"
            : "No instance admin exists yet. Run this command in your Doer environment to generate the first admin invite URL:"}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
{`pnpm doerai auth bootstrap-ceo`}
        </pre>
      </div>
    </div>
  );
}

function CloudAccessGate() {
  const location = useLocation();
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as
        | { deploymentMode?: "local_trusted" | "authenticated"; bootstrapStatus?: "ready" | "bootstrap_pending" }
        | undefined;
      return data?.deploymentMode === "authenticated" && data.bootstrapStatus === "bootstrap_pending"
        ? 2000
        : false;
    },
    refetchIntervalInBackground: true,
  });

  const isAuthenticatedMode = healthQuery.data?.deploymentMode === "authenticated";
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    enabled: isAuthenticatedMode,
    retry: false,
  });

  if (healthQuery.isLoading || (isAuthenticatedMode && sessionQuery.isLoading)) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading...</div>;
  }

  if (healthQuery.error) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-destructive">
        {healthQuery.error instanceof Error ? healthQuery.error.message : "Failed to load app state"}
      </div>
    );
  }

  if (isAuthenticatedMode && healthQuery.data?.bootstrapStatus === "bootstrap_pending") {
    return <BootstrapPendingPage hasActiveInvite={healthQuery.data.bootstrapInviteActive} />;
  }

  if (isAuthenticatedMode && !sessionQuery.data) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  return <Outlet />;
}

function boardRoutes() {
  return (
    <>
      <Route index element={<CompanyHome />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="hq" element={<OrgHQ />} />
      <Route path="schrute-benchmark" element={<SchruteBenchmark />} />
      <Route path="onboarding" element={<OnboardingRoutePage />} />
      <Route path="companies" element={<Companies />} />
      <Route path="company/settings" element={<CompanySettings />} />
      <Route path="company/webhooks" element={<Webhooks />} />
      <Route path="company/export/*" element={<CompanyExport />} />
      <Route path="company/import" element={<CompanyImport />} />
      <Route path="skills/*" element={<CompanySkills />} />
      <Route path="settings" element={<LegacySettingsRedirect />} />
      <Route path="settings/*" element={<LegacySettingsRedirect />} />
      <Route path="plugins/:pluginId" element={<PluginPage />} />
      <Route path="org" element={<OrgChart />} />
      <Route path="agents" element={<Navigate to="/agents/all" replace />} />
      <Route path="agents/all" element={<Agents />} />
      <Route path="agents/active" element={<Agents />} />
      <Route path="agents/paused" element={<Agents />} />
      <Route path="agents/error" element={<Agents />} />
      <Route path="agents/new" element={<NewAgent />} />
      <Route path="agents/wizard" element={<AgentWizard />} />
      <Route path="agents/:agentId" element={<AgentDetail />} />
      <Route path="agents/:agentId/:tab" element={<AgentDetail />} />
      <Route path="agents/:agentId/runs/:runId" element={<AgentDetail />} />
      <Route path="projects" element={<Projects />} />
      <Route path="projects/:projectId" element={<ProjectDetail />} />
      <Route path="projects/:projectId/overview" element={<ProjectDetail />} />
      <Route path="projects/:projectId/issues" element={<ProjectDetail />} />
      <Route path="projects/:projectId/issues/:filter" element={<ProjectDetail />} />
      <Route path="projects/:projectId/configuration" element={<ProjectDetail />} />
      <Route path="projects/:projectId/budget" element={<ProjectDetail />} />
      <Route path="issues" element={<Issues />} />
      <Route path="issues/all" element={<Navigate to="/issues" replace />} />
      <Route path="issues/active" element={<Navigate to="/issues" replace />} />
      <Route path="issues/backlog" element={<Navigate to="/issues" replace />} />
      <Route path="issues/done" element={<Navigate to="/issues" replace />} />
      <Route path="issues/recent" element={<Navigate to="/issues" replace />} />
      <Route path="issues/:issueId" element={<IssueDetail />} />
      <Route path="routines" element={<Routines />} />
      <Route path="routines/:routineId" element={<RoutineDetail />} />
      <Route path="execution-workspaces/:workspaceId" element={<ExecutionWorkspaceDetail />} />
      <Route path="goals" element={<Goals />} />
      <Route path="goals/:goalId" element={<GoalDetail />} />
      <Route path="approvals" element={<Navigate to="/approvals/pending" replace />} />
      <Route path="approvals/pending" element={<Approvals />} />
      <Route path="approvals/all" element={<Approvals />} />
      <Route path="approvals/:approvalId" element={<ApprovalDetail />} />
      <Route path="costs" element={<Costs />} />
      <Route path="activity" element={<Activity />} />
      <Route path="inbox" element={<InboxRootRedirect />} />
      <Route path="inbox/recent" element={<Inbox />} />
      <Route path="inbox/unread" element={<Inbox />} />
      <Route path="inbox/all" element={<Inbox />} />
      <Route path="inbox/new" element={<Navigate to="/inbox/recent" replace />} />
      <Route path="design-guide" element={<DesignGuide />} />
      <Route path="tests/ux/runs" element={<RunTranscriptUxLab />} />
      <Route path="instance/settings/adapters" element={<AdapterManager />} />
      <Route path=":pluginRoutePath" element={<PluginPage />} />
      <Route path="*" element={<NotFoundPage scope="board" />} />
    </>
  );
}

function InboxRootRedirect() {
  return <Navigate to={`/inbox/${loadLastInboxTab()}`} replace />;
}

function LegacySettingsRedirect() {
  const location = useLocation();
  return <Navigate to={`/instance/settings/general${location.search}${location.hash}`} replace />;
}

function OnboardingRoutePage() {
  const { companies } = useCompany();
  const { openOnboarding } = useDialog();
  const { companyPrefix } = useParams<{ companyPrefix?: string }>();
  const matchedCompany = companyPrefix
    ? companies.find((company) => company.issuePrefix.toUpperCase() === companyPrefix.toUpperCase()) ?? null
    : null;

  const title = matchedCompany
    ? `Add another agent to ${matchedCompany.name}`
    : companies.length > 0
      ? "Create another company"
      : "Create your first company";
  const description = matchedCompany
    ? "Run onboarding again to add an agent and a starter task for this company."
    : companies.length > 0
      ? "Run onboarding again to create another company and seed its first agent."
      : "Get started by creating a company and your first agent.";

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <Button
            onClick={() =>
              matchedCompany
                ? openOnboarding({ initialStep: 2, companyId: matchedCompany.id })
                : openOnboarding()
            }
          >
            {matchedCompany ? "Add Agent" : "Start Onboarding"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompanyRootRedirect() {
  const { companies, selectedCompany, loading } = useCompany();
  const location = useLocation();

  if (loading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading...</div>;
  }

  const targetCompany = selectedCompany ?? companies[0] ?? null;
  if (!targetCompany) {
    if (
      shouldRedirectCompanylessRouteToOnboarding({
        pathname: location.pathname,
        hasCompanies: false,
      })
    ) {
      return <Navigate to="/onboarding" replace />;
    }
    return <NoCompaniesStartPage />;
  }

  return <Navigate to={`/${targetCompany.issuePrefix}`} replace />;
}

function UnprefixedBoardRedirect() {
  const location = useLocation();
  const { companies, selectedCompany, loading } = useCompany();

  if (loading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading...</div>;
  }

  const targetCompany = selectedCompany ?? companies[0] ?? null;
  if (!targetCompany) {
    if (
      shouldRedirectCompanylessRouteToOnboarding({
        pathname: location.pathname,
        hasCompanies: false,
      })
    ) {
      return <Navigate to="/onboarding" replace />;
    }
    return <NoCompaniesStartPage />;
  }

  return (
    <Navigate
      to={`/${targetCompany.issuePrefix}${location.pathname}${location.search}${location.hash}`}
      replace
    />
  );
}

function NoCompaniesStartPage() {
  const { openOnboarding } = useDialog();

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Create your first company</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by creating a company.
        </p>
        <div className="mt-4">
          <Button onClick={() => openOnboarding()}>New Company</Button>
        </div>
      </div>
    </div>
  );
}

function IssueToWorkRedirect() {
  const { issueId } = useParams<{ issueId: string }>();
  return <Navigate to={`../work/${issueId}`} replace />;
}

export function App() {
  return (
    <>
      <ApiHealthBanner />
      <ErrorBoundary>
        <Routes>
        <Route path="landing" element={<LandingPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="board-claim/:token" element={<BoardClaimPage />} />
        <Route path="cli-auth/:id" element={<CliAuthPage />} />
        <Route path="invite/:token" element={<InviteLandingPage />} />
        <Route path="portal/:token" element={<PortalPage />} />

        <Route element={<CloudAccessGate />}>
          <Route index element={<CompanyRootRedirect />} />
          <Route path="onboarding" element={<OnboardingRoutePage />} />
          <Route path="instance" element={<Navigate to="/instance/settings/general" replace />} />
          <Route path="instance/settings" element={<Layout />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<InstanceGeneralSettings />} />
            <Route path="heartbeats" element={<InstanceSettings />} />
            <Route path="experimental" element={<InstanceExperimentalSettings />} />
            <Route path="plugins" element={<PluginManager />} />
            <Route path="plugins/:pluginId" element={<PluginSettings />} />
            <Route path="adapters" element={<AdapterManager />} />
          </Route>
          <Route path="companies" element={<UnprefixedBoardRedirect />} />
          <Route path="issues" element={<UnprefixedBoardRedirect />} />
          <Route path="issues/:issueId" element={<UnprefixedBoardRedirect />} />
          <Route path="routines" element={<UnprefixedBoardRedirect />} />
          <Route path="routines/:routineId" element={<UnprefixedBoardRedirect />} />
          <Route path="skills/*" element={<UnprefixedBoardRedirect />} />
          <Route path="settings" element={<LegacySettingsRedirect />} />
          <Route path="settings/*" element={<LegacySettingsRedirect />} />
          <Route path="agents" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/new" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/:agentId" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/:agentId/:tab" element={<UnprefixedBoardRedirect />} />
          <Route path="agents/:agentId/runs/:runId" element={<UnprefixedBoardRedirect />} />
          <Route path="projects" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/overview" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/issues" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/issues/:filter" element={<UnprefixedBoardRedirect />} />
          <Route path="projects/:projectId/configuration" element={<UnprefixedBoardRedirect />} />
          <Route path="tests/ux/runs" element={<UnprefixedBoardRedirect />} />

          {/* === FERNWEH — DEFAULT UI AT COMPANY ROOT === */}
          <Route path=":companyPrefix" element={<FernwehShell />}>
            <Route index element={<FernwehDashboard />} />
            <Route path="home" element={<FernwehHome />} />
            <Route path="inbox" element={<FernwehInbox />} />
            <Route path="org" element={<FernwehOrgChart />} />
            <Route path="agents" element={<FernwehAgents />} />
            <Route path="agents/new" element={<FernwehNewAgent />} />
            <Route path="agents/:agentId" element={<FernwehAgentDetail />} />
            <Route path="agents/:agentId/:tab" element={<FernwehAgentDetail />} />
            <Route path="agents/:agentId/runs/:runId" element={<FernwehRunDetail />} />
            <Route path="work" element={<FernwehWork />} />
            <Route path="work/:issueId" element={<FernwehIssueDetail />} />
            <Route path="issues" element={<FernwehIssues />} />
            <Route path="issues/:issueId" element={<IssueToWorkRedirect />} />
            <Route path="activity" element={<FernwehActivity />} />
            <Route path="memory" element={<FernwehMemory />} />
            <Route path="outputs" element={<FernwehDeliverables />} />
            <Route path="goals" element={<FernwehGoals />} />
            <Route path="goals/:goalId" element={<FernwehGoalDetail />} />
            <Route path="projects" element={<FernwehProjects />} />
            <Route path="projects/:projectId" element={<FernwehProjectDetail />} />
            <Route path="routines" element={<FernwehRoutines />} />
            <Route path="routines/:routineId" element={<FernwehRoutineDetail />} />
            <Route path="approvals" element={<Navigate to="../approvals/pending" replace />} />
            <Route path="approvals/pending" element={<FernwehApprovals />} />
            <Route path="approvals/all" element={<FernwehApprovals />} />
            <Route path="approvals/:approvalId" element={<FernwehApprovalDetail />} />
            <Route path="costs" element={<FernwehCosts />} />
            <Route path="companies" element={<FernwehCompanies />} />
            <Route path="company" element={<Navigate to="settings" replace />} />
            <Route path="company/settings" element={<FernwehCompanySettings />} />
            <Route path="company/branding" element={<FernwehCompanyBranding />} />
            <Route path="company/skills" element={<FernwehCompanySkills />} />
            <Route path="company/skills/:skillId" element={<FernwehCompanySkills />} />
            <Route path="company/webhooks" element={<FernwehWebhooks />} />
            <Route path="company/export/*" element={<FernwehCompanyExport />} />
            <Route path="company/import" element={<FernwehCompanyImport />} />
            <Route path="preferences" element={<FernwehPreferences />} />
            <Route path="instance" element={<FernwehInstanceSettings />} />
            <Route path="workspaces/:workspaceId" element={<FernwehExecutionWorkspaceDetail />} />
            <Route path="council" element={<FernwehCouncil />} />
            <Route path="benchmark" element={<FernwehSchruteBenchmark />} />
            <Route path="wiki" element={<FernwehWikiGraph />} />
            <Route path="design-guide" element={<FernwehDesignGuide />} />

            {/* Redirect old Fernweh paths */}
            <Route path="fernweh" element={<Navigate to=".." replace />} />
            <Route path="fernweh/*" element={<Navigate to=".." replace />} />

            {/* Redirect old classic paths to Fernweh equivalents */}
            <Route path="dashboard" element={<FernwehDashboard />} />
            <Route path="hq" element={<FernwehDashboard />} />
            <Route path="schrute-benchmark" element={<FernwehSchruteBenchmark />} />
          </Route>

          {/* === CLASSIC UI — accessible at /:companyPrefix/classic === */}
          <Route path=":companyPrefix/classic" element={<Layout />}>
            {boardRoutes()}
          </Route>

          {/* Catch old fernweh-prefixed URLs and redirect */}
          <Route path=":companyPrefix/fernweh" element={<Navigate to=".." replace />} />
          <Route path=":companyPrefix/fernweh/*" element={<Navigate to=".." replace />} />

          <Route path="*" element={<NotFoundPage scope="global" />} />
        </Route>
        </Routes>
      </ErrorBoundary>
      <OnboardingWizard />
    </>
  );
}
