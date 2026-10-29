/**
 * PlatformI - Member (user-side) identity: passkey ceremonies + sessions.
 *
 * Commuter accounts. Separate system from operator auth: own HMAC secret,
 * own cookie, 30-day sessions. Reuses the isomorphic HMAC primitives from
 * adminAuthService (no duplicated crypto).
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  computeOperatorSignature,
  constantTimeEqual,
} from "@/lib/services/adminAuthService";

export const MEMBER_SESSION_COOKIE = "platformi_member_session";
export const MEMBER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const MEMBER_SESSION_SAMESITE = "Lax" as const;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RP_NAME = "PlatformI";

export type MemberRole = "MEMBER" | "PARTNER";

/**
 * Resolves the member HMAC signing secret with fail-closed enforcement
 * in production (mirrors the operator rule).
 */
export function getMemberAuthSecret(): string {
  const secret = process.env.MEMBER_AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY ERROR: MEMBER_AUTH_SECRET environment variable is missing in production environment. Server refuses to operate with fallback secret."
      );
    }
    return "platformi-dev-member-secret-key-32-chars-minimum!";
  }
  return secret;
}

function memberPayload(memberId: string, role: string, ts: string | number): string {
  return `MBR:${memberId}:${role}:${ts}`;
}

/** Mint a fresh session token (always a new id — never inherited). */
export function mintMemberSession(
  memberId: string,
  role: string = "MEMBER",
  secret?: string,
  nowEpochSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const effectiveSecret = secret ?? getMemberAuthSecret();
  const sessionId = randomSessionId();
  const payload = `${memberPayload(memberId, role, nowEpochSeconds)}:${sessionId}`;
  const signature = computeOperatorSignature(payload, effectiveSecret);
  return `${payload}:${signature}`;
}

function randomSessionId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Parse + verify a member session token. Null on any failure. */
export function parseMemberSession(
  token: string | null | undefined,
  maxAgeSeconds: number = MEMBER_SESSION_MAX_AGE_SECONDS,
  secret?: string
): { memberId: string; role: string } | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(":");
  if (parts.length !== 6 || parts[0] !== "MBR") return null;
  const [, memberId, role, timestampStr, sessionId, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return null;
  let effectiveSecret: string;
  try {
    effectiveSecret = secret ?? getMemberAuthSecret();
  } catch {
    return null;
  }
  const expected = computeOperatorSignature(
    `${memberPayload(memberId, role, timestampStr)}:${sessionId}`,
    effectiveSecret
  );
  if (!constantTimeEqual(providedSignature, expected)) return null;
  if (Math.floor(Date.now() / 1000) - timestamp > maxAgeSeconds) return null;
  return { memberId, role };
}

/** Set-Cookie header value for a member session (httpOnly, 30-day, Lax; Secure in prod). */
export function memberSessionCookieHeader(token: string): string {
  const parts = [
    `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${MEMBER_SESSION_MAX_AGE_SECONDS}`,
    `SameSite=${MEMBER_SESSION_SAMESITE}`,
    "HttpOnly",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** Cookie header that clears the member session. */
export function clearMemberSessionCookieHeader(): string {
  const parts = [
    `${MEMBER_SESSION_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    `SameSite=${MEMBER_SESSION_SAMESITE}`,
    "HttpOnly",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** Resolve the member identity from a raw Cookie header. No DB read. */
export function requireMember(
  cookieHeader: string | null | undefined,
  secret?: string
): { id: string; role: string } | null {
  if (!cookieHeader) return null;
  const part = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${MEMBER_SESSION_COOKIE}=`));
  if (!part) return null;
  const token = decodeURIComponent(part.slice(MEMBER_SESSION_COOKIE.length + 1));
  const parsed = parseMemberSession(token, MEMBER_SESSION_MAX_AGE_SECONDS, secret);
  if (!parsed) return null;
  return { id: parsed.memberId, role: parsed.role };
}

interface StoredChallenge {
  challenge: string;
  kind: "registration" | "authentication";
  memberId: string;
  credentialId?: string;
  expiresAt: number;
}

const challenges = new Map<string, StoredChallenge>();

/** Test hook: drop all pending challenges. */
export function __clearMemberChallenges(): void {
  challenges.clear();
}

function challengeKey(memberId: string, kind: StoredChallenge["kind"]): string {
  return `${memberId}:${kind}`;
}

function takeChallenge(
  memberId: string,
  kind: StoredChallenge["kind"]
): StoredChallenge {
  const stored = challenges.get(challengeKey(memberId, kind));
  challenges.delete(challengeKey(memberId, kind));
  if (!stored || stored.expiresAt < Date.now()) {
    throw new Error("No valid challenge for this ceremony (expired or already used)");
  }
  return stored;
}

export async function startMemberRegistration(
  memberId: string,
  displayName: string = memberId,
  rpID: string = "localhost"
): Promise<{ options: { challenge: string } & Record<string, unknown> }> {
  const options = (await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(memberId),
    userName: displayName,
  })) as unknown as { challenge: string } & Record<string, unknown>;
  challenges.set(challengeKey(memberId, "registration"), {
    challenge: options.challenge,
    kind: "registration",
    memberId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { options };
}

export async function finishMemberRegistration(
  memberId: string,
  response: unknown,
  rpID: string = "localhost",
  origin: string = "http://localhost:3000"
): Promise<{ verified: boolean; credentialId: string; credentialPublicKey: string; counter: number }> {
  const stored = takeChallenge(memberId, "registration");
  const verification = (await verifyRegistrationResponse({
    response: response as never,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  })) as unknown as {
    verified: boolean;
    registrationInfo?: {
      credential: { id: string; counter: number };
    };
  };
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }
  const { id, publicKey, counter } = verification.registrationInfo.credential as {
    id: string;
    publicKey: Uint8Array;
    counter: number;
  };
  return {
    verified: true,
    credentialId: id,
    credentialPublicKey: Buffer.from(publicKey).toString("base64"),
    counter,
  };
}

export async function startMemberLogin(
  memberId: string,
  credentialId: string,
  rpID: string = "localhost"
): Promise<{ options: { challenge: string } & Record<string, unknown> }> {
  const options = (await generateAuthenticationOptions({
    rpID,
    allowCredentials: [{ id: credentialId }],
  })) as unknown as { challenge: string } & Record<string, unknown>;
  challenges.set(challengeKey(memberId, "authentication"), {
    challenge: options.challenge,
    kind: "authentication",
    memberId,
    credentialId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { options };
}

export async function finishMemberLogin(
  memberId: string,
  response: unknown,
  credentialId: string,
  storedCounter: number,
  rpID: string = "localhost",
  origin: string = "http://localhost:3000"
): Promise<{ verified: boolean; newCounter: number }> {
  const stored = takeChallenge(memberId, "authentication");
  if (stored.credentialId !== credentialId) {
    throw new Error("Credential mismatch for this login ceremony");
  }
  const verification = (await verifyAuthenticationResponse({
    response: response as never,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: { id: credentialId, publicKey: new Uint8Array(), counter: storedCounter },
  })) as unknown as {
    verified: boolean;
    authenticationInfo?: { credentialID: string; newCounter: number };
  };
  if (!verification.verified || !verification.authenticationInfo) {
    throw new Error("Login verification failed");
  }
  const { credentialID, newCounter } = verification.authenticationInfo;
  if (credentialID !== credentialId || !(newCounter > storedCounter)) {
    throw new Error("Counter rollback or credential mismatch");
  }
  return { verified: true, newCounter };
}
