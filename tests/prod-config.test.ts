/**
 * RED: production configuration hardening — operator auth honors the same
 * token sources as the middleware, 500s never leak internals in
 * production, and the AI key never resolves from a public env var.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
  requireOperator,
} from "@/lib/services/adminAuthService";
import { resolveAiApiKey } from "@/lib/services/aiTransitService";
import { serverError } from "@/lib/api/serverError";

function authedHeaders(token: string): Headers {
  return new Headers({ cookie: `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(token)}` });
}

describe("production configuration", () => {
  it("accepts the middleware's header token sources", () => {
    const token = createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER");
    expect(requireOperator(null, new Headers({ "x-operator-token": token }))?.id).toBe("OCC-TEST-OPS");
    expect(requireOperator(null, new Headers({ authorization: `Bearer ${token}` }))?.id).toBe("OCC-TEST-OPS");
    expect(requireOperator(null, new Headers())).toBeNull();
  });

  it("still accepts the session cookie (backwards compatible)", () => {
    const token = createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER");
    expect(requireOperator(`ignored=1; ${OPERATOR_COOKIE_NAME}=${encodeURIComponent(token)}`, null)?.id).toBe(
      "OCC-TEST-OPS"
    );
  });

  it("strips error internals in production, keeps them in dev", () => {
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      expect(serverError("Failed", new Error("prisma exploded"))).toEqual({ error: "Failed" });
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prev;
    }
    expect(serverError("Failed", new Error("prisma exploded"))).toEqual({
      error: "Failed",
      details: "prisma exploded",
    });
  });

  it("never resolves the AI key from a public env var", () => {
    const prevPub = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    const prevSrv = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY = "sk-public-should-never-count";
    try {
      expect(resolveAiApiKey()).toBeNull();
    } finally {
      if (prevPub === undefined) delete process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      else process.env.NEXT_PUBLIC_OPENROUTER_API_KEY = prevPub;
      if (prevSrv !== undefined) process.env.OPENROUTER_API_KEY = prevSrv;
    }
    expect(new NextRequest("http://x", { headers: authedHeaders("x") }).headers.get("cookie")).toContain(
      OPERATOR_COOKIE_NAME
    );
  });
});
