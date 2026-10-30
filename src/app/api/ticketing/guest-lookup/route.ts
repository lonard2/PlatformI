/**
 * PlatformI - Guest Reservation Lookup API Endpoint
 * GET /api/ticketing/guest-lookup?code=&phone=[&tripDate=&idNumber=&operator=&journey=&routeName=]
 *
 * Implements:
 * - Logged-out buyer lookup by reservation code plus guest phone
 * - Support fallback search by phone plus trip date, ID number,
 *   operator, journey, or route name when the code is unreadable
 * - Guest-safe ticket projection with no payment data
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prodDetails } from "@/lib/api/serverError";
import {
  hasGuestLookupFallback,
  matchesGuestLookupFallback,
  sanitizeGuestTicket,
  type GuestLookupFallback,
} from "@/lib/ticketing/reservationContract";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const code = (params.get("code") ?? "").trim();
    const phone = (params.get("phone") ?? "").trim();
    const fallback: GuestLookupFallback = {
      tripDate: (params.get("tripDate") ?? "").trim() || undefined,
      idNumber: (params.get("idNumber") ?? "").trim() || undefined,
      operator: (params.get("operator") ?? "").trim() || undefined,
      journey: (params.get("journey") ?? "").trim() || undefined,
      routeName: (params.get("routeName") ?? "").trim() || undefined,
    };
    const hasFallback = hasGuestLookupFallback(fallback);
    if (phone === "" || (code === "" && !hasFallback)) {
      return NextResponse.json(
        { error: "Missing required query parameters: phone and (code or support details)" },
        { status: 400 }
      );
    }

    // Primary path: reservation code plus guest phone.
    if (code !== "") {
      let record = null;
      try {
        record = await db.ticket.findUnique({ where: { reservationCode: code } });
      } catch (err) {
        return NextResponse.json(
          { error: "Failed to look up reservation", ...prodDetails(err) },
          { status: 500 }
        );
      }
      if (record && (record.guestPhone ?? "") === phone) {
        return NextResponse.json({ success: true, ticket: sanitizeGuestTicket(record) });
      }
      if (!hasFallback) {
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      }
      // Code lookup failed: fall through to the support fallback search.
    }

    // Alternate support search: phone-anchored candidates narrowed by every
    // supplied fallback field. Ambiguous or empty sets stay 404 so assisted
    // lookup can never leak a stranger's reservation.
    let candidates;
    try {
      candidates = await db.ticket.findMany({
        where: { guestPhone: phone },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to look up reservation", ...prodDetails(err) },
        { status: 500 }
      );
    }
    const matches = candidates.filter((candidate) =>
      matchesGuestLookupFallback(candidate, fallback)
    );
    if (matches.length !== 1) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: sanitizeGuestTicket(matches[0]) });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to look up reservation", ...prodDetails(err) },
      { status: 500 }
    );
  }
}
