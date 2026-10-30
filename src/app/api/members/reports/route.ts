/**
 * PlatformI - Member Report Standing API Route
 * GET /api/members/reports
 *
 * Member-only: the caller's own crowd reports with flag status, plus
 * derived counts. Removed reports are hard-deleted, so standing is
 * computed from live rows only — removal is final, stated in the UI.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/services/memberAuthService";
import { FLAG_THRESHOLD_COUNT } from "@/lib/services/memberTrust";

const REPORT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  try {
    const rows = await db.crowdsourceCheckIn.findMany({
      where: { memberId: identity.id },
      orderBy: { timestamp: "desc" },
      take: REPORT_LIMIT,
    });
    const reports = rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      crowdLevel: r.crowdLevel,
      timestamp: r.timestamp.toISOString(),
      flagCount: r.flagCount,
      flagged: r.flagCount >= FLAG_THRESHOLD_COUNT,
    }));
    return NextResponse.json({
      success: true,
      reports,
      submitted: reports.length,
      flagged: reports.filter((r) => r.flagged).length,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load reports" },
      { status: 500 }
    );
  }
}
