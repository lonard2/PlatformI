/**
 * GET /api/members/me — current member profile from the session cookie.
 * Never exposes credential material.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/services/memberAuthService";

export async function GET(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const member = await db.member.findUnique({ where: { id: identity.id } });
  if (!member) {
    return NextResponse.json({ success: false, error: "UNKNOWN_MEMBER" }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    data: {
      id: member.id,
      displayName: member.displayName,
      phone: member.phone,
      email: member.email,
      role: member.role,
      verifiedAt: member.verifiedAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
    },
  });
}
