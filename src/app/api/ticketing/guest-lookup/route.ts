/**
 * PlatformI - Guest Reservation Lookup API Endpoint
 * GET /api/ticketing/guest-lookup?code=&phone=
 *
 * Implements:
 * - Logged-out buyer lookup by reservation code plus guest phone
 * - Guest-safe ticket projection with no payment data
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeGuestTicket } from "@/lib/ticketing/reservationContract";

export async function GET(request: NextRequest) {
  try {
    const code = (request.nextUrl.searchParams.get("code") ?? "").trim();
    const phone = (request.nextUrl.searchParams.get("phone") ?? "").trim();
    if (code === "" || phone === "") {
      return NextResponse.json(
        { error: "Missing required query parameters: code, phone" },
        { status: 400 }
      );
    }

    let record = null;
    try {
      record = await db.ticket.findUnique({ where: { reservationCode: code } });
    } catch {
      record = null;
    }
    if (!record || (record.guestPhone ?? "") !== phone) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: sanitizeGuestTicket(record) });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to look up reservation", details: (err as Error).message },
      { status: 500 }
    );
  }
}
