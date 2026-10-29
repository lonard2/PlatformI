/**
 * POST /api/members/register/finish — verify the ceremony, create the
 * member (verified immediately: a passed ceremony proves the account),
 * and sign them in.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  finishMemberRegistration,
  mintMemberSession,
  memberSessionCookieHeader,
} from "@/lib/services/memberAuthService";

function asOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, 120) : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      provisionalId?: unknown;
      displayName?: unknown;
      phone?: unknown;
      email?: unknown;
      credential?: unknown;
    } | null;
    const provisionalId = typeof body?.provisionalId === "string" ? body.provisionalId : "";
    const displayName =
      typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 60) : "";
    if (!provisionalId || !displayName || !body?.credential) {
      return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    const url = new URL(request.url);
    const done = await finishMemberRegistration(
      provisionalId,
      body.credential,
      url.hostname,
      url.origin
    );
    const phone = asOptionalString(body?.phone);
    const email = asOptionalString(body?.email)?.toLowerCase();
    try {
      const member = await db.member.create({
        data: {
          displayName,
          phone,
          email,
          passkeyCredentialJson: JSON.stringify({
            credentialId: done.credentialId,
            publicKeyB64: done.credentialPublicKey,
          }),
          passkeyCounter: done.counter,
          role: "MEMBER",
          verifiedAt: new Date(),
        },
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
      if ((err as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { success: false, error: "ALREADY_REGISTERED" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    const message = (err as Error).message || "REGISTRATION_FAILED";
    const status = /challenge|verification/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
