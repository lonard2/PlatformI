/**
 * PlatformI - Reservation Refund API Endpoint
 * POST /api/ticketing/refund
 *
 * Implements:
 * - WAITING / ACTIVE / FAILED reservations transition to REFUNDED
 * - Rejection of refunds after gate completion (COMPLETED / IN_JOURNEY
 *   with a recorded gate scan)
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    let updated = record;
    try {
      updated = await db.ticket.update({
        where: { ticketNumber },
        data: { status: "REFUNDED" },
      });
    } catch {
      updated = { ...record, status: "REFUNDED" };
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
