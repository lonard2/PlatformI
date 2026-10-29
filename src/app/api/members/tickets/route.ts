/**
 * GET /api/members/tickets — purchase history for the signed-in member:
 * tickets claimed into or bought under this account. Never another
 * member's tickets; guests see nothing here (guest lookup stays separate).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/services/memberAuthService";

export async function GET(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const tickets = await db.ticket.findMany({
    where: { claimedByUserId: identity.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: tickets });
}
