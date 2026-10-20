import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the drizzle adapter and better-auth to avoid real DB calls
const mockBetterAuth = vi.hoisted(() => vi.fn(() => ({ handler: true })));
const mockDrizzleAdapter = vi.hoisted(() => vi.fn(() => ({ adapter: true })));
const mockToNodeHandler = vi.hoisted(() => vi.fn(() => (req: any, res: any) => { res.json({ ok: true }); }));

vi.mock("better-auth", () => ({
  betterAuth: mockBetterAuth,
}));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: mockDrizzleAdapter,
}));
vi.mock("better-auth/node", () => ({
  toNodeHandler: mockToNodeHandler,
}));

vi.mock("../email/mailer.js", () => ({
  createMailer: vi.fn(() => ({
    sendMail: vi.fn(),
  })),
}));

import { createBetterAuthInstance, deriveAuthTrustedOrigins } from "../auth/better-auth.js";
import type { Config } from "../config.js";

function createMockConfig(overrides: Partial<Config> = {}): Config {
  return {
    deploymentMode: "local_trusted",
    deploymentExposure: "private",
    host: "127.0.0.1",
    port: 3100,
    allowedHostnames: [],
    authBaseUrlMode: "auto",
    authPublicBaseUrl: undefined,
    authDisableSignUp: false,
    oauthGoogleClientId: undefined,
    oauthGoogleClientSecret: undefined,
    oauthGithubClientId: undefined,
    oauthGithubClientSecret: undefined,
    smtpHost: undefined,
    smtpPort: 587,
    smtpUser: undefined,
    smtpPass: undefined,
    smtpFrom: "Doer <noreply@doer.local>",
    smtpSecure: false,
    authEmailVerificationEnabled: false,
    authEmailPasswordResetEnabled: false,
    databaseMode: "embedded-postgres",
    databaseUrl: undefined,
    embeddedPostgresDataDir: "/tmp/test",
    embeddedPostgresPort: 54329,
    databaseBackupEnabled: false,
    databaseBackupIntervalMinutes: 60,
    databaseBackupRetentionDays: 30,
    databaseBackupDir: "/tmp/test",
    serveUi: true,
    uiDevMiddleware: false,
    secretsProvider: "local_encrypted",
    secretsStrictMode: false,
    secretsMasterKeyFilePath: "/tmp/test",
    storageProvider: "local_disk",
    storageLocalDiskBaseDir: "/tmp/test",
    storageS3Bucket: "doer",
    storageS3Region: "us-east-1",
    storageS3Endpoint: undefined,
    storageS3Prefix: "",
    storageS3ForcePathStyle: false,
    heartbeatSchedulerEnabled: true,
    heartbeatSchedulerIntervalMs: 30000,
    companyDeletionEnabled: true,
    ...overrides,
  } as Config;
}

