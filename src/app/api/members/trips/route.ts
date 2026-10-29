/**
 * /api/members/trips — saved trips for the signed-in member.
 * GET lists own trips; POST creates one (ownership is implicit: memberId
 * always comes from the session, never the request body).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/services/memberAuthService";

export async function GET(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const trips = await db.savedTrip.findMany({
    where: { memberId: identity.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: trips });
}

export async function POST(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  try {
    const body = (await request.json().catch(() => null)) as {
      origin?: unknown;
      destination?: unknown;
      label?: unknown;
    } | null;
    const origin = typeof body?.origin === "string" ? body.origin.trim().slice(0, 120) : "";
    const destination = typeof body?.destination === "string" ? body.destination.trim().slice(0, 120) : "";
    const label = typeof body?.label === "string" && body.label.trim() !== ""
      ? body.label.trim().slice(0, 60)
      : `${origin} → ${destination}`;
    if (!origin || !destination) {
      return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    const trip = await db.savedTrip.create({
      data: { memberId: identity.id, origin, destination, label },
    });
    return NextResponse.json({ success: true, data: trip }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "SAVE_FAILED" },
      { status: 500 }
    );
  }
}
