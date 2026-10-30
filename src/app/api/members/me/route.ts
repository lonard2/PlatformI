/**
 * GET /api/members/me — current member profile from the session cookie.
 * PATCH /api/members/me — attach a phone number to the signed-in member.
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

export async function PATCH(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  try {
    const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (!phone) {
      return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    const updated = await db.member.update({
      where: { id: identity.id },
      data: { phone },
    });
    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        displayName: updated.displayName,
        phone: updated.phone,
        email: updated.email,
        role: updated.role,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ success: false, error: "ALREADY_REGISTERED" }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, error: (err as Error).message || "ATTACH_FAILED" },
      { status: 500 }
    );
  }
}
