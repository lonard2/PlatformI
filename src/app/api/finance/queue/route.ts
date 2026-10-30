/**
 * GET /api/finance/queue — OCC finance work queue.
 * Finance roles only. Returns reservations awaiting confirmation (UNPAID)
 * and paid reservations eligible for refund, oldest first.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFinanceRole } from "@/lib/services/adminAuthService";

const QUEUE_LIMIT = 50;

export async function GET(request: Request) {
  const gate = requireFinanceRole(request.headers.get("cookie"), "confirm");
  if (!gate.ok) {
    return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
  }
  const rows = await db.ticket.findMany({
    where: {
      OR: [
        { paymentStatus: "UNPAID", status: { in: ["WAITING", "ACTIVE", "FAILED"] } },
        { paymentStatus: "PAID", status: { in: ["WAITING", "ACTIVE"] } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: QUEUE_LIMIT,
  });
  return NextResponse.json({
    success: true,
    tickets: rows.map((t) => ({
      ticketNumber: t.ticketNumber,
      reservationCode: t.reservationCode,
      totalFareRp: t.totalFareRp,
      paymentStatus: t.paymentStatus,
      status: t.status,
      guestPhone: t.guestPhone,
      createdAt: t.createdAt.toISOString(),
      paymentRef: t.paymentRef,
      confirmedBy: t.confirmedBy,
      refundedBy: t.refundedBy,
    })),
  });
}
