/**
 * PlatformI - Route-Level Admin & Operator Authentication Middleware
 *
 * Implements:
 * - Route-level protection for all `/admin/*` routes (Dashboard, Fleet, Alerts, Scanner)
 * - Public bypass for `/admin/login` authentication portal
 * - HMAC-SHA256 session token verification with 8-hour shift expiry
 * - Deep link preservation via `callbackUrl` query parameter upon login redirect
 * - Downstream header propagation (`x-operator-id`, `x-operator-role`)
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  OPERATOR_COOKIE_NAME,
  verifyOperatorSessionToken,
} from "@/lib/services/adminAuthService";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. API Route Guard for /api/alerts: Allow public GET/HEAD/OPTIONS, require auth for POST/PATCH/DELETE
  if (pathname.startsWith("/api/alerts")) {
    const isPublicMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (isPublicMethod) {
      return NextResponse.next();
    }

    const cookieToken = request.cookies.get(OPERATOR_COOKIE_NAME)?.value;
    const headerToken =
      request.headers.get("x-operator-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const token = cookieToken || headerToken;
    const validation = verifyOperatorSessionToken(token);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Operator OCC authentication required to broadcast or modify transit disruption bulletins.",
          code: validation.error || "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const requestHeaders = new Headers(request.headers);
    if (validation.operatorId) requestHeaders.set("x-operator-id", validation.operatorId);
    if (validation.role) requestHeaders.set("x-operator-role", validation.role);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // 2. Allow public access to the operator login page
  if (pathname === "/admin/login") {
    // If operator is already authenticated, redirect to /admin dashboard
    const existingToken = request.cookies.get(OPERATOR_COOKIE_NAME)?.value;
    if (existingToken) {
      const validation = verifyOperatorSessionToken(existingToken);
      if (validation.isValid) {
        const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/admin";
        const redirectTarget = callbackUrl.startsWith("/admin") ? callbackUrl : "/admin";
        return NextResponse.redirect(new URL(redirectTarget, request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Extract operator token from cookie, header, or bearer authorization
  const cookieToken = request.cookies.get(OPERATOR_COOKIE_NAME)?.value;
  const headerToken =
    request.headers.get("x-operator-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const token = cookieToken || headerToken;

  // 4. Verify cryptographic token signature and expiration
  const validation = verifyOperatorSessionToken(token);

  if (!validation.isValid) {
    // Check if request expects JSON (e.g. programmatic / admin API)
    const isJsonRequest =
      request.headers.get("accept")?.includes("application/json") ||
      request.headers.get("content-type")?.includes("application/json");

    if (isJsonRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Operator OCC authentication required.",
          code: validation.error || "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Redirect browser requests to OCC login portal with preserved callback URL
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }

    // Delete stale or invalid cookie if present
    const response = NextResponse.redirect(loginUrl);
    if (cookieToken) {
      response.cookies.delete(OPERATOR_COOKIE_NAME);
    }
    return response;
  }

  // 5. Authorized: Forward request and enrich headers with operator identity
  const requestHeaders = new Headers(request.headers);
  if (validation.operatorId) {
    requestHeaders.set("x-operator-id", validation.operatorId);
  }
  if (validation.role) {
    requestHeaders.set("x-operator-role", validation.role);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/alerts"],
};
