/**
 * Route-level proof for Task 1: register begin → finish (mocked ceremony)
 * creates a verified member and signs them in; me returns the profile
 * without credential material; logout clears the cookie.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as registerBegin } from "@/app/api/members/register/begin/route";
import { POST as registerFinish } from "@/app/api/members/register/finish/route";
import { GET as me } from "@/app/api/members/me/route";
import { POST as logout } from "@/app/api/members/logout/route";
import { MEMBER_SESSION_COOKIE } from "@/lib/services/memberAuthService";
import { db } from "@/lib/db";

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn(async () => ({ challenge: "chal-reg" })),
  verifyRegistrationResponse: vi.fn(async () => ({
    verified: true,
    registrationInfo: {
      credential: { id: "cred-route-1", publicKey: new Uint8Array([9]), counter: 0 },
    },
  })),
  generateAuthenticationOptions: vi.fn(async () => ({ challenge: "chal-auth" })),
  verifyAuthenticationResponse: vi.fn(async () => ({ verified: true, authenticationInfo: {} })),
}));

function post(url: string, body: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(url, { method: "POST", headers, body: JSON.stringify(body) });
}

describe("member routes", () => {
  const phone = `+62800${Date.now() % 100000000}`;

  afterEach(async () => {
    await db.member.deleteMany({ where: { phone } });
  });

  it("registers, signs in, serves me, and logs out", async () => {
    const beginRes = await registerBegin(
      post("http://localhost/api/members/register/begin", { displayName: "Route User", phone })
    );
    const beginJson = (await beginRes.json()) as {
      success: boolean;
      data: { provisionalId: string };
    };
    expect(beginJson.success).toBe(true);

    const finishRes = await registerFinish(
      post("http://localhost/api/members/register/finish", {
        provisionalId: beginJson.data.provisionalId,
        displayName: "Route User",
        phone,
        credential: { fake: "response" },
      })
    );
    const finishJson = (await finishRes.json()) as {
      success: boolean;
      data: { id: string; role: string; verifiedAt: string | null };
    };
    expect(finishJson.success).toBe(true);
    expect(finishJson.data.role).toBe("MEMBER");
    expect(finishJson.data.verifiedAt).not.toBeNull();
    const setCookie = finishRes.headers.getSetCookie().join("; ");
    expect(setCookie).toMatch(new RegExp(`${MEMBER_SESSION_COOKIE}=`));
    expect(setCookie).toMatch(/HttpOnly/);

    const cookie = setCookie.split(";")[0];
    const meRes = await me(
      new NextRequest("http://localhost/api/members/me", { headers: { cookie } })
    );
    const meJson = (await meRes.json()) as { success: boolean; data: Record<string, unknown> };
    expect(meJson.success).toBe(true);
    expect(meJson.data.displayName).toBe("Route User");
    expect(meJson.data).not.toHaveProperty("passkeyCredentialJson");

    const outRes = await logout();
    expect(outRes.headers.getSetCookie().join("; ")).toMatch(/Max-Age=0/);
  });
});
