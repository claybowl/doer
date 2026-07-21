export interface OnboardingCompanyPayload {
  name: string;
}

export interface LocalLettaAgentPayload extends Record<string, unknown> {
  name: string;
  role: "general";
  adapterType: "letta_code";
  adapterConfig: {
    backend: "local";
    permissionMode: "standard";
    modsEnabled: true;
  };
}

export function normalizedOnboardingName(value: string): string {
  return value.trim();
}

export function isValidOnboardingName(value: string): boolean {
  return normalizedOnboardingName(value).length > 0;
}

export function buildOnboardingCompanyPayload(value: string): OnboardingCompanyPayload {
  return { name: normalizedOnboardingName(value) };
}

export function buildLocalLettaAgentPayload(value: string): LocalLettaAgentPayload {
  return {
    name: normalizedOnboardingName(value),
    role: "general",
    adapterType: "letta_code",
    adapterConfig: {
      backend: "local",
      permissionMode: "standard",
      modsEnabled: true,
    },
  };
}

export function getOnboardingCompanyRoute(issuePrefix: string): string {
  return `/${encodeURIComponent(issuePrefix.trim())}`;
}
