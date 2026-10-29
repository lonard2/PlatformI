/**
 * POST /api/members/claim — transfer a guest ticket to the signed-in
 * member. Requires BOTH the reservation code and the guest phone from the
 * original purchase (code alone is not enough; phone alone never suffices).
 * Already-claimed-by-you is idempotent; claimed-by-another is rejected.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/services/memberAuthService";

export async function POST(request: NextRequest) {
  const identity = requireMember(request.headers.get("cookie"));
  if (!identity) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  try {
    const body = (await request.json().catch(() => null)) as {
      reservationCode?: unknown;
      phone?: unknown;
    } | null;
    const reservationCode =
      typeof body?.reservationCode === "string" ? body.reservationCode.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (!reservationCode || !phone) {
      return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    const ticket = await db.ticket.findUnique({ where: { reservationCode } });
    if (!ticket || (ticket.guestPhone ?? "") !== phone) {
      return NextResponse.json({ success: false, error: "TICKET_NOT_FOUND" }, { status: 404 });
    }
    if (ticket.claimedByUserId && ticket.claimedByUserId !== identity.id) {
      return NextResponse.json({ success: false, error: "ALREADY_CLAIMED" }, { status: 409 });
    }
    const claimed = await db.ticket.update({
      where: { id: ticket.id },
      data: { claimedByUserId: identity.id },
    });
    return NextResponse.json({
      success: true,
      data: {
        id: claimed.id,
        ticketNumber: claimed.ticketNumber,
        reservationCode: claimed.reservationCode,
        status: claimed.status,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "CLAIM_FAILED" },
      { status: 500 }
    );
  }
}
