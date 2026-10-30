/**
 * POST /api/finance/refund — OCC finance refunds a paid reservation.
 * The amount always comes from the stored ticket (never the caller), and
 * refunds at or above the supervisor threshold require FINANCE_SUPERVISOR.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFinanceRole } from "@/lib/services/adminAuthService";
import { refundTicketPayment, FinanceError } from "@/lib/ticketing/financeActions";

export async function POST(request: NextRequest) {
  let body: { ticketNumber?: unknown; id?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_REQUEST" }, { status: 400 });
  }
  const ticketNumber = typeof body.ticketNumber === "string" ? body.ticketNumber.trim() : undefined;
  const id = typeof body.id === "string" ? body.id.trim() : undefined;
  if (!ticketNumber && !id) {
    return NextResponse.json({ success: false, error: "MISSING_TICKET_REF" }, { status: 400 });
  }
  const lookup = ticketNumber
    ? await db.ticket.findUnique({ where: { ticketNumber } })
    : await db.ticket.findUnique({ where: { id: id as string } });
  if (!lookup) {
    return NextResponse.json({ success: false, error: "TICKET_NOT_FOUND" }, { status: 404 });
  }
  const gate = requireFinanceRole(request.headers.get("cookie"), "refund", {
    amountRp: lookup.totalFareRp,
  }, request.headers);
  if (!gate.ok) {
    return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
  }
  try {
    const { ticket, idempotent } = await refundTicketPayment({
      id: lookup.id,
      reason: typeof body.reason === "string" ? body.reason : "",
      actorId: gate.id,
      actorRole: gate.role,
    });
    return NextResponse.json({
      success: true,
      idempotent,
      ticketNumber: ticket.ticketNumber,
      paymentStatus: ticket.paymentStatus,
    });
  } catch (err) {
    if (err instanceof FinanceError) {
      const status = err.code === "TICKET_NOT_FOUND" ? 404 : err.code === "GATE_CONSUMED" ? 409 : 400;
      return NextResponse.json({ success: false, error: err.code }, { status });
    }
    return NextResponse.json({ success: false, error: "REFUND_FAILED" }, { status: 500 });
  }
}
