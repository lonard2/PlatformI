/**
 * RED: urban is quote-only — urban purchases create WAITING reservations
 * (never ACTIVE, never paid), the wallet shows the quote state, and the
 * modal offers a reserve/quote action instead of instant payment.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";
import { POST as purchasePost } from "@/app/api/ticketing/purchase/route";
import { TicketPurchaseModal } from "@/components/ticketing/TicketPurchaseModal";
import { DigitalPassWallet } from "@/components/ticketing/DigitalPassWallet";
import { useLanguageStore } from "@/lib/i18n";
import type { Ticket } from "@/types/transit";
import { db } from "@/lib/db";

function urbanPurchaseBody() {
  return {
    userId: "USR-COMMUTER-JAKARTA",
    originStopId: "STOP-LEBAK-BULUS",
    destinationStopId: "STOP-BLOK-M",
    legs: [
      {
        legIndex: 0,
        lineId: "line-001",
        originStopId: "STOP-LEBAK-BULUS",
        destinationStopId: "STOP-BLOK-M",
        mode: "TRANSJAKARTA_BRT",
        fareRp: 3500,
        distanceKm: 4.1,
      },
    ],
    totalFareRp: 3500,
    isJakLingkoCapped: false,
  };
}

const waitingQuoteTicket: Ticket = {
  id: "hub-TKT-QUOTE-01",
  ticketNumber: "TKT-QUOTE-01",
  userId: "USR-COMMUTER-JAKARTA",
  originStopId: "STOP-LEBAK-BULUS",
  destinationStopId: "STOP-BLOK-M",
  legs: [
    {
      legIndex: 0,
      lineId: "line-001",
      originStopId: "STOP-LEBAK-BULUS",
      destinationStopId: "STOP-BLOK-M",
      mode: "TRANSJAKARTA_BRT",
      fareRp: 3500,
      distanceKm: 4.1,
    },
  ],
  totalFareRp: 3500,
  isJakLingkoCapped: false,
  status: "WAITING",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  rollingToken: "PLATFORMI:TKT-QUOTE-01:guest:0:hub",
  reservationCode: "RSV-QUOTE-01",
  claimedByUserId: null,
};

describe("urban quote-only", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (createdIds.length > 0) {
      await db.ticket.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
      createdIds.length = 0;
    }
  });

  it("creates a WAITING quote with no payment, never an ACTIVE ticket", async () => {
    const res = await purchasePost(
      new NextRequest("http://localhost:3000/api/ticketing/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(urbanPurchaseBody()),
      })
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { status: string; ticketNumber: string };
    expect(json.status).toBe("WAITING");
    const row = await db.ticket.findUnique({ where: { ticketNumber: json.ticketNumber } });
    expect(row).not.toBeNull();
    if (row) createdIds.push(row.id);
    expect(row?.paymentStatus).toBe("UNPAID");
    expect(row?.paidAt).toBeNull();
  });

  it("shows the quote state in the wallet instead of an active pass", () => {
    useLanguageStore.getState().setLanguage("en");
    render(<DigitalPassWallet injectedTicket={waitingQuoteTicket} />);
    expect(
      screen.getAllByText(/this reservation is waiting for payment/i).length
    ).toBeGreaterThan(0);
  });

  it("offers a reserve-quote action, not instant payment methods", async () => {
    useLanguageStore.getState().setLanguage("en");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        String(url).includes("/api/ticketing/purchase")
          ? Promise.resolve({
              ok: true,
              json: async () => ({
                success: true,
                ticketNumber: "TKT-QUOTE-01",
                reservationCode: "RSV-QUOTE-01",
                status: "WAITING",
                ticket: {
                  ticketNumber: "TKT-QUOTE-01",
                  userId: "USR-COMMUTER-JAKARTA",
                  originStopId: "STOP-LEBAK-BULUS",
                  destinationStopId: "STOP-BLOK-M",
                  totalFareRp: 3500,
                  isJakLingkoCapped: false,
                  status: "WAITING",
                  createdAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 86400000).toISOString(),
                  rollingToken: "tok-quote-01",
                  reservationCode: "RSV-QUOTE-01",
                },
              }),
            })
          : Promise.resolve({ ok: true, json: async () => ({}) })
      )
    );
    render(<TicketPurchaseModal isOpen={true} onClose={() => {}} />);
    expect(screen.queryByText(/select payment method/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reserve quote/i }));
    await waitFor(() => {
      expect(screen.getByText(/quote reserved/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/active ready for tap/i)).not.toBeInTheDocument();
  });
});
