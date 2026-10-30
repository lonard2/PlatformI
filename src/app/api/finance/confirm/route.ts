/**
 * POST /api/finance/confirm — OCC finance confirms an unpaid reservation.
 * Any finance role may confirm. Idempotent: already-PAID returns the
 * ticket unchanged. Writes confirmedBy as the audit trail.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceRole } from "@/lib/services/adminAuthService";
import { confirmTicketPayment, FinanceError } from "@/lib/ticketing/financeActions";

export async function POST(request: NextRequest) {
  let body: { ticketNumber?: unknown; id?: unknown; paymentRef?: unknown; proof?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
  }
  const gate = requireFinanceRole(request.headers.get("cookie"), "confirm");
  if (!gate.ok) {
    return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
  }
  try {
    const { ticket, idempotent } = await confirmTicketPayment({
      ticketNumber: typeof body.ticketNumber === "string" ? body.ticketNumber : undefined,
      id: typeof body.id === "string" ? body.id : undefined,
      paymentRef: typeof body.paymentRef === "string" ? body.paymentRef : undefined,
      proof: typeof body.proof === "string" ? body.proof : undefined,
      actorId: gate.id,
      actorRole: gate.role,
    });
    return NextResponse.json({
      success: true,
      idempotent,
      ticketNumber: ticket.ticketNumber,
      paymentStatus: ticket.paymentStatus,
      paidAt: ticket.paidAt?.toISOString() ?? null,
    });
  } catch (err) {
    if (err instanceof FinanceError) {
      const status = err.code === "TICKET_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ success: false, error: err.code }, { status });
    }
    return NextResponse.json({ success: false, error: "CONFIRM_FAILED" }, { status: 500 });
  }
}
