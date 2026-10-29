/**
 * POST /api/members/login/begin — start a member passkey login.
 * Accepts memberId or phone; the member must already hold a credential.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startMemberLogin } from "@/lib/services/memberAuthService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      memberId?: unknown;
      phone?: unknown;
    } | null;
    const memberId = typeof body?.memberId === "string" ? body.memberId : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const member = memberId
      ? await db.member.findUnique({ where: { id: memberId } })
      : phone
        ? await db.member.findUnique({ where: { phone } })
        : null;
    if (!member?.passkeyCredentialJson) {
      return NextResponse.json({ success: false, error: "UNKNOWN_MEMBER" }, { status: 404 });
    }
    const stored = JSON.parse(member.passkeyCredentialJson) as { credentialId?: string };
    if (!stored.credentialId) {
      return NextResponse.json({ success: false, error: "UNKNOWN_MEMBER" }, { status: 404 });
    }
    const { options } = await startMemberLogin(
      member.id,
      stored.credentialId,
      new URL(request.url).hostname
    );
    return NextResponse.json({
      success: true,
      data: { memberId: member.id, options },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "LOGIN_START_FAILED" },
      { status: 400 }
    );
  }
}
