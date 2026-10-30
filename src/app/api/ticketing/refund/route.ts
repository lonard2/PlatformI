/**
 * PlatformI - Reservation Refund API Endpoint
 * POST /api/ticketing/refund
 *
 * Implements:
 * - WAITING / ACTIVE / FAILED reservations transition to REFUNDED
 * - Rejection of refunds after gate completion (COMPLETED / IN_JOURNEY
 *   with a recorded gate scan)
 * - Authenticated finance gate: anonymous and non-finance callers are
 *   rejected. Refunds at or above Rp500.000 require FINANCE_SUPERVISOR
 *   (same rule as /api/finance).
 * - Every refund records the acting operator (refundedBy).
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFinanceRole } from "@/lib/services/adminAuthService";
import { refundTicketPayment, FinanceError } from "@/lib/ticketing/financeActions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticketNumber = (body.ticketNumber ?? "").trim();
    if (ticketNumber === "") {
      return NextResponse.json({ error: "Missing required field: ticketNumber" }, { status: 400 });
    }

    let record = null;
    try {
      record = await db.ticket.findUnique({ where: { ticketNumber } });
    } catch {
      record = null;
    }
    if (!record) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const gate = requireFinanceRole(request.headers.get("cookie"), "refund", {
      amountRp: record.totalFareRp,
    });
    if (!gate.ok) {
      const error = gate.status === 401 ? "Authentication required" : gate.error;
      return NextResponse.json({ error, reason: gate.error, ticketNumber }, { status: gate.status });
    }
    const operator = { id: gate.id, role: gate.role };

    if (record.status === "REFUNDED") {
      return NextResponse.json({
        success: true,
        ticketNumber: record.ticketNumber,
        reservationCode: record.reservationCode,
        status: "REFUNDED",
      });
    }

    if (record.status === "COMPLETED" || record.gateScannedAt !== null) {
      return NextResponse.json(
        {
          error: "Ticket already used at the gate and cannot be refunded",
          reason: "GATE_SCAN_COMPLETED",
          ticketNumber: record.ticketNumber,
          status: record.status,
        },
        { status: 409 }
      );
    }

    let updated;
    try {
      const rawReason = typeof body.reason === "string" ? body.reason.trim() : "";
      const result = await refundTicketPayment({
        ticketNumber,
        // The scanner flow collects no reason; record the channel explicitly
        // rather than inventing one.
        reason: rawReason === "" ? "OCC counter refund" : rawReason,
        actorId: operator.id,
        actorRole: operator.role,
      });
      void result;
      const reread = await db.ticket.findUnique({ where: { ticketNumber } });
      if (!reread) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      updated = reread;
    } catch (err) {
      if (err instanceof FinanceError) {
        if (err.code === "REQUIRES_SUPERVISOR") {
          return NextResponse.json({ error: err.code, reason: err.code, ticketNumber }, { status: 403 });
        }
        if (err.code === "GATE_CONSUMED") {
          return NextResponse.json(
            {
              error: "Ticket already used at the gate and cannot be refunded",
              reason: "GATE_SCAN_COMPLETED",
              ticketNumber,
            },
            { status: 409 }
          );
        }
        if (err.code === "MISSING_REFUND_REASON") {
          return NextResponse.json({ error: err.code, ticketNumber }, { status: 400 });
        }
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      ticketNumber: updated.ticketNumber,
      reservationCode: updated.reservationCode,
      status: "REFUNDED",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to refund ticket", details: (err as Error).message },
      { status: 500 }
    );
  }
}
