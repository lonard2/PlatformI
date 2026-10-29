/**
 * RED: member identity — passkey registration/login ceremonies with
 * single-use challenges and counter checks, plus HMAC member sessions
 * (fresh id at login, httpOnly lifetime cookie, no inheritance).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mintMemberSession,
  parseMemberSession,
  MEMBER_SESSION_COOKIE,
  MEMBER_SESSION_MAX_AGE_SECONDS,
  MEMBER_SESSION_SAMESITE,
  startMemberRegistration,
  finishMemberRegistration,
  startMemberLogin,
  finishMemberLogin,
  requireMember,
  __clearMemberChallenges,
} from "@/lib/services/memberAuthService";

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn(async () => ({
    challenge: "chal-reg",
    rp: { name: "PlatformI", id: "localhost" },
  })),
  verifyRegistrationResponse: vi.fn(async () => ({
    verified: true,
    registrationInfo: {
      credential: {
        id: "cred-1",
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 0,
      },
      credentialBackedUp: false,
      credentialDeviceType: "singleDevice",
    },
  })),
  generateAuthenticationOptions: vi.fn(async () => ({
    challenge: "chal-auth",
    allowCredentials: [{ id: "cred-1" }],
  })),
  verifyAuthenticationResponse: vi.fn(async () => ({
    verified: true,
    authenticationInfo: {
      credentialID: "cred-1",
      newCounter: 1,
    },
  })),
}));

const SECRET = "test-member-secret-zone";

function cookieFor(token: string): string {
  return `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

describe("member auth sessions", () => {
  it("mints a parseable token with role and 30-day window", () => {
    const token = mintMemberSession("m1", "MEMBER", SECRET);
    const parsed = parseMemberSession(token, MEMBER_SESSION_MAX_AGE_SECONDS, SECRET);
    expect(parsed).toMatchObject({ memberId: "m1", role: "MEMBER" });
    expect(MEMBER_SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(MEMBER_SESSION_COOKIE).toBe("platformi_member_session");
    expect(MEMBER_SESSION_SAMESITE).toBe("Lax");
  });

  it("rejects tampered and expired tokens", () => {
    const token = mintMemberSession("m1", "MEMBER", SECRET);
    expect(parseMemberSession(`${token}x`, MEMBER_SESSION_MAX_AGE_SECONDS, SECRET)).toBeNull();
    expect(parseMemberSession(token, -1, SECRET)).toBeNull();
    expect(parseMemberSession(token, MEMBER_SESSION_MAX_AGE_SECONDS, "wrong")).toBeNull();
  });

  it("issues a fresh session id at login (never inherits)", () => {
    const a = mintMemberSession("m1", "MEMBER", SECRET);
    const b = mintMemberSession("m1", "MEMBER", SECRET);
    expect(a).not.toBe(b);
  });

  it("requireMember resolves a member from the session cookie", () => {
    const token = mintMemberSession("m9", "PARTNER", SECRET);
    expect(requireMember(cookieFor(token), SECRET)).toMatchObject({
      id: "m9",
      role: "PARTNER",
    });
    expect(requireMember(null, SECRET)).toBeNull();
    expect(requireMember("other=1", SECRET)).toBeNull();
  });
});

describe("member passkey ceremonies", () => {
  beforeEach(() => {
    __clearMemberChallenges();
  });

  afterEach(() => {
    __clearMemberChallenges();
  });

  it("completes registration and burns the challenge (no replay)", async () => {
    const { options } = await startMemberRegistration("m1");
    expect(options.challenge).toBe("chal-reg");
    const first = await finishMemberRegistration("m1", { fake: "response" });
    expect(first.verified).toBe(true);
    expect(first.credentialId).toBe("cred-1");
    expect(first.credentialPublicKey).toBe("AQID");
    await expect(finishMemberRegistration("m1", { fake: "response" })).rejects.toThrow(
      /challenge/i
    );
  });

  it("completes login only with a rising counter", async () => {
    const { options } = await startMemberLogin("m1", "cred-1");
    expect(options.challenge).toBe("chal-auth");
    const done = await finishMemberLogin("m1", { fake: "response" }, "cred-1", 0);
    expect(done.verified).toBe(true);
    expect(done.newCounter).toBe(1);
    await expect(
      finishMemberLogin("m1", { fake: "response" }, "cred-1", 5)
    ).rejects.toThrow(/counter|challenge/i);
  });
});
