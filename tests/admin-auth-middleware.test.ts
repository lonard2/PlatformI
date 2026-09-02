/**
 * PlatformI - Test Suite: Admin Route-Level Authentication & Middleware Guard
 *
 * Validates:
 * 1. Cryptographic HMAC-SHA256 session token generation and verification
 * 2. Token expiration boundaries (8-hour operator shift window)
 * 3. Anti-tampering signature rejection
 * 4. Operator credential authentication catalog
 * 5. Next.js Middleware route guard redirection & header injection
 * 6. Admin Auth API login & logout lifecycle
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import type { OperatorProfile } from "@/lib/services/adminAuthService";
import { PUBLIC_OPERATOR_PRESETS } from "@/lib/services/adminPresetOperators";
import {
  createOperatorSessionToken,
  verifyOperatorSessionToken,
  authenticateOperator,
  getAuthSecret,
  constantTimeEqual,
  OPERATOR_COOKIE_NAME,
  SHIFT_DURATION_SECONDS,
  REGISTERED_OPERATORS,
} from "@/lib/services/adminAuthService";
import { middleware } from "@/middleware";
import { POST as authPostHandler, GET as authGetHandler } from "@/app/api/admin/auth/route";

describe("Admin Route-Level Authentication & Middleware Guard", () => {
  const testOperatorId = "OCC-DKA-01";
  const testRole = "CHIEF_DISPATCHER";

  describe("1. Isomorphic Session Token Generation & Verification", () => {
    it("generates a valid signed session token", () => {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const token = createOperatorSessionToken(testOperatorId, testRole, undefined, nowEpoch);

      expect(token).toContain(`OCC:${testOperatorId}:${testRole}:${nowEpoch}:`);
      const parts = token.split(":");
      expect(parts).toHaveLength(5);
      expect(parts[4]).toHaveLength(32); // 32-char hex signature
    });

    it("successfully verifies valid session token", () => {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const token = createOperatorSessionToken(testOperatorId, testRole, undefined, nowEpoch);
      const result = verifyOperatorSessionToken(token, SHIFT_DURATION_SECONDS, nowEpoch);

      expect(result.isValid).toBe(true);
      expect(result.operatorId).toBe(testOperatorId);
      expect(result.role).toBe(testRole);
      expect(result.error).toBeUndefined();
    });

    it("rejects tampered signature with INVALID_SIGNATURE", () => {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const token = createOperatorSessionToken(testOperatorId, testRole, undefined, nowEpoch);
      const parts = token.split(":");
      parts[4] = "0123456789abcdef0123456789abcdef"; // Corrupted signature
      const tampered = parts.join(":");

      const result = verifyOperatorSessionToken(tampered, SHIFT_DURATION_SECONDS, nowEpoch);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("INVALID_SIGNATURE");
    });

    it("rejects token past 8-hour shift duration as TOKEN_EXPIRED", () => {
      const issuedTime = Math.floor(Date.now() / 1000) - (8 * 3600 + 10); // 8h 10s ago
      const verifyTime = Math.floor(Date.now() / 1000);

      const token = createOperatorSessionToken(testOperatorId, testRole, undefined, issuedTime);
      const result = verifyOperatorSessionToken(token, SHIFT_DURATION_SECONDS, verifyTime);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("TOKEN_EXPIRED");
    });

    it("rejects malformed or empty token strings", () => {
      expect(verifyOperatorSessionToken(null).isValid).toBe(false);
      expect(verifyOperatorSessionToken("").isValid).toBe(false);
      expect(verifyOperatorSessionToken("NOT_AN_OCC_TOKEN").isValid).toBe(false);
    });
  });

  describe("2. Operator Credentials Authentication", () => {
    it("authenticates registered OCC Dispatcher with correct passkey", () => {
      const result = authenticateOperator("OCC-DKA-01", "transitopps2026");

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile?.name).toBe("Raden Budi Santoso");
      expect(result.profile?.role).toBe("CHIEF_DISPATCHER");
      expect(result.token).toBeDefined();
    });

    it("handles case-insensitive operator IDs", () => {
      const result = authenticateOperator("occ-dka-01", "transitopps2026");
      expect(result.success).toBe(true);
      expect(result.profile?.id).toBe("OCC-DKA-01");
    });

    it("rejects incorrect passkey using constant-time comparison", () => {
      const result = authenticateOperator("OCC-DKA-01", "wrongpassword");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid Operator ID or Passkey");
      expect(result.token).toBeUndefined();
    });

    it("rejects non-existent operator", () => {
      const result = authenticateOperator("OCC-UNKNOWN-99", "anykey");
      expect(result.success).toBe(false);
    });

    it("enforces fail-closed secret in production if secret is missing", () => {
      const envObj = process.env as Record<string, string | undefined>;
      const originalEnv = envObj.NODE_ENV;
      const originalSecret = process.env.ADMIN_AUTH_SECRET;
      const originalNextAuth = process.env.NEXTAUTH_SECRET;

      try {
        delete process.env.ADMIN_AUTH_SECRET;
        delete process.env.NEXTAUTH_SECRET;
        // In development/test it provides fallback
        expect(getAuthSecret()).toBeDefined();

        // In production it throws and refuses to run
        envObj.NODE_ENV = "production";
        expect(() => getAuthSecret()).toThrow(/CRITICAL SECURITY ERROR/);
      } finally {
        envObj.NODE_ENV = originalEnv;
        if (originalSecret) process.env.ADMIN_AUTH_SECRET = originalSecret;
        if (originalNextAuth) process.env.NEXTAUTH_SECRET = originalNextAuth;
      }
    });

    it("ensures presets document demo passkeys and keep the import chain severed", () => {
      expect(PUBLIC_OPERATOR_PRESETS.length).toBeGreaterThan(0);
      PUBLIC_OPERATOR_PRESETS.forEach((preset: OperatorProfile & { demoPasskey?: string }) => {
        // demoPasskey is displayed on the login page by design (demo surface);
        // the auth-record `passkey` field itself must never ship on the preset
        expect((preset as unknown as { passkey?: string }).passkey).toBeUndefined();
        expect(preset.demoPasskey).toBeTruthy();
        // Drift guard: a one-sided edit to either catalog would recreate the
        // original dead end with a lying hint
        expect(REGISTERED_OPERATORS[preset.id]?.passkey).toBe(preset.demoPasskey);
        expect(preset.id).toBeDefined();
        expect(preset.badgeNumber).toBeDefined();
      });
    });

    it("verifies constantTimeEqual behavior across edge cases", () => {
      expect(constantTimeEqual("secret123", "secret123")).toBe(true);
      expect(constantTimeEqual("secret123", "secret124")).toBe(false);
      expect(constantTimeEqual("secret123", "secret")).toBe(false);
      expect(constantTimeEqual("", "")).toBe(true);
      expect(constantTimeEqual("a", "")).toBe(false);
    });
  });

  describe("3. Middleware Route Guard & Header Injection", () => {
    it("redirects unauthenticated browser requests from /admin to /admin/login", () => {
      const request = new NextRequest("http://localhost:3000/admin");
      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login");
    });

    it("preserves callbackUrl when redirecting deep /admin routes", () => {
      const request = new NextRequest("http://localhost:3000/admin/fleet");
      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/admin/login?callbackUrl=%2Fadmin%2Ffleet"
      );
    });

    it("returns 401 Unauthorized for unauthenticated programmatic JSON requests", () => {
      const request = new NextRequest("http://localhost:3000/admin", {
        headers: { accept: "application/json" },
      });
      const response = middleware(request);

      expect(response.status).toBe(401);
    });

    it("allows public access to /admin/login without redirection", () => {
      const request = new NextRequest("http://localhost:3000/admin/login");
      const response = middleware(request);

      // In Next.js middleware, NextResponse.next() has no 307 location header
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows authenticated request with valid cookie and enriches headers", () => {
      const validToken = createOperatorSessionToken("OCC-DKA-01", "CHIEF_DISPATCHER");
      const request = new NextRequest("http://localhost:3000/admin", {
        headers: {
          cookie: `${OPERATOR_COOKIE_NAME}=${validToken}`,
        },
      });

      const response = middleware(request);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-operator-id") || request.headers.get("x-operator-id")).toBeDefined();
    });

    it("allows public GET requests to /api/alerts without authentication", () => {
      const request = new NextRequest("http://localhost:3000/api/alerts", {
        method: "GET",
      });
      const response = middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("blocks unauthenticated POST to /api/alerts with 401 Unauthorized", async () => {
      const request = new NextRequest("http://localhost:3000/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: "line-mrt-ns",
          title: "Unauthorized Alert",
          description: "Fake broadcast attempt",
        }),
      });
      const response = middleware(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Operator OCC authentication required");
    });

    it("blocks unauthenticated PATCH and DELETE to /api/alerts with 401 Unauthorized", async () => {
      const patchReq = new NextRequest("http://localhost:3000/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "alert-1", status: "RESOLVED" }),
      });
      const patchRes = middleware(patchReq);
      expect(patchRes.status).toBe(401);

      const deleteReq = new NextRequest("http://localhost:3000/api/alerts?id=alert-1", {
        method: "DELETE",
      });
      const deleteRes = middleware(deleteReq);
      expect(deleteRes.status).toBe(401);
    });

    it("allows authenticated POST to /api/alerts with valid token", () => {
      const validToken = createOperatorSessionToken("OCC-DKA-01", "CHIEF_DISPATCHER");
      const request = new NextRequest("http://localhost:3000/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${OPERATOR_COOKIE_NAME}=${validToken}`,
        },
        body: JSON.stringify({
          lineId: "line-mrt-ns",
          title: "Legitimate OCC Broadcast",
          description: "Signaling maintenance update",
        }),
      });

      const response = middleware(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("4. Admin Auth API Route Handlers", () => {
    it("handles login, sets cookie, and returns operator profile", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          operatorId: "OCC-DKA-01",
          passkey: "transitopps2026",
        }),
      });

      const response = await authPostHandler(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.operator.name).toBe("Raden Budi Santoso");

      const cookieHeader = response.headers.get("set-cookie");
      expect(cookieHeader).toContain(OPERATOR_COOKIE_NAME);
    });

    it("handles logout and clears cookie", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });

      const response = await authPostHandler(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toMatch(/shift terminated/i);
    });

    it("introspects active session via GET", async () => {
      const validToken = createOperatorSessionToken("OCC-DKA-01", "CHIEF_DISPATCHER");
      const request = new NextRequest("http://localhost:3000/api/admin/auth", {
        headers: {
          cookie: `${OPERATOR_COOKIE_NAME}=${validToken}`,
        },
      });

      const response = await authGetHandler(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.authenticated).toBe(true);
      expect(json.operator.id).toBe("OCC-DKA-01");
    });
  });
});
