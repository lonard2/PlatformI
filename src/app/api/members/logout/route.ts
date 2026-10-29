/**
 * POST /api/members/logout — clear the member session cookie.
 */
import { NextResponse } from "next/server";
import { clearMemberSessionCookieHeader } from "@/lib/services/memberAuthService";

export async function POST() {
  const res = NextResponse.json({ success: true, data: null });
  res.headers.append("Set-Cookie", clearMemberSessionCookieHeader());
  return res;
}
