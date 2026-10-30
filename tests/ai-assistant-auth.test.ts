/**
 * RED: the AI assistant proxy requires a signed-in member. Anonymous and
 * forged callers are rejected even though the endpoint could answer from
 * the local fallback; the model list stays public.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as aiPost, GET as aiGet } from "@/app/api/ai/assistant/route";
import {
  mintMemberSession,
  MEMBER_SESSION_COOKIE,
} from "@/lib/services/memberAuthService";

const SECRET = "test-ai-secret-zone";

function post(body: unknown, cookie: string | null): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== null) headers.cookie = cookie;
  return new NextRequest("http://localhost:3000/api/ai/assistant", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("ai assistant auth", () => {
  beforeEach(() => {
    process.env.MEMBER_AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.MEMBER_AUTH_SECRET;
  });

  it("rejects anonymous chat requests", async () => {
    const res = await aiPost(post({ messages: [{ role: "user", content: "halo" }] }, null));
    expect(res.status).toBe(401);
  });

  it("rejects forged member tokens", async () => {
    const res = await aiPost(
      post({ messages: [{ role: "user", content: "halo" }] }, `${MEMBER_SESSION_COOKIE}=forged`)
    );
    expect(res.status).toBe(401);
  });

  it("answers signed-in members", async () => {
    const token = mintMemberSession("MBR-AI-01", "MEMBER", SECRET, Math.floor(Date.now() / 1000));
    const res = await aiPost(
      post(
        { messages: [{ role: "user", content: "jadwal KRL?" }] },
        `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`
      )
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { success: boolean }).success).toBe(true);
  });

  it("keeps the model list public", async () => {
    const res = await aiGet();
    expect(res.status).toBe(200);
  });
});
