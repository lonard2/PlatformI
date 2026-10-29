/**
 * POST /api/members/register/begin — start a member passkey registration.
 * No DB write: returns a provisional id the client sends back at finish.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { startMemberRegistration } from "@/lib/services/memberAuthService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      displayName?: unknown;
    } | null;
    const displayName =
      typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 60) : "";
    if (!displayName) {
      return NextResponse.json({ success: false, error: "DISPLAY_NAME_REQUIRED" }, { status: 400 });
    }
    const provisionalId = randomUUID();
    const rpID = new URL(request.url).hostname;
    const { options } = await startMemberRegistration(provisionalId, displayName, rpID);
    return NextResponse.json({ success: true, data: { provisionalId, options } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "REGISTRATION_START_FAILED" },
      { status: 400 }
    );
  }
}
