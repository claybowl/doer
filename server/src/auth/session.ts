/**
 * JWT Session Utility Module for Doer Auth
 *
 * Provides token generation, verification, refresh logic, and secure cookie
 * handling for user sessions in authenticated deployment mode.
 *
 * Access tokens are short-lived (15 min default) and carry user identity claims.
 * Refresh tokens are longer-lived (7 days default) and are stored hashed in the
 * database so they can be revoked or rotated.
 *
 * Uses HS256 signing (consistent with agent-auth-jwt.ts).
 */

import { createHmac, timingSafeEqual, randomBytes, createHash } from "node:crypto";
import type { Response } from "express";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenType = "access" | "refresh";

export interface SessionJwtClaims {
  sub: string; // user ID
  type: TokenType; // "access" | "refresh"
  jti: string; // unique token ID
  iat: number; // issued at (unix seconds)
  exp: number; // expiry (unix seconds)
  iss: string; // issuer
  aud: string; // audience
  companyId?: string; // optional company context
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessClaims: SessionJwtClaims;
  refreshClaims: SessionJwtClaims;
}

export interface SessionConfig {
  secret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  issuer: string;
  audience: string;
  cookieName: string;
  cookieSecure: boolean;
  cookieHttpOnly: boolean;
  cookieSameSite: "strict" | "lax" | "none";
  cookiePath: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JWT_ALGORITHM = "HS256";
const DEFAULT_ACCESS_TTL = 60 * 15; // 15 minutes
const DEFAULT_REFRESH_TTL = 60 * 60 * 24 * 7; // 7 days
const DEFAULT_ISSUER = "doer";
const DEFAULT_AUDIENCE = "doer-api";
const REFRESH_COOKIE_NAME = "doer_refresh_token";
const ACCESS_COOKIE_NAME = "doer_access_token";

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function resolveSessionConfig(): SessionConfig | null {
  const secret = process.env.DOER_SESSION_JWT_SECRET ?? process.env.DOER_AGENT_JWT_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  const isHttp = (process.env.DOER_PUBLIC_URL ?? "").startsWith("http://");

  return {
    secret,
    accessTtlSeconds: parseNumber(process.env.DOER_SESSION_ACCESS_TTL_SECONDS, DEFAULT_ACCESS_TTL),
    refreshTtlSeconds: parseNumber(process.env.DOER_SESSION_REFRESH_TTL_SECONDS, DEFAULT_REFRESH_TTL),
    issuer: process.env.DOER_SESSION_JWT_ISSUER ?? DEFAULT_ISSUER,
    audience: process.env.DOER_SESSION_JWT_AUDIENCE ?? DEFAULT_AUDIENCE,
    cookieName: REFRESH_COOKIE_NAME,
    cookieSecure: !isHttp,
    cookieHttpOnly: true,
    cookieSameSite: isHttp ? "lax" : "strict",
    cookiePath: "/",
  };
}

// ---------------------------------------------------------------------------
// Base64URL helpers
// ---------------------------------------------------------------------------

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

function signPayload(secret: string, signingInput: string): string {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function parseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

function generateJti(): string {
  return randomBytes(16).toString("hex");
}

function buildToken(
  config: SessionConfig,
  userId: string,
  tokenType: TokenType,
  ttlSeconds: number,
  companyId?: string,
): { token: string; claims: SessionJwtClaims } {
  const now = Math.floor(Date.now() / 1000);
  const jti = generateJti();
  const claims: SessionJwtClaims = {
    sub: userId,
    type: tokenType,
    jti,
    iat: now,
    exp: now + ttlSeconds,
    iss: config.issuer,
    aud: config.audience,
    ...(companyId ? { companyId } : {}),
  };

  const header = { alg: JWT_ALGORITHM, typ: "JWT" };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const signature = signPayload(config.secret, signingInput);

  return { token: `${signingInput}.${signature}`, claims };
}

/**
 * Create a short-lived access token (15 min default).
 */
export function createAccessToken(userId: string, companyId?: string): string | null {
  const config = resolveSessionConfig();
  if (!config) return null;
  return buildToken(config, userId, "access", config.accessTtlSeconds, companyId).token;
}

/**
 * Create a longer-lived refresh token (7 days default).
 * The token's jti should be stored hashed in the DB for revocation.
 */
export function createRefreshToken(userId: string, companyId?: string): string | null {
  const config = resolveSessionConfig();
  if (!config) return null;
  return buildToken(config, userId, "refresh", config.refreshTtlSeconds, companyId).token;
}

/**
 * Create both an access and refresh token as a pair.
 * Returns null if no secret is configured.
 */
export function createTokenPair(userId: string, companyId?: string): TokenPair | null {
  const config = resolveSessionConfig();
  if (!config) return null;

  const access = buildToken(config, userId, "access", config.accessTtlSeconds, companyId);
  const refresh = buildToken(config, userId, "refresh", config.refreshTtlSeconds, companyId);

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    accessClaims: access.claims,
    refreshClaims: refresh.claims,
  };
}

// ---------------------------------------------------------------------------
// Token verification
// ---------------------------------------------------------------------------

/**
 * Verify a JWT token and return its claims if valid.
 * Checks signature, expiry, issuer, and audience.
 * Does NOT check token type — use verifyAccessToken or verifyRefreshToken for that.
 */
export function verifyToken(token: string): SessionJwtClaims | null {
  if (!token) return null;
  const config = resolveSessionConfig();
  if (!config) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, claimsB64, signature] = parts;