describe("Google OAuth configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes Google social provider when credentials are set", () => {
    const config = createMockConfig({
      oauthGoogleClientId: "test-client-id.apps.googleusercontent.com",
      oauthGoogleClientSecret: "test-client-secret",
    });

    createBetterAuthInstance({} as any, config);

    expect(mockBetterAuth).toHaveBeenCalledTimes(1);
    const authConfig = mockBetterAuth.mock.calls[0][0];

    expect(authConfig.socialProviders).toBeDefined();
    expect(authConfig.socialProviders.google).toBeDefined();
    expect(authConfig.socialProviders.google.clientId).toBe("test-client-id.apps.googleusercontent.com");
    expect(authConfig.socialProviders.google.clientSecret).toBe("test-client-secret");
  });

  it("does not include Google social provider when credentials are missing", () => {
    const config = createMockConfig({
      oauthGoogleClientId: undefined,
      oauthGoogleClientSecret: undefined,
    });

    createBetterAuthInstance({} as any, config);

    const authConfig = mockBetterAuth.mock.calls[0][0];
    expect(authConfig.socialProviders.google).toBeUndefined();
  });

  it("does not include Google social provider when only client ID is set", () => {
    const config = createMockConfig({
      oauthGoogleClientId: "test-client-id",
      oauthGoogleClientSecret: undefined,
    });

    createBetterAuthInstance({} as any, config);

    const authConfig = mockBetterAuth.mock.calls[0][0];
    expect(authConfig.socialProviders.google).toBeUndefined();
  });

  it("includes GitHub social provider when credentials are set", () => {
    const config = createMockConfig({
      oauthGithubClientId: "gh-client-id",
      oauthGithubClientSecret: "gh-client-secret",
    });

    createBetterAuthInstance({} as any, config);

    const authConfig = mockBetterAuth.mock.calls[0][0];
    expect(authConfig.socialProviders.github).toBeDefined();
    expect(authConfig.socialProviders.github.clientId).toBe("gh-client-id");
    expect(authConfig.socialProviders.github.clientSecret).toBe("gh-client-secret");
  });

  it("configures account linking with trusted providers", () => {
    const config = createMockConfig({
      oauthGoogleClientId: "test-id",
      oauthGoogleClientSecret: "test-secret",
    });

    createBetterAuthInstance({} as any, config);

    const authConfig = mockBetterAuth.mock.calls[0][0];
    expect(authConfig.accountLinking).toBeDefined();
    expect(authConfig.accountLinking.enabled).toBe(true);
    expect(authConfig.accountLinking.disableImplicitLinking).toBe(false);
    expect(authConfig.accountLinking.allowDifferentEmails).toBe(false);
    expect(authConfig.accountLinking.trustedProviders).toContain("google");
    expect(authConfig.accountLinking.trustedProviders).toContain("github");
    expect(authConfig.accountLinking.trustedProviders).toContain("email-password");
  });

  it("uses drizzle adapter with correct schema mapping", () => {
    const config = createMockConfig();

    createBetterAuthInstance({} as any, config);

    expect(mockDrizzleAdapter).toHaveBeenCalledTimes(1);
    const adapterArgs = mockDrizzleAdapter.mock.calls[0];
    expect(adapterArgs[1].provider).toBe("pg");
    expect(adapterArgs[1].schema).toBeDefined();
    expect(adapterArgs[1].schema.user).toBeDefined();
    expect(adapterArgs[1].schema.session).toBeDefined();
    expect(adapterArgs[1].schema.account).toBeDefined();
    expect(adapterArgs[1].schema.verification).toBeDefined();
  });

  it("enables rate limiting", () => {
    const config = createMockConfig();

    createBetterAuthInstance({} as any, config);

    const authConfig = mockBetterAuth.mock.calls[0][0];
    expect(authConfig.rateLimit).toBeDefined();
    expect(authConfig.rateLimit.enabled).toBe(true);
  });

  it("respects authDisableSignUp config", () => {
    const config = createMockConfig({ authDisableSignUp: true });

    createBetterAuthInstance({} as any, config);

    const authConfig = mockBetterAuth.mock.calls[0][0];
    expect(authConfig.emailAndPassword.disableSignUp).toBe(true);
  });
});

describe("deriveAuthTrustedOrigins", () => {
  it("returns empty array for local_trusted mode with no explicit base URL", () => {
    const config = createMockConfig({
      deploymentMode: "local_trusted",
      authBaseUrlMode: "auto",
      authPublicBaseUrl: undefined,
    });

    const origins = deriveAuthTrustedOrigins(config);
    expect(origins).toEqual([]);
  });

  it("includes origin from explicit authPublicBaseUrl", () => {
    const config = createMockConfig({
      authBaseUrlMode: "explicit",
      authPublicBaseUrl: "https://doer.example.com",
    });

    const origins = deriveAuthTrustedOrigins(config);
    expect(origins).toContain("https://doer.example.com");
  });

  it("includes allowed hostnames in authenticated mode", () => {
    const config = createMockConfig({
      deploymentMode: "authenticated",
      allowedHostnames: ["doer.example.com", "localhost"],
    });

    const origins = deriveAuthTrustedOrigins(config);
    expect(origins).toContain("https://doer.example.com");
    expect(origins).toContain("http://doer.example.com");
    expect(origins).toContain("https://localhost");
    expect(origins).toContain("http://localhost");
  });
});
