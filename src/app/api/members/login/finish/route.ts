/**
 * POST /api/members/login/finish — verify the ceremony, check the
 * signature counter (rollback rejected), rotate the session, persist
 * the new counter.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  finishMemberLogin,
  mintMemberSession,
  memberSessionCookieHeader,
} from "@/lib/services/memberAuthService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      memberId?: unknown;
      credential?: unknown;
    } | null;
    const memberId = typeof body?.memberId === "string" ? body.memberId : "";
    if (!memberId || !body?.credential) {
      return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member?.passkeyCredentialJson) {
      return NextResponse.json({ success: false, error: "UNKNOWN_MEMBER" }, { status: 404 });
    }
    const stored = JSON.parse(member.passkeyCredentialJson) as {
      credentialId?: string;
    };
    if (!stored.credentialId) {
      return NextResponse.json({ success: false, error: "UNKNOWN_MEMBER" }, { status: 404 });
    }
    const url = new URL(request.url);
    const done = await finishMemberLogin(
      member.id,
      body.credential,
      stored.credentialId,
      member.passkeyCounter,
      url.hostname,
      url.origin
    );
    await db.member.update({
      where: { id: member.id },
      data: { passkeyCounter: done.newCounter },
    });
    const token = mintMemberSession(member.id, member.role);
    const res = NextResponse.json({
      success: true,
      data: {
        id: member.id,
        displayName: member.displayName,
        role: member.role,
        verifiedAt: member.verifiedAt?.toISOString() ?? null,
      },
    });
    res.headers.append("Set-Cookie", memberSessionCookieHeader(token));
    return res;
  } catch (err) {
    const message = (err as Error).message || "LOGIN_FAILED";
    const status = /challenge|counter|credential|verification|UNKNOWN/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
