/**
 * DELETE /api/members/trips/[id] — remove own saved trip only.
 * A member can never delete another member's trip (404 either way).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/services/memberAuthService";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id } = await params;
  const trip = await db.savedTrip.findUnique({ where: { id } });
  if (!trip || trip.memberId !== identity.id) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }
  await db.savedTrip.delete({ where: { id } });
  return NextResponse.json({ success: true, data: null });
}
