/**
 * PlatformI - Admin & OCC Operator Authentication API Route
 *
 * Implements:
 * - POST /api/admin/auth: Operator login credential verification & session cookie issuance
 * - POST /api/admin/auth (action: logout): Operator shift logout & session revocation
 * - GET /api/admin/auth: Active session introspection
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateOperator,
  verifyOperatorSessionToken,
  OPERATOR_COOKIE_NAME,
  SHIFT_DURATION_SECONDS,
  REGISTERED_OPERATORS,
} from "@/lib/services/adminAuthService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "login";

    // 1. Logout Handler
    if (action === "logout") {
      const response = NextResponse.json({
        success: true,
        message: "Operator shift terminated. Session closed.",
      });
      response.cookies.delete(OPERATOR_COOKIE_NAME);
      return response;
    }

    // 2. Login Handler
    const { operatorId, passkey } = body;

    if (!operatorId || !passkey) {
      return NextResponse.json(
        {
          success: false,
          error: "Operator ID and Security Passkey are required.",
        },
        { status: 400 }
      );
    }

    const authResult = authenticateOperator(operatorId, passkey);

    if (!authResult.success || !authResult.token || !authResult.profile) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Authentication failed. Invalid operator credentials.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      operator: authResult.profile,
      message: "OCC Dispatcher Authorization Granted",
    });

    // Set secure HTTP-only session cookie
    response.cookies.set({
      name: OPERATOR_COOKIE_NAME,
      value: authResult.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SHIFT_DURATION_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during operator authentication.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(OPERATOR_COOKIE_NAME)?.value;
  const validation = verifyOperatorSessionToken(token);

  if (!validation.isValid || !validation.operatorId) {
    return NextResponse.json({
      authenticated: false,
      error: validation.error || "No active operator session.",
    });
  }

  const registered = REGISTERED_OPERATORS[validation.operatorId];
  const profile = registered
    ? registered.profile
    : {
        id: validation.operatorId,
        name: "OCC Dispatcher",
        role: validation.role || "CHIEF_DISPATCHER",
        stationHub: "Dukuh Atas Integrated OCC Hub",
        badgeNumber: "OCC-AUTH-USER",
      };

  return NextResponse.json({
    authenticated: true,
    operator: profile,
  });
}
