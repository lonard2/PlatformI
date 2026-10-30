/**
 * PlatformI - Flag Review Queue API Route
 * GET /api/crowdsource/flags
 *
 * Operator-only OCC queue: reports carrying member flags, with reasons
 * and counts. Flagger identities are never exposed — the decision needs
 * the complaint, not the complainant.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOperator } from "@/lib/services/adminAuthService";

const QUEUE_LIMIT = 50;

export async function GET(request: NextRequest) {
  if (!requireOperator(request.headers.get("cookie"), request.headers)) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }
  try {
    const flagged = await db.crowdsourceCheckIn.findMany({
      where: { flagCount: { gt: 0 } },
      orderBy: [{ flagCount: "desc" }, { timestamp: "desc" }],
      take: QUEUE_LIMIT,
      include: { flags: { orderBy: { createdAt: "asc" }, select: { reason: true } } },
    });
    return NextResponse.json({
      success: true,
      reports: flagged.map((r) => ({
        checkInId: r.id,
        vehicleId: r.vehicleId,
        userId: r.userId,
        crowdLevel: r.crowdLevel,
        acComfort: r.acComfort,
        note: r.note,
        timestamp: r.timestamp.toISOString(),
        flagCount: r.flagCount,
        reasons: r.flags.map((f) => f.reason),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load flag queue" },
      { status: 500 }
    );
  }
}