  // Verify header
  const header = parseJson(base64UrlDecode(headerB64));
  if (!header || header.alg !== JWT_ALGORITHM) return null;

  // Verify signature
  const signingInput = `${headerB64}.${claimsB64}`;
  const expectedSig = signPayload(config.secret, signingInput);
  if (!safeCompare(signature, expectedSig)) return null;

  // Parse claims
  const claims = parseJson(base64UrlDecode(claimsB64));
  if (!claims) return null;

  // Extract and validate required fields
  const sub = typeof claims.sub === "string" ? claims.sub : null;
  const type = typeof claims.type === "string" ? (claims.type as TokenType) : null;
  const jti = typeof claims.jti === "string" ? claims.jti : null;
  const iat = typeof claims.iat === "number" ? claims.iat : null;
  const exp = typeof claims.exp === "number" ? claims.exp : null;
  if (!sub || !type || !jti || !iat || !exp) return null;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (exp < now) return null;

  // Check issuer and audience
  const iss = typeof claims.iss === "string" ? claims.iss : undefined;
  const aud = typeof claims.aud === "string" ? claims.aud : undefined;
  if (iss && iss !== config.issuer) return null;
  if (aud && aud !== config.audience) return null;

  const companyId = typeof claims.companyId === "string" ? claims.companyId : undefined;

  return {
    sub,
    type,
    jti,
    iat,
    exp,
    iss: iss ?? config.issuer,
    aud: aud ?? config.audience,
    ...(companyId ? { companyId } : {}),
  };
}

/**
 * Verify a token and ensure it is an access token.
 */
export function verifyAccessToken(token: string): SessionJwtClaims | null {
  const claims = verifyToken(token);
  if (!claims || claims.type !== "access") return null;
  return claims;
}

/**
 * Verify a token and ensure it is a refresh token.
 */
export function verifyRefreshToken(token: string): SessionJwtClaims | null {
  const claims = verifyToken(token);
  if (!claims || claims.type !== "refresh") return null;
  return claims;
}

// ---------------------------------------------------------------------------
// Refresh token rotation
// ---------------------------------------------------------------------------

/**
 * Rotate a refresh token: verify the old one, issue a new pair.
 *
 * The caller is responsible for checking that the old refresh token's jti
 * is still valid in the database (not revoked). After rotation, the caller
 * should mark the old jti as revoked and store the new jti hashed.
 *
 * @param oldRefreshToken - The refresh token to rotate
 * @param validateJti - Optional callback to verify the jti is still active in the DB.
 *                      Returns true if valid, false if revoked/unknown.
 * @returns New token pair, or null if rotation fails
 */
