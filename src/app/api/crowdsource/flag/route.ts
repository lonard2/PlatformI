/**
 * PlatformI - Crowdsource Flag API Route
 * POST /api/crowdsource/flag
 *
 * Member-only flagging for bad crowd reports (wrong vehicle, staged photo,
 * spam). One flag per member per report; duplicates are idempotent.
 * Flag counts are public-signal-free: the feed only exposes a boolean.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/services/memberAuthService";
import { requireOperator } from "@/lib/services/adminAuthService";
import {
  FLAG_RATE_LIMIT_COUNT,
  FLAG_RATE_LIMIT_WINDOW_SECONDS,
} from "@/lib/services/memberTrust";

export async function POST(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  let body: { checkInId?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
  }
  const checkInId = typeof body.checkInId === "string" ? body.checkInId.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";
  if (checkInId === "" || reason === "") {
    return NextResponse.json({ success: false, error: "MISSING_CHECKIN_OR_REASON" }, { status: 400 });
  }

  try {
    const report = await db.crowdsourceCheckIn.findUnique({ where: { id: checkInId } });
    if (!report) {
      return NextResponse.json({ success: false, error: "REPORT_NOT_FOUND" }, { status: 404 });
    }

    const existing = await db.crowdsourceFlag.findUnique({
      where: { checkInId_memberId: { checkInId, memberId: identity.id } },
    });
    if (existing) {
      return NextResponse.json({ success: true, idempotent: true, flagCount: report.flagCount });
    }

    const windowStart = new Date(Date.now() - FLAG_RATE_LIMIT_WINDOW_SECONDS * 1000);
    const recent = await db.crowdsourceFlag.count({
      where: { memberId: identity.id, createdAt: { gte: windowStart } },
    });
    if (recent >= FLAG_RATE_LIMIT_COUNT) {
      return NextResponse.json({ success: false, error: "RATE_LIMITED" }, { status: 429 });
    }

    await db.crowdsourceFlag.create({ data: { checkInId, memberId: identity.id, reason } });
    const updated = await db.crowdsourceCheckIn.update({
      where: { id: checkInId },
      data: { flagCount: { increment: 1 } },
    });
    return NextResponse.json({ success: true, idempotent: false, flagCount: updated.flagCount }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to flag report" },
      { status: 500 }
    );
  }
}

/**
 * Dismiss OCC review: clears every flag on the report and restores its
 * aggregation weight. Operator-only; the report itself stays.
 */
export async function DELETE(request: NextRequest) {
  if (!requireOperator(request.headers.get("cookie"), request.headers)) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }
  const checkInId = new URL(request.url).searchParams.get("id")
    ?? new URL(request.url).searchParams.get("checkInId")
    ?? "";
  if (checkInId === "") {
    return NextResponse.json({ success: false, error: "MISSING_CHECKIN_ID" }, { status: 400 });
  }
  try {
    const report = await db.crowdsourceCheckIn.findUnique({ where: { id: checkInId } });
    if (!report) {
      return NextResponse.json({ success: false, error: "REPORT_NOT_FOUND" }, { status: 404 });
    }
    await db.crowdsourceFlag.deleteMany({ where: { checkInId } });
    await db.crowdsourceCheckIn.update({ where: { id: checkInId }, data: { flagCount: 0 } });
    return NextResponse.json({ success: true, checkInId });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to dismiss flags" },
      { status: 500 }
    );
  }
}
