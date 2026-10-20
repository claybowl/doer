import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAccessToken,
  createRefreshToken,
  createTokenPair,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  rotateRefreshToken,
  hashRefreshToken,
  hashJti,
  resolveSessionConfig,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  extractBearerToken,
  extractAccessToken,
  extractRefreshToken,
  type SessionJwtClaims,
} from "../auth/session.js";

describe("JWT Session Utility Module", () => {
  const secretEnv = "DOER_SESSION_JWT_SECRET";
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save original env
    originalEnv[secretEnv] = process.env[secretEnv];
    originalEnv["DOER_SESSION_ACCESS_TTL_SECONDS"] = process.env["DOER_SESSION_ACCESS_TTL_SECONDS"];
    originalEnv["DOER_SESSION_REFRESH_TTL_SECONDS"] = process.env["DOER_SESSION_REFRESH_TTL_SECONDS"];
    originalEnv["DOER_SESSION_JWT_ISSUER"] = process.env["DOER_SESSION_JWT_ISSUER"];
    originalEnv["DOER_SESSION_JWT_AUDIENCE"] = process.env["DOER_SESSION_JWT_AUDIENCE"];
    originalEnv["DOER_AGENT_JWT_SECRET"] = process.env["DOER_AGENT_JWT_SECRET"];
    originalEnv["BETTER_AUTH_SECRET"] = process.env["BETTER_AUTH_SECRET"];

    // Set test secret
    process.env[secretEnv] = "test-session-secret-key";
    delete process.env["DOER_AGENT_JWT_SECRET"];
    delete process.env["BETTER_AUTH_SECRET"];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original env
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  // -------------------------------------------------------------------------
  // Config resolution
  // -------------------------------------------------------------------------

  describe("resolveSessionConfig", () => {
    it("returns config when secret is set", () => {
      const config = resolveSessionConfig();
      expect(config).not.toBeNull();
      expect(config!.secret).toBe("test-session-secret-key");
      expect(config!.accessTtlSeconds).toBe(900); // 15 min
      expect(config!.refreshTtlSeconds).toBe(604800); // 7 days
      expect(config!.issuer).toBe("doer");
      expect(config!.audience).toBe("doer-api");
    });

    it("falls back to DOER_AGENT_JWT_SECRET", () => {
      delete process.env[secretEnv];
      process.env["DOER_AGENT_JWT_SECRET"] = "agent-secret-fallback";
      const config = resolveSessionConfig();
      expect(config).not.toBeNull();
      expect(config!.secret).toBe("agent-secret-fallback");
    });

    it("falls back to BETTER_AUTH_SECRET", () => {
      delete process.env[secretEnv];
      process.env["BETTER_AUTH_SECRET"] = "better-auth-fallback";
      const config = resolveSessionConfig();
      expect(config).not.toBeNull();
      expect(config!.secret).toBe("better-auth-fallback");
    });

    it("returns null when no secret is configured", () => {
      delete process.env[secretEnv];
      delete process.env["DOER_AGENT_JWT_SECRET"];
      delete process.env["BETTER_AUTH_SECRET"];
      expect(resolveSessionConfig()).toBeNull();
    });

    it("respects custom TTL values", () => {
      process.env["DOER_SESSION_ACCESS_TTL_SECONDS"] = "300"; // 5 min
      process.env["DOER_SESSION_REFRESH_TTL_SECONDS"] = "86400"; // 1 day
      const config = resolveSessionConfig();
      expect(config!.accessTtlSeconds).toBe(300);
      expect(config!.refreshTtlSeconds).toBe(86400);
    });

    it("ignores invalid TTL values and uses defaults", () => {
      process.env["DOER_SESSION_ACCESS_TTL_SECONDS"] = "not-a-number";
      const config = resolveSessionConfig();
      expect(config!.accessTtlSeconds).toBe(900); // default
    });
  });

  // -------------------------------------------------------------------------
  // Token creation
  // -------------------------------------------------------------------------

  describe("createAccessToken", () => {
    it("creates a valid JWT string", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");
      expect(typeof token).toBe("string");
      expect(token!.split(".")).toHaveLength(3);
    });

    it("returns null when no secret is configured", () => {
      delete process.env[secretEnv];
      delete process.env["DOER_AGENT_JWT_SECRET"];
      delete process.env["BETTER_AUTH_SECRET"];
      expect(createAccessToken("user-123")).toBeNull();
    });

    it("includes companyId in claims when provided", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123", "company-456");
      const claims = verifyToken(token!);
      expect(claims).not.toBeNull();
      expect(claims!.companyId).toBe("company-456");
    });
  });

  describe("createRefreshToken", () => {
    it("creates a valid JWT string", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createRefreshToken("user-123");
      expect(typeof token).toBe("string");
      expect(token!.split(".")).toHaveLength(3);
    });

    it("returns null when no secret is configured", () => {
      delete process.env[secretEnv];
      delete process.env["DOER_AGENT_JWT_SECRET"];
      delete process.env["BETTER_AUTH_SECRET"];
      expect(createRefreshToken("user-123")).toBeNull();
    });
  });

  describe("createTokenPair", () => {
    it("creates both access and refresh tokens", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const pair = createTokenPair("user-123", "company-456");
      expect(pair).not.toBeNull();
      expect(pair!.accessToken).not.toBe(pair!.refreshToken);
      expect(pair!.accessClaims.sub).toBe("user-123");
      expect(pair!.refreshClaims.sub).toBe("user-123");
      expect(pair!.accessClaims.type).toBe("access");
      expect(pair!.refreshClaims.type).toBe("refresh");
      expect(pair!.accessClaims.companyId).toBe("company-456");
      expect(pair!.refreshClaims.companyId).toBe("company-456");
    });

    it("access token has shorter TTL than refresh token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const pair = createTokenPair("user-123");
      expect(pair!.accessClaims.exp - pair!.accessClaims.iat).toBe(900); // 15 min
      expect(pair!.refreshClaims.exp - pair!.refreshClaims.iat).toBe(604800); // 7 days
    });

    it("each token has a unique jti", () => {
      const pair = createTokenPair("user-123");
      expect(pair!.accessClaims.jti).not.toBe(pair!.refreshClaims.jti);
      expect(pair!.accessClaims.jti).toHaveLength(32); // 16 bytes hex
    });

    it("returns null when no secret is configured", () => {
      delete process.env[secretEnv];
      delete process.env["DOER_AGENT_JWT_SECRET"];
      delete process.env["BETTER_AUTH_SECRET"];
      expect(createTokenPair("user-123")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Token verification
  // -------------------------------------------------------------------------

  describe("verifyToken", () => {
    it("verifies a valid access token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123", "company-456");
      const claims = verifyToken(token!);
      expect(claims).not.toBeNull();
      expect(claims!.sub).toBe("user-123");
      expect(claims!.type).toBe("access");
      expect(claims!.iss).toBe("doer");
      expect(claims!.aud).toBe("doer-api");
      expect(claims!.companyId).toBe("company-456");
    });

    it("verifies a valid refresh token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createRefreshToken("user-123");
      const claims = verifyToken(token!);
      expect(claims).not.toBeNull();
      expect(claims!.type).toBe("refresh");
    });

    it("rejects a tampered token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");
      const parts = token!.split(".");
      // Tamper with the claims
      const tamperedClaims = Buffer.from(
        JSON.stringify({ sub: "hacker", type: "access", jti: "fake", iat: 0, exp: 9999999999, iss: "doer", aud: "doer-api" }),
      ).toString("base64url");
      const tamperedToken = `${parts[0]}.${tamperedClaims}.${parts[2]}`;
      expect(verifyToken(tamperedToken)).toBeNull();
    });

    it("rejects an expired token", () => {
      process.env["DOER_SESSION_ACCESS_TTL_SECONDS"] = "1";
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");

      vi.setSystemTime(new Date("2026-01-15T12:00:05.000Z"));
      expect(verifyToken(token!)).toBeNull();
    });

    it("rejects issuer mismatch", () => {
      process.env["DOER_SESSION_JWT_ISSUER"] = "custom-issuer";
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");

      process.env["DOER_SESSION_JWT_ISSUER"] = "different-issuer";
      expect(verifyToken(token!)).toBeNull();
    });

    it("rejects audience mismatch", () => {
      process.env["DOER_SESSION_JWT_AUDIENCE"] = "custom-audience";
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");

      process.env["DOER_SESSION_JWT_AUDIENCE"] = "different-audience";
      expect(verifyToken(token!)).toBeNull();
    });

    it("returns null for malformed tokens", () => {
      expect(verifyToken("")).toBeNull();
      expect(verifyToken("not.a.jwt")).toBeNull();
      expect(verifyToken("onlyonepart")).toBeNull();
      expect(verifyToken("a.b.c.d")).toBeNull();
    });

    it("returns null when no secret is configured", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");
      delete process.env[secretEnv];
      delete process.env["DOER_AGENT_JWT_SECRET"];
      delete process.env["BETTER_AUTH_SECRET"];
      expect(verifyToken(token!)).toBeNull();
    });
  });

  describe("verifyAccessToken", () => {
    it("verifies an access token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");
      const claims = verifyAccessToken(token!);
      expect(claims).not.toBeNull();
      expect(claims!.type).toBe("access");
    });

    it("rejects a refresh token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createRefreshToken("user-123");
      expect(verifyAccessToken(token!)).toBeNull();
    });
  });

  describe("verifyRefreshToken", () => {
    it("verifies a refresh token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createRefreshToken("user-123");
      const claims = verifyRefreshToken(token!);
      expect(claims).not.toBeNull();
      expect(claims!.type).toBe("refresh");
    });

    it("rejects an access token", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createAccessToken("user-123");
      expect(verifyRefreshToken(token!)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Refresh token rotation
  // -------------------------------------------------------------------------

  describe("rotateRefreshToken", () => {
    it("issues a new token pair from a valid refresh token", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const refreshToken = createRefreshToken("user-123", "company-456");
      const result = await rotateRefreshToken(refreshToken!);
      expect(result).not.toBeNull();
      expect(result!.accessClaims.sub).toBe("user-123");
      expect(result!.refreshClaims.sub).toBe("user-123");
      expect(result!.accessClaims.companyId).toBe("company-456");
      expect(result!.refreshClaims.companyId).toBe("company-456");
    });

    it("produces a different jti than the original", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const refreshToken = createRefreshToken("user-123")!;
      const originalClaims = verifyRefreshToken(refreshToken)!;
      const result = await rotateRefreshToken(refreshToken);
      expect(result!.refreshClaims.jti).not.toBe(originalClaims.jti);
    });

    it("returns null for an access token", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const accessToken = createAccessToken("user-123");
      const result = await rotateRefreshToken(accessToken!);
      expect(result).toBeNull();
    });

    it("returns null for an expired refresh token", async () => {
      process.env["DOER_SESSION_REFRESH_TTL_SECONDS"] = "1";
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const refreshToken = createRefreshToken("user-123");
      vi.setSystemTime(new Date("2026-01-15T12:00:05.000Z"));
      const result = await rotateRefreshToken(refreshToken!);
      expect(result).toBeNull();
    });

    it("returns null when validateJti returns false", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const refreshToken = createRefreshToken("user-123");
      const result = await rotateRefreshToken(refreshToken!, async () => false);
      expect(result).toBeNull();
    });

    it("succeeds when validateJti returns true", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const refreshToken = createRefreshToken("user-123");
      const result = await rotateRefreshToken(refreshToken!, async () => true);
      expect(result).not.toBeNull();
    });

    it("passes jti and userId to validateJti", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const refreshToken = createRefreshToken("user-123");
      const claims = verifyRefreshToken(refreshToken!)!;
      let receivedJti: string | undefined;
      let receivedUserId: string | undefined;
      await rotateRefreshToken(refreshToken!, async (jti, userId) => {
        receivedJti = jti;
        receivedUserId = userId;
        return true;
      });
      expect(receivedJti).toBe(claims.jti);
      expect(receivedUserId).toBe("user-123");
    });
  });

  // -------------------------------------------------------------------------
  // Token hashing
  // -------------------------------------------------------------------------

  describe("hashRefreshToken", () => {
    it("produces a deterministic SHA-256 hash", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token = createRefreshToken("user-123")!;
      const hash1 = hashRefreshToken(token);
      const hash2 = hashRefreshToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it("produces different hashes for different tokens", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
      const token1 = createRefreshToken("user-1")!;
      const token2 = createRefreshToken("user-2")!;
      expect(hashRefreshToken(token1)).not.toBe(hashRefreshToken(token2));
    });
  });

  describe("hashJti", () => {
    it("produces a deterministic SHA-256 hash", () => {
      const hash1 = hashJti("abc123");
      const hash2 = hashJti("abc123");
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("produces different hashes for different jtis", () => {
      expect(hashJti("abc123")).not.toBe(hashJti("def456"));
    });
  });

  // -------------------------------------------------------------------------
  // Cookie options
  // -------------------------------------------------------------------------

  describe("getAccessCookieOptions", () => {
    it("returns cookie options with correct maxAge", () => {
      const opts = getAccessCookieOptions();
      expect(opts).not.toBeNull();
      expect(opts!.httpOnly).toBe(true);
      expect(opts!.maxAge).toBe(900); // 15 min
    });

    it("returns null when no secret is configured", () => {
      delete process.env[secretEnv];
      delete process.env["DOER_AGENT_JWT_SECRET"];
      delete process.env["BETTER_AUTH_SECRET"];
      expect(getAccessCookieOptions()).toBeNull();
    });
  });

  describe("getRefreshCookieOptions", () => {
    it("returns cookie options with correct maxAge", () => {
      const opts = getRefreshCookieOptions();
      expect(opts).not.toBeNull();
      expect(opts!.httpOnly).toBe(true);
      expect(opts!.maxAge).toBe(604800); // 7 days
    });
  });

  // -------------------------------------------------------------------------
  // Token extraction
  // -------------------------------------------------------------------------

  describe("extractBearerToken", () => {
    it("extracts a Bearer token", () => {
      const token = extractBearerToken("Bearer abc123");
      expect(token).toBe("abc123");
    });

    it("is case-insensitive for the scheme", () => {
      expect(extractBearerToken("bearer abc123")).toBe("abc123");
      expect(extractBearerToken("BEARER abc123")).toBe("abc123");
    });

    it("returns null for non-Bearer headers", () => {
      expect(extractBearerToken("Basic abc123")).toBeNull();
      expect(extractBearerToken("")).toBeNull();
      expect(extractBearerToken(undefined)).toBeNull();
    });

    it("returns null for empty token", () => {
      expect(extractBearerToken("Bearer ")).toBeNull();
    });
  });

  describe("extractAccessToken", () => {
    it("prefers Authorization header over cookie", () => {
      const headerToken = "header-token";
      const cookieToken = "cookie-token";
      const result = extractAccessToken(`Bearer ${headerToken}`, {
        doer_access_token: cookieToken,
      });
      expect(result).toBe(headerToken);
    });

    it("falls back to cookie when no Authorization header", () => {
      const cookieToken = "cookie-token";
      const result = extractAccessToken(undefined, {
        doer_access_token: cookieToken,
      });
      expect(result).toBe(cookieToken);
    });

    it("returns null when neither is available", () => {
      expect(extractAccessToken(undefined, undefined)).toBeNull();
      expect(extractAccessToken(undefined, {})).toBeNull();
    });
  });

  describe("extractRefreshToken", () => {
    it("extracts refresh token from cookies", () => {
      const result = extractRefreshToken({
        doer_refresh_token: "refresh-token-value",
      });
      expect(result).toBe("refresh-token-value");
    });

    it("returns null when no cookie", () => {
      expect(extractRefreshToken(undefined)).toBeNull();
      expect(extractRefreshToken({})).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Integration: end-to-end token lifecycle
  // -------------------------------------------------------------------------

  describe("end-to-end token lifecycle", () => {
    it("create → verify → rotate → verify new tokens", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

      // Step 1: Create initial token pair
      const initialPair = createTokenPair("user-42", "company-99");
      expect(initialPair).not.toBeNull();

      // Step 2: Verify access token works
      const accessClaims = verifyAccessToken(initialPair!.accessToken);
      expect(accessClaims).not.toBeNull();
      expect(accessClaims!.sub).toBe("user-42");

      // Step 3: Rotate refresh token (no DB validator — trust the token)
      const rotatedPair = await rotateRefreshToken(initialPair!.refreshToken);
      expect(rotatedPair).not.toBeNull();

      // Step 4: Verify new access token works
      const newAccessClaims = verifyAccessToken(rotatedPair!.accessToken);
      expect(newAccessClaims).not.toBeNull();
      expect(newAccessClaims!.sub).toBe("user-42");
      expect(newAccessClaims!.companyId).toBe("company-99");

      // Step 5: Verify new refresh token works
      const newRefreshClaims = verifyRefreshToken(rotatedPair!.refreshToken);
      expect(newRefreshClaims).not.toBeNull();
      expect(newRefreshClaims!.sub).toBe("user-42");

      // Step 6: The old and new tokens have different jtis
      expect(rotatedPair!.refreshClaims.jti).not.toBe(initialPair!.refreshClaims.jti);
    });

    it("simulates DB-backed rotation with jti validation", async () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

      // Simulate a DB of active refresh token jtis
      const activeJtis = new Set<string>();

      // Create initial pair
      const initialPair = createTokenPair("user-42")!;
      const initialClaims = verifyRefreshToken(initialPair.refreshToken)!;
      activeJtis.add(hashJti(initialClaims.jti));

      // Validate: jti is in DB → rotation succeeds
      const validateJti = async (jti: string) => activeJtis.has(hashJti(jti));
      const rotated = await rotateRefreshToken(initialPair.refreshToken, validateJti);
      expect(rotated).not.toBeNull();

      // Simulate: old jti is revoked, new jti is added
      activeJtis.delete(hashJti(initialClaims.jti));
      const newClaims = verifyRefreshToken(rotated!.refreshToken)!;
      activeJtis.add(hashJti(newClaims.jti));

      // Old refresh token can no longer rotate (jti revoked in DB)
      const secondRotation = await rotateRefreshToken(initialPair.refreshToken, validateJti);
      expect(secondRotation).toBeNull();

      // New refresh token can rotate
      const thirdRotation = await rotateRefreshToken(rotated!.refreshToken, validateJti);
      expect(thirdRotation).not.toBeNull();
    });
  });
});