export async function rotateRefreshToken(
  oldRefreshToken: string,
  validateJti?: (jti: string, userId: string) => Promise<boolean>,
): Promise<TokenPair | null> {
  const claims = verifyRefreshToken(oldRefreshToken);
  if (!claims) return null;

  // If a DB validator is provided, check that the jti is still active
  if (validateJti) {
    const isValid = await validateJti(claims.jti, claims.sub);
    if (!isValid) return null;
  }

  // Issue a new token pair
  return createTokenPair(claims.sub, claims.companyId);
}

// ---------------------------------------------------------------------------
// Refresh token hashing (for DB storage)
// ---------------------------------------------------------------------------

/**
 * Hash a refresh token (or its jti) for secure storage in the database.
 * Store this hash, not the raw token, so a DB compromise doesn't leak tokens.
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Hash a jti for storage as a lookup key.
 */
export function hashJti(jti: string): string {
  return createHash("sha256").update(jti).digest("hex");
}

// ---------------------------------------------------------------------------
// Secure cookie handling
// ---------------------------------------------------------------------------

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number; // seconds
}

/**
 * Get cookie options for the access token.
 */
export function getAccessCookieOptions(): CookieOptions | null {
  const config = resolveSessionConfig();
  if (!config) return null;
  return {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: config.cookiePath,
    maxAge: config.accessTtlSeconds,
  };
}

/**
 * Get cookie options for the refresh token.
 */
export function getRefreshCookieOptions(): CookieOptions | null {
  const config = resolveSessionConfig();
  if (!config) return null;
  return {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: config.cookiePath,
    maxAge: config.refreshTtlSeconds,
  };
}

/**
 * Set both access and refresh tokens as cookies on an Express response.
 */
export function setSessionCookies(res: Response, tokenPair: TokenPair): boolean {
  const config = resolveSessionConfig();
  if (!config) return false;

  const accessOpts = getAccessCookieOptions()!;
  const refreshOpts = getRefreshCookieOptions()!;

  res.cookie(ACCESS_COOKIE_NAME, tokenPair.accessToken, {
    httpOnly: accessOpts.httpOnly,
    secure: accessOpts.secure,
    sameSite: accessOpts.sameSite,
    path: accessOpts.path,
    maxAge: accessOpts.maxAge * 1000, // ms
  });

  res.cookie(REFRESH_COOKIE_NAME, tokenPair.refreshToken, {
    httpOnly: refreshOpts.httpOnly,
    secure: refreshOpts.secure,
    sameSite: refreshOpts.sameSite,
    path: refreshOpts.path,
    maxAge: refreshOpts.maxAge * 1000, // ms
  });

  return true;
}

/**
 * Clear session cookies from an Express response.
 */
export function clearSessionCookies(res: Response): void {
  const config = resolveSessionConfig();
  if (!config) return;

  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: config.cookiePath,
  });

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: config.cookiePath,
  });
}

/**
 * Extract a token from the Authorization header (Bearer scheme).
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice("bearer ".length).trim();
  return token || null;
}

/**
 * Get the access token from a request — checks Authorization header first,
 * then falls back to the access cookie.
 */
export function extractAccessToken(authHeader: string | undefined, cookies: Record<string, string> | undefined): string | null {
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) return bearerToken;

  if (cookies && typeof cookies[ACCESS_COOKIE_NAME] === "string") {
    return cookies[ACCESS_COOKIE_NAME];
  }

  return null;
}

/**
 * Get the refresh token from cookies.
 */
export function extractRefreshToken(cookies: Record<string, string> | undefined): string | null {
  if (!cookies) return null;
  const token = cookies[REFRESH_COOKIE_NAME];
  return typeof token === "string" ? token : null;
}
